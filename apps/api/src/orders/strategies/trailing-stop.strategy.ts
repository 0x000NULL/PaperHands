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

/**
 * Trailing stop order execution strategy.
 *
 * Trailing stops have a dynamic trigger price that "trails" the market:
 * - Sell trailing stop: Trigger trails below the peak price
 * - Buy trailing stop: Trigger trails above the trough price
 *
 * Trail offset can be specified as:
 * - Fixed dollar amount (trailAmount)
 * - Percentage of price (trailPercent)
 *
 * The trigger price is continuously adjusted by the price monitor service
 * as the market moves favorably.
 */
@Injectable()
export class TrailingStopStrategy implements IOrderExecutionStrategy {
  readonly orderType = OrderType.TRAILING_STOP;
  readonly supportedTimeInForce = [TimeInForce.DAY, TimeInForce.GTC];

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderAuditService: OrderAuditService,
    private readonly orderValidationService: OrderValidationService,
    private readonly marketHoursService: MarketHoursService,
  ) {}

  canExecuteImmediately(context: ExecutionContext): boolean {
    // Trailing stops never execute immediately
    void context; // Context is used by interface but not needed for trailing stops
    return false;
  }

  validate(context: ExecutionContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Must have either trail amount or trail percent
    if (!context.trailAmount && !context.trailPercent) {
      errors.push(
        'Trailing stop orders require either trailAmount or trailPercent',
      );
      return { isValid: false, errors };
    }

    // Cannot have both
    if (context.trailAmount && context.trailPercent) {
      errors.push(
        'Trailing stop orders cannot have both trailAmount and trailPercent. Choose one.',
      );
      return { isValid: false, errors };
    }

    // Validate price data
    if (!context.quote.last || context.quote.last <= 0) {
      errors.push(`Invalid price for ${context.symbol}. Market may be closed.`);
      return { isValid: false, errors };
    }

    // Validate trail amount if provided
    if (context.trailAmount) {
      if (context.trailAmount <= 0) {
        errors.push('Trail amount must be positive');
      }
      if (context.trailAmount > context.quote.last * 0.5) {
        errors.push(
          'Trail amount cannot exceed 50% of current price. Consider using trailPercent instead.',
        );
      }
    }

    // Validate trail percent if provided
    if (context.trailPercent) {
      if (context.trailPercent <= 0) {
        errors.push('Trail percent must be positive');
      }
      if (context.trailPercent > 50) {
        errors.push('Trail percent cannot exceed 50%');
      }
      if (context.trailPercent < 0.5) {
        warnings.push(
          'Trail percent below 0.5% may trigger on normal price fluctuations',
        );
      }
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

  /**
   * Create a pending trailing stop order.
   * Calculates initial peak price and trigger price.
   */
  private async createPendingOrder(
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    const currentPrice = context.quote.last;

    // Validate funds/shares
    if (context.side === OrderSide.BUY) {
      // For buy trailing stop, estimate cost at a reasonable premium
      const offset =
        context.trailAmount ||
        currentPrice * ((context.trailPercent || 0) / 100);
      const estimatedTrigger = currentPrice + offset;
      const estimatedCost = context.quantity * estimatedTrigger * 1.1; // 10% buffer

      const availableCash = await this.orderValidationService.getAvailableCash(
        context.userId,
      );
      if (availableCash < estimatedCost) {
        const order = await this.createRejectedOrder(
          context,
          `Insufficient funds. Required: ~$${estimatedCost.toFixed(2)}, Available: $${availableCash.toFixed(2)}`,
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

    // Calculate initial trailing values
    const trailingPeakPrice = currentPrice;
    const offset =
      context.trailAmount || currentPrice * ((context.trailPercent || 0) / 100);
    const currentTriggerPrice =
      context.side === OrderSide.SELL
        ? currentPrice - offset
        : currentPrice + offset;

    const expiresAt = this.marketHoursService.calculateExpirationTime(
      context.timeInForce,
    );

    const order = this.orderRepository.create({
      userId: context.userId,
      symbol: context.symbol,
      side: context.side,
      orderType: OrderType.TRAILING_STOP,
      timeInForce: context.timeInForce,
      extendedHours: context.extendedHours,
      quantity: context.quantity,
      filledQuantity: 0,
      trailAmount: context.trailAmount || null,
      trailPercent: context.trailPercent || null,
      trailingPeakPrice,
      currentTriggerPrice,
      status: OrderStatus.PENDING,
      idempotencyKey: context.idempotencyKey || null,
      expiresAt,
    });

    await this.orderRepository.save(order);

    await this.orderAuditService.createAuditRecord(
      order,
      AuditAction.CREATED,
      `Initial trigger: $${currentTriggerPrice.toFixed(2)}, Peak: $${trailingPeakPrice.toFixed(2)}`,
      currentPrice,
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
      orderType: OrderType.TRAILING_STOP,
      timeInForce: context.timeInForce,
      extendedHours: context.extendedHours,
      quantity: context.quantity,
      filledQuantity: 0,
      trailAmount: context.trailAmount || null,
      trailPercent: context.trailPercent || null,
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
   * Calculate new trigger price based on updated peak/trough.
   * Called by price monitor service when price moves favorably.
   *
   * @param order - The trailing stop order
   * @param newPeakPrice - The new peak (sell) or trough (buy) price
   * @returns New trigger price
   */
  static calculateNewTriggerPrice(order: Order, newPeakPrice: number): number {
    const trailAmount = order.trailAmount
      ? Number(order.trailAmount)
      : newPeakPrice * (Number(order.trailPercent) / 100);

    return order.side === OrderSide.SELL
      ? newPeakPrice - trailAmount
      : newPeakPrice + trailAmount;
  }

  /**
   * Check if new price is favorable for trailing (should update peak).
   *
   * @param order - The trailing stop order
   * @param currentPrice - Current market price
   * @returns true if peak should be updated
   */
  static shouldUpdatePeak(order: Order, currentPrice: number): boolean {
    const currentPeak = Number(order.trailingPeakPrice);

    if (order.side === OrderSide.SELL) {
      // Sell trailing stop: update peak when price rises
      return currentPrice > currentPeak;
    } else {
      // Buy trailing stop: update peak (trough) when price falls
      return currentPrice < currentPeak;
    }
  }
}
