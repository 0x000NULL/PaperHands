import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { Position } from '../../portfolio/entities/position.entity';
import {
  OrderType,
  TimeInForce,
  OrderSide,
  OrderStatus,
  AuditAction,
} from '../enums/order.enums';
import {
  IOrderExecutionStrategy,
  ExecutionContext,
  ValidationResult,
  ExecutionResult,
} from '../interfaces/order-execution-strategy.interface';
import { OrderAuditService } from '../services/order-audit.service';
import { OrderValidationService } from '../services/order-validation.service';
import { TaxLotService } from '../../portfolio/services/tax-lot.service';
import { MarketHoursService } from '../../common/services/market-hours.service';

/**
 * Market order execution strategy.
 *
 * Market orders execute immediately at the current bid/ask price:
 * - Buy orders execute at the ask price
 * - Sell orders execute at the bid price
 *
 * If the market is closed, orders are queued until market opens.
 */
@Injectable()
export class MarketOrderStrategy implements IOrderExecutionStrategy {
  readonly orderType = OrderType.MARKET;
  readonly supportedTimeInForce = [TimeInForce.DAY, TimeInForce.GTC];

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    private readonly dataSource: DataSource,
    private readonly orderAuditService: OrderAuditService,
    private readonly orderValidationService: OrderValidationService,
    private readonly taxLotService: TaxLotService,
    private readonly marketHoursService: MarketHoursService,
  ) {}

  canExecuteImmediately(context: ExecutionContext): boolean {
    return context.session === 'regular';
  }

  validate(context: ExecutionContext): ValidationResult {
    const errors: string[] = [];

    // Validate price data
    if (!context.quote.last || context.quote.last <= 0) {
      errors.push(`Invalid price for ${context.symbol}. Market may be closed.`);
    }

    const executionPrice =
      context.side === OrderSide.BUY ? context.quote.ask : context.quote.bid;
    if (!executionPrice || executionPrice <= 0) {
      errors.push(
        `Invalid ${context.side === OrderSide.BUY ? 'ask' : 'bid'} price for ${context.symbol}.`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    if (this.canExecuteImmediately(context)) {
      return this.executeImmediately(context);
    }
    return this.queueForMarketOpen(context);
  }

  /**
   * Execute market order immediately during regular trading hours.
   */
  private async executeImmediately(
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    const executionPrice =
      context.side === OrderSide.BUY ? context.quote.ask : context.quote.bid;

    if (!executionPrice || executionPrice <= 0) {
      const order = await this.createRejectedOrder(
        context,
        `Invalid price for ${context.symbol}. Market may be closed.`,
      );
      return {
        success: false,
        order,
        isPending: false,
        errorMessage: `Invalid price for ${context.symbol}`,
      };
    }

    const totalCost = executionPrice * context.quantity;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: context.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Validate funds/shares
      if (context.side === OrderSide.BUY) {
        if (Number(user.cashBalance) < totalCost) {
          throw new BadRequestException(
            `Insufficient funds. Required: $${totalCost.toFixed(2)}, Available: $${Number(user.cashBalance).toFixed(2)}`,
          );
        }
        await queryRunner.manager.update(User, context.userId, {
          cashBalance: Number(user.cashBalance) - totalCost,
        });
      } else {
        const position = await queryRunner.manager.findOne(Position, {
          where: { userId: context.userId, symbol: context.symbol },
          lock: { mode: 'pessimistic_write' },
        });

        if (!position || Number(position.quantity) < context.quantity) {
          const availableQty = position ? Number(position.quantity) : 0;
          throw new BadRequestException(
            `Insufficient shares. Required: ${context.quantity}, Available: ${availableQty}`,
          );
        }
        await queryRunner.manager.update(User, context.userId, {
          cashBalance: Number(user.cashBalance) + totalCost,
        });
      }

      // Create filled order
      const order = queryRunner.manager.create(Order, {
        userId: context.userId,
        symbol: context.symbol,
        side: context.side,
        orderType: OrderType.MARKET,
        timeInForce: context.timeInForce,
        quantity: context.quantity,
        filledQuantity: context.quantity,
        filledPrice: executionPrice,
        avgFillPrice: executionPrice,
        status: OrderStatus.FILLED,
        idempotencyKey: context.idempotencyKey || null,
        filledAt: new Date(),
      });

      await queryRunner.manager.save(order);

      // Update position
      await this.updatePositionInTransaction(
        queryRunner.manager,
        context.userId,
        context.symbol,
        context.quantity,
        executionPrice,
        context.side === OrderSide.BUY,
        order.id,
      );

      await queryRunner.commitTransaction();

      // Create audit record
      await this.orderAuditService.createAuditRecord(
        order,
        AuditAction.FILLED,
        null,
        executionPrice,
      );

      return {
        success: true,
        order,
        executionPrice,
        filledQuantity: context.quantity,
        isPending: false,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Queue market order when market is closed.
   */
  private async queueForMarketOpen(
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    const estimatedPrice =
      context.side === OrderSide.BUY ? context.quote.ask : context.quote.bid;
    const estimatedCost = estimatedPrice * context.quantity;

    // Validate funds/shares before queuing
    if (context.side === OrderSide.BUY) {
      const availableCash = await this.orderValidationService.getAvailableCash(
        context.userId,
      );
      if (availableCash < estimatedCost) {
        throw new BadRequestException(
          `Insufficient funds. Required: $${estimatedCost.toFixed(2)}, Available: $${availableCash.toFixed(2)}`,
        );
      }
    } else {
      const availableShares =
        await this.orderValidationService.getAvailableShares(
          context.userId,
          context.symbol,
        );
      if (availableShares < context.quantity) {
        throw new BadRequestException(
          `Insufficient shares. Required: ${context.quantity}, Available: ${availableShares}`,
        );
      }
    }

    const marketInfo = this.marketHoursService.getMarketHoursInfo();

    const order = this.orderRepository.create({
      userId: context.userId,
      symbol: context.symbol,
      side: context.side,
      orderType: OrderType.MARKET,
      timeInForce: context.timeInForce,
      quantity: context.quantity,
      filledQuantity: 0,
      status: OrderStatus.QUEUED,
      idempotencyKey: context.idempotencyKey || null,
      limitPrice: estimatedPrice, // Store estimated price for reference
    });

    await this.orderRepository.save(order);

    await this.orderAuditService.createAuditRecord(
      order,
      AuditAction.CREATED,
      `Queued until market opens${marketInfo.nextOpen ? ` at ${marketInfo.nextOpen.toISOString()}` : ''}`,
      context.quote.last,
    );

    return {
      success: true,
      order,
      isPending: true,
    };
  }

  /**
   * Create a rejected order record.
   */
  private async createRejectedOrder(
    context: ExecutionContext,
    reason: string,
  ): Promise<Order> {
    const order = this.orderRepository.create({
      userId: context.userId,
      symbol: context.symbol,
      side: context.side,
      orderType: OrderType.MARKET,
      timeInForce: context.timeInForce,
      quantity: context.quantity,
      filledQuantity: 0,
      status: OrderStatus.REJECTED,
      rejectionReason: reason,
      idempotencyKey: context.idempotencyKey || null,
    });

    await this.orderRepository.save(order);

    await this.orderAuditService.createAuditRecord(
      order,
      AuditAction.CANCELLED,
      reason,
      null,
    );

    return order;
  }

  /**
   * Update position after a fill within a transaction.
   */
  private async updatePositionInTransaction(
    manager: import('typeorm').EntityManager,
    userId: string,
    symbol: string,
    quantity: number,
    price: number,
    isBuy: boolean,
    orderId: string,
  ): Promise<void> {
    const existingPosition = await manager.findOne(Position, {
      where: { userId, symbol },
      lock: { mode: 'pessimistic_write' },
    });

    if (isBuy) {
      // Create tax lot for the purchase
      await this.taxLotService.createTaxLot(
        manager,
        userId,
        symbol,
        quantity,
        price,
        orderId,
        new Date(),
      );

      if (existingPosition) {
        const existingQty = Number(existingPosition.quantity);
        const existingCost = Number(existingPosition.avgCostBasis);
        const newTotalQty = existingQty + quantity;
        const newAvgCost =
          (existingQty * existingCost + quantity * price) / newTotalQty;
        await manager.update(Position, existingPosition.id, {
          quantity: newTotalQty,
          avgCostBasis: newAvgCost,
        });
      } else {
        const position = manager.create(Position, {
          userId,
          symbol,
          quantity,
          avgCostBasis: price,
        });
        await manager.save(position);
      }
    } else {
      // Handle sell
      if (existingPosition) {
        const existingQty = Number(existingPosition.quantity);
        const newQty = existingQty - quantity;
        if (newQty <= 0) {
          await manager.remove(existingPosition);
        } else {
          await manager.update(Position, existingPosition.id, {
            quantity: newQty,
          });
        }
      }
    }
  }
}
