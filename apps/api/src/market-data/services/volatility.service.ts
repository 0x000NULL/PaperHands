import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { VolatilitySnapshot } from '../entities/volatility-snapshot.entity';
import { TradierService } from '../tradier.service';

export interface IVRankResult {
  symbol: string;
  currentIV: number | null;
  ivRank: number | null; // 0-100, where current IV sits in 52-week range
  ivPercentile: number | null; // 0-100, % of days with IV below current
  iv52WeekHigh: number | null;
  iv52WeekLow: number | null;
  dataPoints: number; // Number of historical snapshots available
}

export interface VolatilityComparisonResult {
  symbol: string;
  currentIV: number | null;
  hv20: number | null; // 20-day historical volatility
  hv30: number | null; // 30-day historical volatility
  hv60: number | null; // 60-day historical volatility
  ivHvSpread: number | null; // Current IV - HV20 (positive = IV premium)
  isIVElevated: boolean; // IV > HV20
}

export interface VolatilityMetrics {
  symbol: string;
  currentIV: number | null;
  ivRank: number | null;
  ivPercentile: number | null;
  iv52WeekHigh: number | null;
  iv52WeekLow: number | null;
  hv20: number | null;
  hv30: number | null;
  hv60: number | null;
  ivHvSpread: number | null;
  underlyingPrice: number | null;
  lastUpdated: Date | null;
}

@Injectable()
export class VolatilityService {
  private readonly logger = new Logger(VolatilityService.name);

