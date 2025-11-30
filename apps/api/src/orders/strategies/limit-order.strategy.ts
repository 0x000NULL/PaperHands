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
 * Limit order execution strategy.
 *
 * Limit orders specify a maximum price (for buys) or minimum price (for sells):
 * - Buy limit: Execute at limit price or lower
 * - Sell limit: Execute at limit price or higher
 *
 * Limit orders are placed as pending and monitored until price conditions are met.
 */
@Injectable()
export class LimitOrderStrategy implements IOrderExecutionStrategy {
  readonly orderType = OrderType.LIMIT;
  readonly supportedTimeInForce = [TimeInForce.DAY, TimeInForce.GTC];

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderAuditService: OrderAuditService,
    private readonly orderValidationService: OrderValidationService,
    private readonly marketHoursService: MarketHoursService,
  ) {}

  canExecuteImmediately(context: ExecutionContext): boolean {
    // Limit orders never execute immediately - they wait for price conditions
    // Note: IOC/FOK variants handle immediate execution separately
    void context; // Context is used by interface but not needed for limit orders
    return false;
  }

  validate(context: ExecutionContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Limit price is required
    if (!context.limitPrice || context.limitPrice <= 0) {
      errors.push('Limit price is required for limit orders');
      return { isValid: false, errors };
    }

    // Validate price data
    if (!context.quote.last || context.quote.last <= 0) {
      errors.push(`Invalid price for ${context.symbol}. Market may be closed.`);
      return { isValid: false, errors };
    }

    // Validate limit price placement relative to current market
    const limitError = OrderValidationRules.validateLimitPrice(
      context.side,
      context.limitPrice,
      context.quote.last,
    );

    if (limitError) {
      errors.push(limitError);
    }

    // Warning if limit is far from current price
    const priceDistance =
      Math.abs(context.limitPrice - context.quote.last) / context.quote.last;
    if (priceDistance > 0.1) {
      warnings.push(
        `Limit price is ${(priceDistance * 100).toFixed(1)}% away from current price. Order may take a long time to fill.`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    // Limit orders are always placed as pending
    return this.createPendingOrder(context);
  }

  /**
   * Create a pending limit order.
   * The order will be monitored by the price monitor service.
   */
  private async createPendingOrder(
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    // Validate funds/shares before creating order
    if (context.side === OrderSide.BUY) {
      const estimatedCost = context.quantity * context.limitPrice!;
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
      orderType: OrderType.LIMIT,
      timeInForce: context.timeInForce,
      extendedHours: context.extendedHours,
      quantity: context.quantity,
      filledQuantity: 0,
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
      orderType: OrderType.LIMIT,
      timeInForce: context.timeInForce,
      extendedHours: context.extendedHours,
      quantity: context.quantity,
      filledQuantity: 0,
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
