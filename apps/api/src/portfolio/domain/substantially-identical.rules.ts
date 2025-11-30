/**
 * IRS rules for determining if securities are "substantially identical"
 * for wash sale purposes.
 *
 * Per IRS guidance:
 * - Identical stocks are substantially identical
 * - Options on the same stock may be substantially identical if they have
 *   similar characteristics (same type, similar strike price)
 * - A call option and the underlying stock can trigger wash sales
 */

export type SecurityType = 'stock' | 'call' | 'put';

export interface SecurityInfo {
  symbol: string;
  type: SecurityType;
  strikePrice?: number;
}

export class SubstantiallyIdenticalRules {
  /**
   * Strike price tolerance percentage for considering options substantially identical.
   * Options with strikes within this percentage are considered substantially identical.
   */
  public static readonly STRIKE_TOLERANCE_PERCENT = 5;

  /**
   * Determine if two securities are substantially identical for wash sale purposes.
   */
  static isSubstantiallyIdentical(
    original: SecurityInfo,
    replacement: SecurityInfo,
  ): boolean {
    // Must be same underlying symbol
    if (original.symbol !== replacement.symbol) {
      return false;
    }

    // Stock to stock - always substantially identical
    if (original.type === 'stock' && replacement.type === 'stock') {
      return true;
    }

    // Stock to call option - substantially identical (acquiring right to buy)
    if (original.type === 'stock' && replacement.type === 'call') {
      return true;
    }

    // Call option to stock - substantially identical
    if (original.type === 'call' && replacement.type === 'stock') {
      return true;
    }

    // Option to option - check type and strike similarity
    if (
      this.isOptionType(original.type) &&
      this.isOptionType(replacement.type)
    ) {
      return this.areOptionsSubstantiallyIdentical(original, replacement);
    }

    // Put to stock or stock to put - NOT substantially identical
    // (puts give you right to sell, not acquire)
    return false;
  }

  /**
   * Check if two options are substantially identical.
   * Same type (call/put) and strike within tolerance.
   */
  private static areOptionsSubstantiallyIdentical(
    original: SecurityInfo,
    replacement: SecurityInfo,
  ): boolean {
    // Must be same option type (call/call or put/put)
    if (original.type !== replacement.type) {
      return false;
    }

    // If no strike prices, can't determine - assume not identical
    if (
      original.strikePrice === undefined ||
      replacement.strikePrice === undefined
    ) {
      return false;
    }

    return this.areStrikesWithinTolerance(
      original.strikePrice,
      replacement.strikePrice,
    );
  }

  /**
   * Check if two strike prices are within the tolerance percentage.
   */
  static areStrikesWithinTolerance(strike1: number, strike2: number): boolean {
    const tolerance = strike1 * (this.STRIKE_TOLERANCE_PERCENT / 100);
    return Math.abs(strike1 - strike2) <= tolerance;
  }

  /**
   * Get strike price bounds for database queries.
   * Returns the low and high bounds for a substantially identical option search.
   */
  static getStrikeBounds(strikePrice: number): { low: number; high: number } {
    const toleranceMultiplier = this.STRIKE_TOLERANCE_PERCENT / 100;
    return {
      low: strikePrice * (1 - toleranceMultiplier),
      high: strikePrice * (1 + toleranceMultiplier),
    };
  }

  private static isOptionType(type: SecurityType): type is 'call' | 'put' {
    return type === 'call' || type === 'put';
  }
}