  constructor(
    @InjectRepository(VolatilitySnapshot)
    private readonly volatilityRepo: Repository<VolatilitySnapshot>,
    private readonly tradierService: TradierService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Calculate Historical Volatility from price data
   * Uses standard deviation of log returns, annualized (sqrt(252))
   */
  calculateHistoricalVolatility(closePrices: number[], period: number): number {
    if (closePrices.length < period + 1) {
      throw new Error(
        `Not enough data points. Need ${period + 1}, got ${closePrices.length}`,
      );
    }

    // Take the most recent prices for the period
    const prices = closePrices.slice(-(period + 1));

    // Calculate log returns
    const logReturns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] <= 0 || prices[i] <= 0) continue;
      logReturns.push(Math.log(prices[i] / prices[i - 1]));
    }

    if (logReturns.length < 2) {
      throw new Error('Not enough valid returns to calculate volatility');
    }

    // Calculate mean
    const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;

    // Calculate variance
    const variance =
      logReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      (logReturns.length - 1);

    // Standard deviation of daily returns
    const dailyStdDev = Math.sqrt(variance);

    // Annualize (multiply by sqrt of trading days)
    const annualizedVol = dailyStdDev * Math.sqrt(252);

    return annualizedVol;
  }

  /**
   * Get current ATM Implied Volatility from options chain
   */
  async getCurrentATMIV(symbol: string): Promise<number | null> {
    try {
      // Get available expirations
      const expirations =
        await this.tradierService.getOptionsExpirations(symbol);
      if (!expirations || expirations.length === 0) {
        return null;
      }

      // Get the nearest expiration (30+ days out preferred for stability)
      const today = new Date();
      let targetExpiration = expirations[0];

      for (const exp of expirations) {
        const expDate = new Date(exp);
        const daysToExp = Math.ceil(
          (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysToExp >= 30) {
          targetExpiration = exp;
          break;
        }
      }

      // Get options chain with greeks
      const chain = await this.tradierService.getOptionsChain(
        symbol,
        targetExpiration,
        5, // Get 5 strikes around ATM
      );

      // Find ATM options and average their IV
      const quote = await this.tradierService.getQuote(symbol);
      const price = quote.last;

      // Find the call and put closest to ATM
      let atmCallIV: number | null = null;
      let atmPutIV: number | null = null;
      let minCallDiff = Infinity;
      let minPutDiff = Infinity;

      for (const call of chain.calls) {
        const diff = Math.abs(call.strike - price);
        if (diff < minCallDiff && call.greeks?.iv) {
          minCallDiff = diff;
          atmCallIV = call.greeks.iv;
        }
      }

      for (const put of chain.puts) {
        const diff = Math.abs(put.strike - price);
        if (diff < minPutDiff && put.greeks?.iv) {
          minPutDiff = diff;
          atmPutIV = put.greeks.iv;
        }
      }

      // Average the ATM call and put IV
      if (atmCallIV !== null && atmPutIV !== null) {
        return (atmCallIV + atmPutIV) / 2;
      } else if (atmCallIV !== null) {
        return atmCallIV;
      } else if (atmPutIV !== null) {
        return atmPutIV;
      }

      return null;
    } catch (error) {
      this.logger.warn(
        `Failed to get ATM IV for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Create a daily volatility snapshot for a symbol
   */
  async createDailySnapshot(
    symbol: string,
  ): Promise<VolatilitySnapshot | null> {
    const upperSymbol = symbol.toUpperCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if we already have a snapshot for today
    const existing = await this.volatilityRepo.findOne({
      where: {
        symbol: upperSymbol,
        snapshotDate: today,
      },
    });

    if (existing) {
      this.logger.debug(
        `Snapshot already exists for ${upperSymbol} on ${today.toISOString().split('T')[0]}`,
      );
      return existing;
    }

    try {
      // Get 1Y of daily candles for HV calculation
      const candles = await this.tradierService.getCandles(upperSymbol, '1Y');

      if (!candles.candles || candles.candles.length < 61) {
        this.logger.warn(
          `Not enough price data for ${upperSymbol}: ${candles.candles?.length || 0} candles`,
        );
        return null;
      }

      const closePrices = candles.candles.map((c) => c.close);
      const underlyingPrice = closePrices[closePrices.length - 1];

      // Calculate HV for different periods
      let hv20: number | null = null;
      let hv30: number | null = null;
      let hv60: number | null = null;

      try {
        hv20 = this.calculateHistoricalVolatility(closePrices, 20);
      } catch {
        this.logger.debug(`Could not calculate HV20 for ${upperSymbol}`);
      }

      try {
        hv30 = this.calculateHistoricalVolatility(closePrices, 30);
      } catch {
        this.logger.debug(`Could not calculate HV30 for ${upperSymbol}`);
      }

      try {
        hv60 = this.calculateHistoricalVolatility(closePrices, 60);
      } catch {
        this.logger.debug(`Could not calculate HV60 for ${upperSymbol}`);
      }

      // Get current ATM IV
      const ivAtm = await this.getCurrentATMIV(upperSymbol);

      // Create and save the snapshot
      const snapshot = this.volatilityRepo.create({
        symbol: upperSymbol,
        snapshotDate: today,
        ivAtm,
        hv20,
        hv30,
        hv60,
        underlyingPrice,
      });

      await this.volatilityRepo.save(snapshot);
      this.logger.log(`Created volatility snapshot for ${upperSymbol}`);

      return snapshot;
    } catch (error) {
      this.logger.error(
        `Failed to create snapshot for ${upperSymbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Get IV Rank and IV Percentile for a symbol
   * IV Rank = (Current IV - 52w Low) / (52w High - 52w Low) * 100
   * IV Percentile = % of days in past 52 weeks where IV was lower than current
   */
  async getIVRank(symbol: string): Promise<IVRankResult> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `volatility:rank:${upperSymbol}`;

    // Check cache (5 minute TTL)
    const cached = await this.cacheManager.get<IVRankResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get current IV
    const currentIV = await this.getCurrentATMIV(upperSymbol);

    // Get 52 weeks of historical snapshots
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const snapshots = await this.volatilityRepo.find({
      where: {
        symbol: upperSymbol,
        snapshotDate: MoreThanOrEqual(oneYearAgo),
        ivAtm: MoreThanOrEqual(0), // Filter out nulls
      },
      order: { snapshotDate: 'ASC' },
    });

    const validIVs = snapshots
      .map((s) => (s.ivAtm !== null ? Number(s.ivAtm) : null))
      .filter((iv): iv is number => iv !== null && iv > 0);

    let ivRank: number | null = null;
    let ivPercentile: number | null = null;
    let iv52WeekHigh: number | null = null;
    let iv52WeekLow: number | null = null;

    if (validIVs.length > 0) {
      iv52WeekHigh = Math.max(...validIVs);
      iv52WeekLow = Math.min(...validIVs);

      if (currentIV !== null && iv52WeekHigh > iv52WeekLow) {
        // IV Rank: Where current IV sits in the 52-week range (0-100)
        ivRank = Math.round(
          ((currentIV - iv52WeekLow) / (iv52WeekHigh - iv52WeekLow)) * 100,
        );
        ivRank = Math.max(0, Math.min(100, ivRank)); // Clamp to 0-100

        // IV Percentile: % of historical readings below current IV
        const belowCurrent = validIVs.filter((iv) => iv < currentIV).length;
        ivPercentile = Math.round((belowCurrent / validIVs.length) * 100);
      }
    }

    const result: IVRankResult = {
      symbol: upperSymbol,
      currentIV,
      ivRank,
      ivPercentile,
      iv52WeekHigh,
      iv52WeekLow,
      dataPoints: validIVs.length,
    };

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300_000);

    return result;
  }

  /**
   * Get IV vs HV comparison
   */
  async getVolatilityComparison(
    symbol: string,
  ): Promise<VolatilityComparisonResult> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `volatility:comparison:${upperSymbol}`;

    // Check cache (5 minute TTL)
    const cached =
      await this.cacheManager.get<VolatilityComparisonResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get current IV
    const currentIV = await this.getCurrentATMIV(upperSymbol);

    // Calculate current HV from price data
    let hv20: number | null = null;
    let hv30: number | null = null;
    let hv60: number | null = null;

    try {
      const candles = await this.tradierService.getCandles(upperSymbol, '1Y');
      if (candles.candles && candles.candles.length >= 61) {
        const closePrices = candles.candles.map((c) => c.close);

        try {
          hv20 = this.calculateHistoricalVolatility(closePrices, 20);
        } catch {
          // Not enough data
        }

        try {
          hv30 = this.calculateHistoricalVolatility(closePrices, 30);
        } catch {
          // Not enough data
        }

        try {
          hv60 = this.calculateHistoricalVolatility(closePrices, 60);
        } catch {
          // Not enough data
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to get price data for ${upperSymbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    const ivHvSpread =
      currentIV !== null && hv20 !== null ? currentIV - hv20 : null;

    const result: VolatilityComparisonResult = {
      symbol: upperSymbol,
      currentIV,
      hv20,
      hv30,
      hv60,
      ivHvSpread,
      isIVElevated: ivHvSpread !== null && ivHvSpread > 0,
    };

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300_000);

    return result;
  }

  /**
   * Get comprehensive volatility metrics
   */
  async getVolatilityMetrics(symbol: string): Promise<VolatilityMetrics> {
    const [ivRankResult, comparisonResult, quote] = await Promise.all([
      this.getIVRank(symbol),
      this.getVolatilityComparison(symbol),
      this.tradierService.getQuote(symbol).catch(() => null),
    ]);

    // Get the most recent snapshot
    const latestSnapshot = await this.volatilityRepo.findOne({
      where: { symbol: symbol.toUpperCase() },
      order: { snapshotDate: 'DESC' },
    });

    return {
      symbol: symbol.toUpperCase(),
      currentIV: ivRankResult.currentIV,
      ivRank: ivRankResult.ivRank,
      ivPercentile: ivRankResult.ivPercentile,
      iv52WeekHigh: ivRankResult.iv52WeekHigh,
      iv52WeekLow: ivRankResult.iv52WeekLow,
      hv20: comparisonResult.hv20,
      hv30: comparisonResult.hv30,
      hv60: comparisonResult.hv60,
      ivHvSpread: comparisonResult.ivHvSpread,
      underlyingPrice: quote?.last ?? null,
      lastUpdated: latestSnapshot?.createdAt ?? null,
    };
  }

  /**
   * Get historical volatility snapshots for charting
   */
  async getVolatilityHistory(
    symbol: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<VolatilitySnapshot[]> {
    const upperSymbol = symbol.toUpperCase();

    const whereClause: {
      symbol: string;
      snapshotDate?: ReturnType<typeof Between>;
    } = {
      symbol: upperSymbol,
    };

    if (startDate && endDate) {
      whereClause.snapshotDate = Between(startDate, endDate);
    } else if (startDate) {
      whereClause.snapshotDate = Between(startDate, new Date());
    } else {
      // Default to 1 year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      whereClause.snapshotDate = Between(oneYearAgo, new Date());
    }

    return this.volatilityRepo.find({
      where: whereClause,
      order: { snapshotDate: 'ASC' },
    });
  }

  /**
   * Cleanup old snapshots (keep only 52 weeks + buffer)
   */
  async cleanupOldSnapshots(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 400); // Keep ~13 months

    const result = await this.volatilityRepo.delete({
      snapshotDate: LessThanOrEqual(cutoffDate),
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} old volatility snapshots`);
    }

    return result.affected || 0;
  }
}
