import { Injectable, BadRequestException } from '@nestjs/common';
import { OrderType, TimeInForce } from '../enums/order.enums';
import { IOrderExecutionStrategy } from '../interfaces/order-execution-strategy.interface';
import { MarketOrderStrategy } from './market-order.strategy';
import { LimitOrderStrategy } from './limit-order.strategy';
import {
  StopOrderStrategy,
  StopLimitOrderStrategy,
} from './stop-order.strategy';
import { TrailingStopStrategy } from './trailing-stop.strategy';
import { IOCOrderStrategy } from './ioc-order.strategy';
import { FOKOrderStrategy } from './fok-order.strategy';

/**
 * Factory for selecting the appropriate order execution strategy.
 *
 * Strategy selection is based on:
 * 1. Time-in-force (IOC/FOK override order type)
 * 2. Order type (market, limit, stop, etc.)
 *
 * IOC and FOK are treated as special time-in-force strategies that
 * can work with different order types.
 */
@Injectable()
export class ExecutionStrategyFactory {
  private readonly strategyMap: Map<string, IOrderExecutionStrategy>;

  constructor(
    private readonly marketOrderStrategy: MarketOrderStrategy,
    private readonly limitOrderStrategy: LimitOrderStrategy,
    private readonly stopOrderStrategy: StopOrderStrategy,
    private readonly stopLimitOrderStrategy: StopLimitOrderStrategy,
    private readonly trailingStopStrategy: TrailingStopStrategy,
    private readonly iocOrderStrategy: IOCOrderStrategy,
    private readonly fokOrderStrategy: FOKOrderStrategy,
  ) {
    // Initialize strategy map for O(1) lookup
    this.strategyMap = new Map();

    // Time-in-force based strategies (take priority)
    this.strategyMap.set(this.makeKey(null, TimeInForce.IOC), iocOrderStrategy);
    this.strategyMap.set(this.makeKey(null, TimeInForce.FOK), fokOrderStrategy);

    // Order type based strategies
    this.strategyMap.set(
      this.makeKey(OrderType.MARKET, null),
      marketOrderStrategy,
    );
    this.strategyMap.set(
      this.makeKey(OrderType.LIMIT, null),
      limitOrderStrategy,
    );
    this.strategyMap.set(this.makeKey(OrderType.STOP, null), stopOrderStrategy);
    this.strategyMap.set(
      this.makeKey(OrderType.STOP_LIMIT, null),
      stopLimitOrderStrategy,
    );
    this.strategyMap.set(
      this.makeKey(OrderType.TRAILING_STOP, null),
      trailingStopStrategy,
    );
  }

  /**
   * Get the appropriate execution strategy for an order.
   *
   * @param orderType - The order type
   * @param timeInForce - The time-in-force
   * @returns The appropriate execution strategy
   * @throws BadRequestException if no strategy found
   */
  getStrategy(
    orderType: OrderType,
    timeInForce: TimeInForce,
  ): IOrderExecutionStrategy {
    // IOC and FOK take priority regardless of order type
    if (timeInForce === TimeInForce.IOC) {
      return this.iocOrderStrategy;
    }
    if (timeInForce === TimeInForce.FOK) {
      return this.fokOrderStrategy;
    }

    // Look up by order type
    const strategy = this.strategyMap.get(this.makeKey(orderType, null));
    if (!strategy) {
      throw new BadRequestException(
        `No execution strategy found for order type: ${orderType}`,
      );
    }

    // Validate that the strategy supports the time-in-force
    if (!strategy.supportedTimeInForce.includes(timeInForce)) {
      throw new BadRequestException(
        `Order type ${orderType} does not support time-in-force: ${timeInForce}. ` +
          `Supported: ${strategy.supportedTimeInForce.join(', ')}`,
      );
    }

    return strategy;
  }

  /**
   * Get all registered strategies.
   * Useful for testing and diagnostics.
   */
  getAllStrategies(): IOrderExecutionStrategy[] {
    return [
      this.marketOrderStrategy,
      this.limitOrderStrategy,
      this.stopOrderStrategy,
      this.stopLimitOrderStrategy,
      this.trailingStopStrategy,
      this.iocOrderStrategy,
      this.fokOrderStrategy,
    ];
  }

  /**
   * Check if an order type/time-in-force combination is supported.
   */
  isSupported(orderType: OrderType, timeInForce: TimeInForce): boolean {
    try {
      this.getStrategy(orderType, timeInForce);
      return true;
    } catch {
      return false;
    }
  }

  private makeKey(
    orderType: OrderType | null,
    timeInForce: TimeInForce | null,
  ): string {
    return `${orderType || 'ANY'}:${timeInForce || 'ANY'}`;
  }
}
