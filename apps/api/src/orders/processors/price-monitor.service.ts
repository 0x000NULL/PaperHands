import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrdersService } from '../orders.service';
import { FinnhubService, Quote } from '../../market-data/finnhub.service';
import {
  MarketHoursService,
  TradingSession,
} from '../../common/services/market-hours.service';
import { Order } from '../entities/order.entity';
import { OrderType, OrderSide } from '../enums/order.enums';

@Injectable()
export class PriceMonitorService {
  private readonly logger = new Logger(PriceMonitorService.name);
  private isProcessing = false;

  constructor(
    private ordersService: OrdersService,
    private finnhubService: FinnhubService,
    private marketHoursService: MarketHoursService,
  ) {}

  /**
   * Check pending orders every 5 seconds during market hours
   */
  @Cron('*/5 * * * * *')
  async checkPendingOrders(): Promise<void> {
    // Prevent overlapping executions
    if (this.isProcessing) {
      return;
    }

    const session = this.marketHoursService.getCurrentSession();

    // Skip if market is completely closed
    if (session === 'closed') {
      return;
    }

    this.isProcessing = true;

    try {
      // Get symbols with pending orders
      // During extended hours, only check orders that allow extended hours trading
      const extendedHoursOnly = session !== 'regular';
      const symbols =
        await this.ordersService.getActiveOrderSymbols(extendedHoursOnly);

      if (symbols.length === 0) {
        return;
      }

      this.logger.debug(
        `Checking ${symbols.length} symbols for pending orders`,
      );

      // Batch fetch quotes
      const quotes = await this.batchFetchQuotes(symbols);

      // Process orders for each symbol
      for (const quote of quotes) {
        await this.processOrdersForSymbol(quote, session);
      }
    } catch (error) {
      this.logger.error('Error checking pending orders:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Batch fetch quotes with rate limit awareness
   */
  private async batchFetchQuotes(symbols: string[]): Promise<Quote[]> {
    const quotes: Quote[] = [];
    const batchSize = 30;

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);

      // Fetch quotes for this batch
      const batchQuotes = await this.finnhubService.getQuotes(batch);
      quotes.push(...batchQuotes);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < symbols.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return quotes;
  }

  /**
   * Process all pending orders for a specific symbol
   */
  private async processOrdersForSymbol(
    quote: Quote,
    session: TradingSession,
  ): Promise<void> {
    const extendedHoursOnly = session !== 'regular';
    const orders = await this.ordersService.getPendingConditionalOrders(
      [quote.symbol],
      extendedHoursOnly,
    );

    for (const order of orders) {
      try {
        // Update trailing stop peak if applicable
        if (order.orderType === OrderType.TRAILING_STOP) {
          await this.updateTrailingStopPeak(order, quote);
        }

        // Check if order should trigger
        if (await this.shouldTrigger(order, quote)) {
          await this.triggerOrder(order, quote);
        }
      } catch (error) {
        this.logger.error(
          `Error processing order ${order.id} for ${order.symbol}:`,
          error,
        );
      }
    }
  }

  /**
   * Check if an order's trigger condition is met
   */
  private async shouldTrigger(order: Order, quote: Quote): Promise<boolean> {
    const price = quote.last;

    switch (order.orderType) {
      case OrderType.LIMIT:
        return this.checkLimitOrder(order, price);

      case OrderType.STOP:
        return this.checkStopOrder(order, price);

      case OrderType.STOP_LIMIT:
        return await this.checkStopLimitOrder(order, price);

      case OrderType.TRAILING_STOP:
        return this.checkTrailingStop(order, price);

      default:
        return false;
    }
  }

  /**
   * Check limit order condition
   * Buy limit: price <= limit (buy at or below limit)
   * Sell limit: price >= limit (sell at or above limit)
   */
  private checkLimitOrder(order: Order, price: number): boolean {
    const limitPrice = Number(order.limitPrice);

    if (order.side === OrderSide.BUY) {
      return price <= limitPrice;
    } else {
      return price >= limitPrice;
    }
  }

  /**
   * Check stop order condition
   * Buy stop: price >= stop (trigger when price rises to stop)
   * Sell stop: price <= stop (trigger when price falls to stop)
   */
  private checkStopOrder(order: Order, price: number): boolean {
    const stopPrice = Number(order.stopPrice);

    if (order.side === OrderSide.BUY) {
      return price >= stopPrice;
    } else {
      return price <= stopPrice;
    }
  }

  /**
   * Check stop-limit order condition
   * First the stop must be triggered, then the limit condition must be met
   */
  private async checkStopLimitOrder(
    order: Order,
    price: number,
  ): Promise<boolean> {
    const stopPrice = Number(order.stopPrice);
    const limitPrice = Number(order.limitPrice);

    // If not yet triggered, check stop condition
    if (!order.triggeredAt) {
      const stopTriggered =
        order.side === OrderSide.BUY ? price >= stopPrice : price <= stopPrice;

      if (stopTriggered) {
        // Mark as triggered (status changes to OPEN)
        try {
          await this.ordersService.markStopLimitTriggered(order.id);
          this.logger.log(
            `Stop-limit order ${order.id} stop triggered at ${price}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to mark stop-limit order ${order.id} as triggered:`,
            error,
          );
        }
      }
      return false;
    }

    // Stop already triggered, check limit condition
    if (order.side === OrderSide.BUY) {
      return price <= limitPrice;
    } else {
      return price >= limitPrice;
    }
  }

  /**
   * Check trailing stop condition
   */
  private checkTrailingStop(order: Order, price: number): boolean {
    const triggerPrice = Number(order.currentTriggerPrice);

    if (order.side === OrderSide.SELL) {
      // Sell trailing stop triggers when price falls to trigger price
      return price <= triggerPrice;
    } else {
      // Buy trailing stop triggers when price rises to trigger price
      return price >= triggerPrice;
    }
  }

  /**
   * Update trailing stop peak price and recalculate trigger price
   */
  private async updateTrailingStopPeak(
    order: Order,
    quote: Quote,
  ): Promise<void> {
    const price = quote.last;
    const currentPeak = Number(order.trailingPeakPrice);
    let newPeak = currentPeak;

    if (order.side === OrderSide.SELL) {
      // Track highest price for sell trailing stop
      if (price > currentPeak) {
        newPeak = price;
      }
    } else {
      // Track lowest price for buy trailing stop
      if (price < currentPeak) {
        newPeak = price;
      }
    }

    // Only update if peak changed
    if (newPeak !== currentPeak) {
      const offset = order.trailAmount
        ? Number(order.trailAmount)
        : newPeak * (Number(order.trailPercent) / 100);

      const newTriggerPrice =
        order.side === OrderSide.SELL ? newPeak - offset : newPeak + offset;

      await this.ordersService.updateTrailingStopPeak(
        order.id,
        newPeak,
        newTriggerPrice,
      );

      this.logger.debug(
        `Updated trailing stop ${order.id}: peak=${newPeak}, trigger=${newTriggerPrice}`,
      );
    }
  }

  /**
   * Trigger and execute an order
   */
  private async triggerOrder(order: Order, quote: Quote): Promise<void> {
    const triggerPrice = quote.last;
    const executionPrice = order.side === OrderSide.BUY ? quote.ask : quote.bid;

    // For limit orders, use the limit price as the execution price
    // (since we know the market price is at or better than limit)
    let finalExecutionPrice = executionPrice;
    if (
      order.orderType === OrderType.LIMIT ||
      (order.orderType === OrderType.STOP_LIMIT && order.triggeredAt)
    ) {
      // Execute at the limit price or better
      if (order.side === OrderSide.BUY) {
        finalExecutionPrice = Math.min(
          executionPrice,
          Number(order.limitPrice),
        );
      } else {
        finalExecutionPrice = Math.max(
          executionPrice,
          Number(order.limitPrice),
        );
      }
    }

    this.logger.log(
      `Triggering ${order.orderType} order ${order.id} for ${order.symbol} at ${finalExecutionPrice}`,
    );

    await this.ordersService.executeConditionalOrder(
      order.id,
      triggerPrice,
      finalExecutionPrice,
    );
  }
}
