/**
 * Immutable domain value object representing option Greeks.
 *
 * The Greeks measure the sensitivity of an option's price to various factors:
 * - Delta: Price sensitivity to underlying price changes
 * - Gamma: Rate of change of delta
 * - Theta: Time decay (daily loss in value)
 * - Vega: Sensitivity to implied volatility changes
 * - Rho: Sensitivity to interest rate changes
 * - IV: Implied volatility percentage
 */
export class GreeksSnapshot {
  constructor(
    public readonly delta: number,
    public readonly gamma: number,
    public readonly theta: number,
    public readonly vega: number,
    public readonly rho: number,
    public readonly iv: number = 0,
  ) {
    Object.freeze(this);
  }

  /**
   * Create an empty Greeks snapshot with all zeros.
   */
  static empty(): GreeksSnapshot {
    return new GreeksSnapshot(0, 0, 0, 0, 0, 0);
  }

  /**
   * Create from a raw Greeks object (e.g., from API response or database).
   */
  static fromRaw(raw: {
    delta?: number | null;
    gamma?: number | null;
    theta?: number | null;
    vega?: number | null;
    rho?: number | null;
    iv?: number | null;
  }): GreeksSnapshot {
    return new GreeksSnapshot(
      raw.delta ?? 0,
      raw.gamma ?? 0,
      raw.theta ?? 0,
      raw.vega ?? 0,
      raw.rho ?? 0,
      raw.iv ?? 0,
    );
  }

  /**
   * Scale all Greeks by a multiplier (e.g., for position quantity).
   * Note: IV is not scaled as it's a percentage, not a position-weighted value.
   *
   * @param multiplier - Usually quantity * 100 (contract multiplier)
   */
  scale(multiplier: number): GreeksSnapshot {
    return new GreeksSnapshot(
      this.delta * multiplier,
      this.gamma * multiplier,
      this.theta * multiplier,
      this.vega * multiplier,
      this.rho * multiplier,
      this.iv, // IV doesn't scale with position size
    );
  }

  /**
   * Add two Greeks snapshots together (for portfolio aggregation).
   * IV is averaged since it doesn't sum meaningfully.
   */
  add(other: GreeksSnapshot): GreeksSnapshot {
    return new GreeksSnapshot(
      this.delta + other.delta,
      this.gamma + other.gamma,
      this.theta + other.theta,
      this.vega + other.vega,
      this.rho + other.rho,
      // Average IV, weighted equally (could be improved with position weighting)
      (this.iv + other.iv) / 2,
    );
  }

  /**
   * Add Greeks to a running total, preserving IV as-is.
   * Useful for accumulating portfolio totals where IV isn't meaningful.
   */
  accumulate(other: GreeksSnapshot): GreeksSnapshot {
    return new GreeksSnapshot(
      this.delta + other.delta,
      this.gamma + other.gamma,
      this.theta + other.theta,
      this.vega + other.vega,
      this.rho + other.rho,
      this.iv, // Keep original IV
    );
  }

  /**
   * Check if this snapshot represents zero (no position).
   */
  isZero(): boolean {
    return (
      this.delta === 0 &&
      this.gamma === 0 &&
      this.theta === 0 &&
      this.vega === 0 &&
      this.rho === 0
    );
  }

  /**
   * Convert to a plain object for serialization.
   */
  toJSON(): {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
    iv: number;
  } {
    return {
      delta: this.delta,
      gamma: this.gamma,
      theta: this.theta,
      vega: this.vega,
      rho: this.rho,
      iv: this.iv,
    };
  }
}

/**
 * Pure calculation functions for sensitivity analysis.
 * These don't depend on any external state and are easily testable.
 */
export class SensitivityCalculator {
  /**
   * Standard options contract multiplier.
   */
  static readonly CONTRACT_MULTIPLIER = 100;

  /**
   * Estimate P&L for a price change using delta and gamma approximation.
   *
   * Uses the Taylor series approximation:
   * P&L ≈ delta * ΔS + 0.5 * gamma * ΔS²
   *
   * @param greeks - Current Greeks for the position
   * @param priceChange - Dollar change in underlying price
   * @param quantity - Number of contracts
   * @param multiplier - Contract multiplier (default 100)
   */
  static estimatePriceChangePnL(
    greeks: GreeksSnapshot,
    priceChange: number,
    quantity: number,
    multiplier: number = this.CONTRACT_MULTIPLIER,
  ): number {
    const qtyMultiplier = quantity * multiplier;
    const deltaPnL = greeks.delta * priceChange * qtyMultiplier;
    const gammaPnL =
      0.5 * greeks.gamma * Math.pow(priceChange, 2) * qtyMultiplier;
    return deltaPnL + gammaPnL;
  }

  /**
   * Estimate P&L for an IV change.
   *
   * @param greeks - Current Greeks
   * @param ivChangePercent - Change in IV as percentage points (e.g., 2 for 2% increase)
   * @param quantity - Number of contracts
   * @param multiplier - Contract multiplier
   */
  static estimateIVChangePnL(
    greeks: GreeksSnapshot,
    ivChangePercent: number,
    quantity: number,
    multiplier: number = this.CONTRACT_MULTIPLIER,
  ): number {
    const qtyMultiplier = quantity * multiplier;
    // Vega is typically quoted per 1% IV change
    return greeks.vega * ivChangePercent * qtyMultiplier;
  }

  /**
   * Estimate new delta after a price change using gamma.
   */
  static estimateNewDelta(
    currentDelta: number,
    gamma: number,
    priceChange: number,
  ): number {
    return currentDelta + gamma * priceChange;
  }

  /**
   * Calculate daily theta decay in dollars.
   */
  static calculateDailyDecay(
    theta: number,
    quantity: number,
    multiplier: number = this.CONTRACT_MULTIPLIER,
  ): number {
    return theta * quantity * multiplier;
  }

  /**
   * Calculate notional exposure based on delta.
   *
   * @param delta - Position delta
   * @param underlyingPrice - Current price of underlying
   * @param quantity - Number of contracts
   * @param multiplier - Contract multiplier
   */
  static calculateNotionalExposure(
    delta: number,
    underlyingPrice: number,
    quantity: number,
    multiplier: number = this.CONTRACT_MULTIPLIER,
  ): number {
    return Math.abs(delta) * underlyingPrice * quantity * multiplier;
  }
}
