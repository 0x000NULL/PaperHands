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
 * IOC (Immediate-Or-Cancel) order execution strategy.
 *
 * IOC orders must execute immediately:
 * - Fill whatever quantity is available immediately
 * - Cancel any unfilled portion
 * - Never becomes a pending order
 *
 * Commonly used with both market and limit orders.
 */
@Injectable()
export class IOCOrderStrategy implements IOrderExecutionStrategy {
  readonly orderType = OrderType.MARKET; // Can work with MARKET or LIMIT
  readonly supportedTimeInForce = [TimeInForce.IOC];

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
    // IOC requires market to be open (regular or extended if enabled)
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

    // For limit IOC, limit price is required
    if (context.orderType === OrderType.LIMIT && !context.limitPrice) {
      errors.push('Limit price is required for limit IOC orders');
    }

    // Market must be open
    if (!this.canExecuteImmediately(context)) {
      errors.push(
        'IOC orders require an open trading session. Enable extended hours trading or wait for market open.',
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

    // For limit IOC, check if price conditions are met
    if (context.orderType === OrderType.LIMIT && context.limitPrice) {
      const canFill =
        context.side === OrderSide.BUY
          ? executionPrice <= context.limitPrice
          : executionPrice >= context.limitPrice;

      if (!canFill) {
        return this.createCancelledOrder(
          context,
          `IOC cancelled: Limit price $${context.limitPrice.toFixed(2)} not achievable. Current ${context.side === OrderSide.BUY ? 'ask' : 'bid'}: $${executionPrice.toFixed(2)}`,
        );
      }

      // Use limit price if it's more favorable
      executionPrice =
        context.side === OrderSide.BUY
          ? Math.min(executionPrice, context.limitPrice)
          : Math.max(executionPrice, context.limitPrice);
    }

    // Simulate available liquidity
    const fillableQuantity = LiquiditySimulator.simulateAvailableLiquidity(
      context.quantity,
      context.quote.volume || 0,
    );

    if (fillableQuantity === 0) {
      return this.createCancelledOrder(
        context,
        'IOC cancelled: No immediate liquidity available',
      );
    }

    // Execute the fillable quantity
    return this.executePartialFill(context, executionPrice, fillableQuantity);
  }

  private async executePartialFill(
    context: ExecutionContext,
    executionPrice: number,
    fillableQuantity: number,
  ): Promise<ExecutionResult> {
    const totalCost = executionPrice * fillableQuantity;

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

        if (!position || Number(position.quantity) < fillableQuantity) {
          await queryRunner.rollbackTransaction();
          const availableQty = position ? Number(position.quantity) : 0;
          throw new BadRequestException(
            `Insufficient shares. Required: ${fillableQuantity}, Available: ${availableQty}`,
          );
        }
        await queryRunner.manager.update(User, context.userId, {
          cashBalance: Number(user.cashBalance) + totalCost,
        });
      }

      const isPartialFill = fillableQuantity < context.quantity;
      const cancelledQuantity = context.quantity - fillableQuantity;

      const order = queryRunner.manager.create(Order, {
        userId: context.userId,
        symbol: context.symbol,
        side: context.side,
        orderType: context.orderType,
        timeInForce: TimeInForce.IOC,
        extendedHours: context.extendedHours,
        quantity: context.quantity,
        filledQuantity: fillableQuantity,
        filledPrice: executionPrice,
        avgFillPrice: executionPrice,
        limitPrice: context.limitPrice || null,
        status: isPartialFill
          ? OrderStatus.PARTIALLY_FILLED
          : OrderStatus.FILLED,
        rejectionReason: isPartialFill
          ? `IOC partial fill: ${fillableQuantity} of ${context.quantity} shares filled, ${cancelledQuantity} cancelled due to liquidity`
          : null,
        idempotencyKey: context.idempotencyKey || null,
        filledAt: new Date(),
        cancelledAt: isPartialFill ? new Date() : null,
      });

      await queryRunner.manager.save(order);

      // Update position
      await this.updatePositionInTransaction(
        queryRunner.manager,
        context.userId,
        context.symbol,
        fillableQuantity,
        executionPrice,
        context.side === OrderSide.BUY,
        order.id,
      );

      await queryRunner.commitTransaction();

      await this.orderAuditService.createAuditRecord(
        order,
        isPartialFill ? AuditAction.PARTIALLY_FILLED : AuditAction.FILLED,
        isPartialFill
          ? `IOC: ${fillableQuantity}/${context.quantity} filled, ${cancelledQuantity} cancelled`
          : 'IOC: Fully filled',
        executionPrice,
      );

      return {
        success: true,
        order,
        executionPrice,
        filledQuantity: fillableQuantity,
        isPending: false,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async createCancelledOrder(
    context: ExecutionContext,
    reason: string,
  ): Promise<ExecutionResult> {
    const order = this.orderRepository.create({
      userId: context.userId,
      symbol: context.symbol,
      side: context.side,
      orderType: context.orderType,
      timeInForce: TimeInForce.IOC,
      extendedHours: context.extendedHours,
      quantity: context.quantity,
      filledQuantity: 0,
      limitPrice: context.limitPrice || null,
      status: OrderStatus.CANCELLED,
      rejectionReason: reason,
      idempotencyKey: context.idempotencyKey || null,
      cancelledAt: new Date(),
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
