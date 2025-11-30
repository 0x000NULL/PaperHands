import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
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
import { MarketHoursService } from '../../common/services/market-hours.service';
import { OrderValidationRules } from '../domain/liquidity-simulation';

/**
 * Stop order execution strategy.
 *
 * Stop orders trigger when the market price reaches the stop price:
 * - Buy stop: Triggers when price rises to/above stop price
 * - Sell stop: Triggers when price falls to/below stop price
 *
 * Once triggered:
 * - STOP orders execute as market orders
 * - STOP_LIMIT orders become limit orders
 *
 * Stop orders are monitored by the price monitor service.
 */
@Injectable()
export class StopOrderStrategy implements IOrderExecutionStrategy {
  readonly orderType = OrderType.STOP;
  readonly supportedTimeInForce = [TimeInForce.DAY, TimeInForce.GTC];

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderAuditService: OrderAuditService,
    private readonly orderValidationService: OrderValidationService,
    private readonly marketHoursService: MarketHoursService,
  ) {}

  canExecuteImmediately(context: ExecutionContext): boolean {
    // Stop orders never execute immediately - they wait for trigger price
    void context; // Context is used by interface but not needed for stop orders
    return false;
  }

  validate(context: ExecutionContext): ValidationResult {
    const errors: string[] = [];

    // Stop price is required
    if (!context.stopPrice || context.stopPrice <= 0) {
      errors.push('Stop price is required for stop orders');
      return { isValid: false, errors };
    }

    // Validate price data
    if (!context.quote.last || context.quote.last <= 0) {
      errors.push(`Invalid price for ${context.symbol}. Market may be closed.`);
      return { isValid: false, errors };
    }

    // Validate stop price placement relative to current market
    const stopError = OrderValidationRules.validateStopPrice(
      context.side,
      context.stopPrice,
      context.quote.last,
    );

    if (stopError) {
      errors.push(stopError);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return this.createPendingOrder(context);
  }

  /**
   * Create a pending stop order.
   * The order will be monitored by the price monitor service.
   */
  private async createPendingOrder(
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    // Validate funds/shares before creating order
    if (context.side === OrderSide.BUY) {
      const estimatedCost = context.quantity * context.stopPrice!;
      const availableCash = await this.orderValidationService.getAvailableCash(
        context.userId,
      );
      if (availableCash < estimatedCost) {
        const order = await this.createRejectedOrder(
          context,
          `Insufficient funds. Required: $${estimatedCost.toFixed(2)}, Available: $${availableCash.toFixed(2)}`,
        );
        return {
          success: false,
          order,
          isPending: false,
          errorMessage: 'Insufficient funds',
        };
      }
    } else {
      const availableShares =
        await this.orderValidationService.getAvailableShares(
          context.userId,
          context.symbol,
        );
      if (availableShares < context.quantity) {
        const order = await this.createRejectedOrder(
          context,
          `Insufficient shares. Required: ${context.quantity}, Available: ${availableShares}`,
        );
        return {
          success: false,
          order,
          isPending: false,
          errorMessage: 'Insufficient shares',
        };
      }
    }

    // Calculate expiration time
    const expiresAt = this.marketHoursService.calculateExpirationTime(
      context.timeInForce,
    );

    const order = this.orderRepository.create({
      userId: context.userId,
      symbol: context.symbol,
      side: context.side,
      orderType: OrderType.STOP,
      timeInForce: context.timeInForce,
      extendedHours: context.extendedHours,
      quantity: context.quantity,
      filledQuantity: 0,
      stopPrice: context.stopPrice,
      status: OrderStatus.PENDING,
      idempotencyKey: context.idempotencyKey || null,
      expiresAt,
    });

    await this.orderRepository.save(order);

    await this.orderAuditService.createAuditRecord(
      order,
      AuditAction.CREATED,
      null,
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
      orderType: OrderType.STOP,
      timeInForce: context.timeInForce,
      extendedHours: context.extendedHours,
      quantity: context.quantity,
      filledQuantity: 0,
      stopPrice: context.stopPrice,
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
}

/**
 * Stop-limit order execution strategy.
 *
 * Stop-limit orders combine stop and limit functionality:
 * - Trigger when market price reaches stop price
 * - Once triggered, become a limit order at the limit price
 *
 * This provides more control than a stop order but risks
 * non-execution if the limit price is missed.
 */
@Injectable()
export class StopLimitOrderStrategy implements IOrderExecutionStrategy {
  readonly orderType = OrderType.STOP_LIMIT;
  readonly supportedTimeInForce = [TimeInForce.DAY, TimeInForce.GTC];

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderAuditService: OrderAuditService,
    private readonly orderValidationService: OrderValidationService,
    private readonly marketHoursService: MarketHoursService,
  ) {}

  canExecuteImmediately(context: ExecutionContext): boolean {
    void context; // Context is used by interface but not needed for stop-limit orders
    return false;
  }

  validate(context: ExecutionContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Both stop and limit prices are required
    if (!context.stopPrice || context.stopPrice <= 0) {
      errors.push('Stop price is required for stop-limit orders');
    }
    if (!context.limitPrice || context.limitPrice <= 0) {
      errors.push('Limit price is required for stop-limit orders');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Validate price data
    if (!context.quote.last || context.quote.last <= 0) {
      errors.push(`Invalid price for ${context.symbol}. Market may be closed.`);
      return { isValid: false, errors };
    }

    // Validate stop price placement
    const stopError = OrderValidationRules.validateStopPrice(
      context.side,
      context.stopPrice!,
      context.quote.last,
    );
    if (stopError) {
      errors.push(stopError);
    }

    // For stop-limit, warn if limit is far from stop
    const limitStopDistance =
      Math.abs(context.limitPrice! - context.stopPrice!) / context.stopPrice!;
    if (limitStopDistance > 0.05) {
      warnings.push(
        `Limit price is ${(limitStopDistance * 100).toFixed(1)}% from stop price. Order may not fill after triggering.`,
      );
    }

    // Validate limit price relative to stop (should be executable after trigger)
    if (
      context.side === OrderSide.BUY &&
      context.limitPrice! < context.stopPrice!
    ) {
      warnings.push(
        'Buy stop-limit: limit price is below stop price. Order may not fill after triggering.',
      );
    }
    if (
      context.side === OrderSide.SELL &&
      context.limitPrice! > context.stopPrice!
    ) {
      warnings.push(
        'Sell stop-limit: limit price is above stop price. Order may not fill after triggering.',
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return this.createPendingOrder(context);
  }

  private async createPendingOrder(
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    // Validate funds/shares
    if (context.side === OrderSide.BUY) {
      const estimatedCost =
        context.quantity * Math.max(context.stopPrice!, context.limitPrice!);
      const availableCash = await this.orderValidationService.getAvailableCash(
        context.userId,
      );
      if (availableCash < estimatedCost) {
        const order = await this.createRejectedOrder(
          context,
          `Insufficient funds. Required: $${estimatedCost.toFixed(2)}, Available: $${availableCash.toFixed(2)}`,
        );
        return {
          success: false,
          order,
          isPending: false,
          errorMessage: 'Insufficient funds',
        };
      }
    } else {
      const availableShares =
        await this.orderValidationService.getAvailableShares(
          context.userId,
          context.symbol,
        );
      if (availableShares < context.quantity) {
        const order = await this.createRejectedOrder(
          context,
          `Insufficient shares. Required: ${context.quantity}, Available: ${availableShares}`,
        );
        return {
          success: false,
          order,
          isPending: false,
          errorMessage: 'Insufficient shares',
        };
      }
    }

    const expiresAt = this.marketHoursService.calculateExpirationTime(
      context.timeInForce,
    );

    const order = this.orderRepository.create({
      userId: context.userId,
      symbol: context.symbol,
      side: context.side,
      orderType: OrderType.STOP_LIMIT,
      timeInForce: context.timeInForce,
      extendedHours: context.extendedHours,
      quantity: context.quantity,
      filledQuantity: 0,
      stopPrice: context.stopPrice,
      limitPrice: context.limitPrice,
      status: OrderStatus.PENDING,
      idempotencyKey: context.idempotencyKey || null,
      expiresAt,
    });

    await this.orderRepository.save(order);

    await this.orderAuditService.createAuditRecord(
      order,
      AuditAction.CREATED,
      null,
      context.quote.last,
    );

    return {
      success: true,
      order,
      isPending: true,
    };
  }

  private async createRejectedOrder(
    context: ExecutionContext,
    reason: string,
  ): Promise<Order> {
    const order = this.orderRepository.create({
      userId: context.userId,
      symbol: context.symbol,
      side: context.side,
      orderType: OrderType.STOP_LIMIT,
      timeInForce: context.timeInForce,
      extendedHours: context.extendedHours,
      quantity: context.quantity,
      filledQuantity: 0,
      stopPrice: context.stopPrice,
      limitPrice: context.limitPrice,
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
}
