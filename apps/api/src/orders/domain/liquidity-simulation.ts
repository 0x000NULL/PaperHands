import { OrderSide } from '../enums/order.enums';

/**
 * Liquidity simulation for paper trading.
 *
 * Since this is a paper trading platform, we simulate market liquidity
 * to provide realistic partial fills for IOC orders and realistic
 * rejections for large FOK orders.
 */
export class LiquiditySimulator {
  /**
   * Simulate available liquidity for IOC (Immediate-Or-Cancel) orders.
   * Returns the quantity that can be filled immediately.
   *
   * Based on order size relative to daily volume:
   * - Small orders (<0.1% of volume): 100% fill
   * - Medium orders (0.1-1% of volume): 80-100% fill
   * - Large orders (>1% of volume): 50-80% fill
   *
   * @param orderQuantity - Requested order quantity
   * @param dailyVolume - Stock's daily trading volume
   * @returns Fillable quantity
   */
  static simulateAvailableLiquidity(
    orderQuantity: number,
    dailyVolume: number,
  ): number {
    const effectiveVolume = dailyVolume || 1_000_000;
    const volumeRatio = orderQuantity / effectiveVolume;

    // Small orders (<0.1% of volume): 100% fill
    if (volumeRatio < 0.001) {
      return orderQuantity;
    }

    // Medium orders (0.1-1% of volume): 80-100% fill
    if (volumeRatio < 0.01) {
      const fillPercent = 0.8 + Math.random() * 0.2;
      return Math.floor(orderQuantity * fillPercent);
    }

    // Large orders (>1% of volume): 50-80% fill
    const fillPercent = 0.5 + Math.random() * 0.3;
    return Math.floor(orderQuantity * fillPercent);
  }

  /**
   * Check if full quantity can be filled immediately for FOK orders.
   *
   * Based on order size relative to daily volume:
   * - Small orders (<0.1% of volume): always fill
   * - Small-medium orders (<0.5% of volume): 90% chance
   * - Medium orders (<1% of volume): 70% chance
   * - Large orders (>1% of volume): 50% chance
   *
   * @param orderQuantity - Requested order quantity
   * @param dailyVolume - Stock's daily trading volume
   * @returns true if full quantity can be filled
   */
  static canFillFullQuantity(
    orderQuantity: number,
    dailyVolume: number,
  ): boolean {
    const effectiveVolume = dailyVolume || 1_000_000;
    const volumeRatio = orderQuantity / effectiveVolume;

    // Small orders (<0.1% of volume): always fill
    if (volumeRatio < 0.001) {
      return true;
    }

    // Small-medium orders (<0.5% of volume): 90% chance
    if (volumeRatio < 0.005) {
      return Math.random() > 0.1;
    }

    // Medium orders (<1% of volume): 70% chance
    if (volumeRatio < 0.01) {
      return Math.random() > 0.3;
    }

    // Large orders (>1% of volume): 50% chance
    return Math.random() > 0.5;
  }

  /**
   * Calculate extended hours adjusted execution price.
   * Extended hours typically have wider spreads due to lower liquidity.
   *
   * @param basePrice - Base execution price (bid/ask)
   * @param side - Buy or sell side
   * @param spreadMultiplier - How much wider spreads are (default 2x)
   * @returns Adjusted execution price
   */
  static getExtendedHoursAdjustedPrice(
    basePrice: number,
    side: OrderSide,
    spreadMultiplier = 2.0,
  ): number {
    const baseSpread = basePrice * 0.002; // 0.2% base spread
    const adjustment = baseSpread * spreadMultiplier;

    return side === OrderSide.BUY
      ? basePrice + adjustment
      : basePrice - adjustment;
  }
}

/**
 * Order validation rules for conditional orders.
 */
export class OrderValidationRules {
  /**
   * Validate stop price placement relative to current market price.
   *
   * For stop orders:
   * - Buy stop: must be ABOVE current price (to catch breakouts)
   * - Sell stop: must be BELOW current price (to limit losses)
   *
   * @param side - Buy or sell
   * @param stopPrice - Requested stop price
   * @param currentPrice - Current market price
   * @returns Error message if invalid, null if valid
   */
  static validateStopPrice(
    side: OrderSide,
    stopPrice: number,
    currentPrice: number,
  ): string | null {
    if (side === OrderSide.BUY && stopPrice <= currentPrice) {
      return `Buy stop price must be above current price ($${currentPrice.toFixed(2)})`;
    }
    if (side === OrderSide.SELL && stopPrice >= currentPrice) {
      return `Sell stop price must be below current price ($${currentPrice.toFixed(2)})`;
    }
    return null;
  }

  /**
   * Validate limit price placement relative to current market price.
   *
   * For limit orders:
   * - Buy limit: must be BELOW current price (to get better price)
   * - Sell limit: must be ABOVE current price (to get better price)
   *
   * @param side - Buy or sell
   * @param limitPrice - Requested limit price
   * @param currentPrice - Current market price
   * @returns Error message if invalid, null if valid
   */
  static validateLimitPrice(
    side: OrderSide,
    limitPrice: number,
    currentPrice: number,
  ): string | null {
    if (side === OrderSide.BUY && limitPrice >= currentPrice) {
      return `Buy limit price must be below current price ($${currentPrice.toFixed(2)})`;
    }
    if (side === OrderSide.SELL && limitPrice <= currentPrice) {
      return `Sell limit price must be above current price ($${currentPrice.toFixed(2)})`;
    }
    return null;
  }

  /**
   * Check if a limit order price would trigger immediate execution.
   *
   * @param side - Buy or sell
   * @param limitPrice - Limit price
   * @param quote - Market quote with bid/ask
   * @returns true if order would fill immediately at market
   */
  static wouldFillImmediately(
    side: OrderSide,
    limitPrice: number,
    quote: { bid: number; ask: number },
  ): boolean {
    if (side === OrderSide.BUY) {
      return limitPrice >= quote.ask;
    }
    return limitPrice <= quote.bid;
  }
}
