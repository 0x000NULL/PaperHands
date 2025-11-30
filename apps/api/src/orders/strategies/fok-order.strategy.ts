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
import { TaxLotService } from '../../portfolio/services/tax-lot.service';
import { LiquiditySimulator } from '../domain/liquidity-simulation';

/**
 * FOK (Fill-Or-Kill) order execution strategy.
 *
 * FOK orders must be filled completely or not at all:
 * - Either fill 100% of the order immediately
 * - Or reject the entire order
 * - No partial fills allowed
 *
 * More restrictive than IOC orders.
 */
@Injectable()
export class FOKOrderStrategy implements IOrderExecutionStrategy {
  readonly orderType = OrderType.MARKET; // Can work with MARKET or LIMIT
  readonly supportedTimeInForce = [TimeInForce.FOK];

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    private readonly dataSource: DataSource,
    private readonly orderAuditService: OrderAuditService,
    private readonly taxLotService: TaxLotService,
  ) {}

  canExecuteImmediately(context: ExecutionContext): boolean {
    // FOK requires market to be open
    return (
      context.session === 'regular' ||
      (context.extendedHours &&
        (context.session === 'pre_market' || context.session === 'after_hours'))
    );
  }

  validate(context: ExecutionContext): ValidationResult {
    const errors: string[] = [];

    // Validate price data
    if (!context.quote.last || context.quote.last <= 0) {
      errors.push(`Invalid price for ${context.symbol}. Market may be closed.`);
    }

    // For limit FOK, limit price is required
    if (context.orderType === OrderType.LIMIT && !context.limitPrice) {
      errors.push('Limit price is required for limit FOK orders');
    }

    // Market must be open
    if (!this.canExecuteImmediately(context)) {
      errors.push(
        'FOK orders require an open trading session. Enable extended hours trading or wait for market open.',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    let executionPrice =
      context.side === OrderSide.BUY ? context.quote.ask : context.quote.bid;

    // Apply extended hours spread adjustment
    if (context.extendedHours && context.session !== 'regular') {
      executionPrice = LiquiditySimulator.getExtendedHoursAdjustedPrice(
        executionPrice,
        context.side,
      );
    }

    // For limit FOK, check if price conditions are met
    if (context.orderType === OrderType.LIMIT && context.limitPrice) {
      const canFill =
        context.side === OrderSide.BUY
          ? executionPrice <= context.limitPrice
          : executionPrice >= context.limitPrice;

      if (!canFill) {
        return this.createRejectedOrder(
          context,
          `FOK rejected: Cannot fill at limit price $${context.limitPrice.toFixed(2)}. Current ${context.side === OrderSide.BUY ? 'ask' : 'bid'}: $${executionPrice.toFixed(2)}`,
        );
      }

      // Use limit price if it's more favorable
      executionPrice =
        context.side === OrderSide.BUY
          ? Math.min(executionPrice, context.limitPrice)
          : Math.max(executionPrice, context.limitPrice);
    }

    // Check if full quantity can be filled (liquidity simulation)
    const canFillFully = LiquiditySimulator.canFillFullQuantity(
      context.quantity,
      context.quote.volume || 0,
    );

    if (!canFillFully) {
      return this.createRejectedOrder(
        context,
        `FOK rejected: Cannot fill ${context.quantity} shares immediately. Consider using IOC for partial fills or reducing order size.`,
      );
    }

    // Execute full order
    return this.executeFullFill(context, executionPrice);
  }

  private async executeFullFill(
    context: ExecutionContext,
    executionPrice: number,
  ): Promise<ExecutionResult> {
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

      // Validate and update funds/shares
      if (context.side === OrderSide.BUY) {
        if (Number(user.cashBalance) < totalCost) {
          await queryRunner.rollbackTransaction();
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
          await queryRunner.rollbackTransaction();
          const availableQty = position ? Number(position.quantity) : 0;
          throw new BadRequestException(
            `Insufficient shares. Required: ${context.quantity}, Available: ${availableQty}`,
          );
        }
        await queryRunner.manager.update(User, context.userId, {
          cashBalance: Number(user.cashBalance) + totalCost,
        });
      }

      const order = queryRunner.manager.create(Order, {
        userId: context.userId,
        symbol: context.symbol,
        side: context.side,
        orderType: context.orderType,
        timeInForce: TimeInForce.FOK,
        extendedHours: context.extendedHours,
        quantity: context.quantity,
        filledQuantity: context.quantity,
        filledPrice: executionPrice,
        avgFillPrice: executionPrice,
        limitPrice: context.limitPrice || null,
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

      await this.orderAuditService.createAuditRecord(
        order,
        AuditAction.FILLED,
        'FOK: Fully filled',
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

  private async createRejectedOrder(
    context: ExecutionContext,
    reason: string,
  ): Promise<ExecutionResult> {
    const order = this.orderRepository.create({
      userId: context.userId,
      symbol: context.symbol,
      side: context.side,
      orderType: context.orderType,
      timeInForce: TimeInForce.FOK,
      extendedHours: context.extendedHours,
      quantity: context.quantity,
      filledQuantity: 0,
      limitPrice: context.limitPrice || null,
      status: OrderStatus.REJECTED,
      rejectionReason: reason,
      idempotencyKey: context.idempotencyKey || null,
    });

    await this.orderRepository.save(order);

    await this.orderAuditService.createAuditRecord(
      order,
      AuditAction.CANCELLED,
      reason,
      context.quote.last,
    );

    return {
      success: false,
      order,
      isPending: false,
      errorMessage: reason,
    };
  }

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
