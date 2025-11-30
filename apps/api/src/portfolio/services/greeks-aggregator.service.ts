import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OptionPosition } from '../entities/option-position.entity';
import { Position } from '../entities/position.entity';
import { TradierService } from '../../market-data/tradier.service';
import {
  GreeksSnapshot,
  SensitivityCalculator,
} from '../domain/greeks-snapshot';

/**
 * Aggregated position Greeks after scaling by quantity and contract multiplier.
 */
export interface AggregatedPositionGreeks {
  optionSymbol: string;
  underlyingSymbol: string;
  optionType: 'call' | 'put';
  strikePrice: number;
  expirationDate: string;
  quantity: number;
  marketValue: number;
  daysToExpiration: number;
  greeks: GreeksSnapshot;
}

/**
 * Greeks grouped by expiration date.
 */
export interface ExpirationBucket {
  expirationDate: string;
  daysToExpiration: number;
  positionCount: number;
  netDelta: number;
  netTheta: number;
}

/**
 * Greeks grouped by underlying symbol.
 */
export interface UnderlyingGreeksGroup {
  underlyingSymbol: string;
  underlyingPrice: number;
  positions: AggregatedPositionGreeks[];
  totalGreeks: GreeksSnapshot;
  stockPosition?: {
    quantity: number;
    marketValue: number;
    delta: number; // Stock has delta of 1 per share
  };
}

/**
 * Portfolio-level aggregated Greeks summary.
 */
export interface AggregatedGreeksSummary {
  totalGreeks: GreeksSnapshot;
  longDelta: number;
  shortDelta: number;
  totalDailyDecay: number;
  weeklyDecayProjection: number;
  totalPositions: number;
  notionalExposure: number;
  byExpiration: ExpirationBucket[];
  byUnderlying: UnderlyingGreeksGroup[];
}

/**
 * Service responsible for aggregating Greeks across positions.
 *
 * This service:
 * - Fetches fresh Greeks from market data
 * - Uses GreeksSnapshot domain object for calculations
 * - Aggregates by expiration and underlying
 * - Calculates notional exposure
 */
@Injectable()
export class GreeksAggregatorService {
  private readonly logger = new Logger(GreeksAggregatorService.name);

  constructor(
    @InjectRepository(OptionPosition)
    private readonly optionPositionRepository: Repository<OptionPosition>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    private readonly tradierService: TradierService,
  ) {}

  /**
   * Aggregate Greeks for a user's entire portfolio.
   */
  async aggregatePortfolioGreeks(
    userId: string,
  ): Promise<AggregatedGreeksSummary> {
    const optionPositions = await this.optionPositionRepository.find({
      where: { userId },
    });

    const stockPositions = await this.positionRepository.find({
      where: { userId },
    });

    if (optionPositions.length === 0 && stockPositions.length === 0) {
      return this.emptyAggregation();
    }

    // Fetch fresh Greeks
    const optionSymbols = optionPositions.map((p) => p.optionSymbol);
    const quotes =
      optionSymbols.length > 0
        ? await this.tradierService.getOptionQuotes(optionSymbols)
        : new Map();

    // Fetch underlying prices
    const underlyingSymbols = [
      ...new Set([
        ...optionPositions.map((p) => p.underlyingSymbol),
        ...stockPositions.map((p) => p.symbol),
      ]),
    ];
    const underlyingQuotes =
      underlyingSymbols.length > 0
        ? await this.tradierService.getQuotes(underlyingSymbols)
        : [];
    const underlyingPrices = new Map(
      underlyingQuotes.map((q) => [q.symbol, q.last]),
    );

    const now = new Date();
    let totalGreeks = GreeksSnapshot.empty();
    let longDelta = 0;
    let shortDelta = 0;
    let notionalExposure = 0;

    const expirationMap = new Map<
      string,
      { delta: number; theta: number; count: number }
    >();
    const underlyingMap = new Map<string, UnderlyingGreeksGroup>();

    // Initialize with stock positions (stocks have delta of 1 per share)
    for (const stockPos of stockPositions) {
      const price = underlyingPrices.get(stockPos.symbol) || 0;
      const qty = Number(stockPos.quantity);
      const stockDelta = qty; // Each share has delta of 1

      underlyingMap.set(stockPos.symbol, {
        underlyingSymbol: stockPos.symbol,
        underlyingPrice: price,
        positions: [],
        totalGreeks: new GreeksSnapshot(stockDelta, 0, 0, 0, 0, 0),
        stockPosition: {
          quantity: qty,
          marketValue: qty * price,
          delta: stockDelta,
        },
      });

      // Add stock delta to totals
      totalGreeks = totalGreeks.accumulate(
        new GreeksSnapshot(stockDelta, 0, 0, 0, 0, 0),
      );
      if (stockDelta > 0) {
        longDelta += stockDelta;
      } else {
        shortDelta += Math.abs(stockDelta);
      }
      notionalExposure += Math.abs(stockDelta) * price;
    }

    // Process option positions
    for (const position of optionPositions) {
      const quote = quotes.get(position.optionSymbol);
      const rawGreeks = quote?.greeks || position.greeksSnapshot;

      if (!rawGreeks) continue;

      const qty = Number(position.quantity);
      const multiplier = SensitivityCalculator.CONTRACT_MULTIPLIER;
      const underlyingPrice =
        underlyingPrices.get(position.underlyingSymbol) || 0;

      // Create scaled Greeks snapshot
      const positionGreeks = GreeksSnapshot.fromRaw(rawGreeks).scale(
        qty * multiplier,
      );

      // Accumulate totals
      totalGreeks = totalGreeks.accumulate(positionGreeks);

      if (positionGreeks.delta > 0) {
        longDelta += positionGreeks.delta;
      } else {
        shortDelta += Math.abs(positionGreeks.delta);
      }

      notionalExposure += Math.abs(positionGreeks.delta) * underlyingPrice;

      // Group by expiration
      const expDateStr = new Date(position.expirationDate)
        .toISOString()
        .split('T')[0];
      const existing = expirationMap.get(expDateStr) || {
        delta: 0,
        theta: 0,
        count: 0,
      };
      existing.delta += positionGreeks.delta;
      existing.theta += positionGreeks.theta;
      existing.count++;
      expirationMap.set(expDateStr, existing);

      // Group by underlying
      let underlyingGroup = underlyingMap.get(position.underlyingSymbol);
      if (!underlyingGroup) {
        underlyingGroup = {
          underlyingSymbol: position.underlyingSymbol,
          underlyingPrice,
          positions: [],
          totalGreeks: GreeksSnapshot.empty(),
        };
        underlyingMap.set(position.underlyingSymbol, underlyingGroup);
      }

      const expDate = new Date(position.expirationDate);
      const daysToExpiration = Math.ceil(
        (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const price = quote ? (quote.bid + quote.ask) / 2 : 0;

      underlyingGroup.positions.push({
        optionSymbol: position.optionSymbol,
        underlyingSymbol: position.underlyingSymbol,
        optionType: position.optionType as 'call' | 'put',
        strikePrice: Number(position.strikePrice),
        expirationDate: expDateStr,
        quantity: qty,
        marketValue: price * Math.abs(qty) * multiplier,
        daysToExpiration,
        greeks: positionGreeks,
      });

      underlyingGroup.totalGreeks =
        underlyingGroup.totalGreeks.accumulate(positionGreeks);
    }

    // Build expiration buckets
    const byExpiration: ExpirationBucket[] = [];
    for (const [dateStr, data] of expirationMap) {
      const expDate = new Date(dateStr);
      const daysToExpiration = Math.ceil(
        (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      byExpiration.push({
        expirationDate: dateStr,
        daysToExpiration,
        positionCount: data.count,
        netDelta: data.delta,
        netTheta: data.theta,
      });
    }

    // Sort by expiration date
    byExpiration.sort(
      (a, b) =>
        new Date(a.expirationDate).getTime() -
        new Date(b.expirationDate).getTime(),
    );

    // Sort underlying groups by symbol
    const byUnderlying = Array.from(underlyingMap.values()).sort((a, b) =>
      a.underlyingSymbol.localeCompare(b.underlyingSymbol),
    );

    return {
      totalGreeks,
      longDelta,
      shortDelta,
      totalDailyDecay: totalGreeks.theta,
      weeklyDecayProjection: totalGreeks.theta * 5, // 5 trading days
      totalPositions: optionPositions.length,
      notionalExposure,
      byExpiration,
      byUnderlying,
    };
  }

  /**
   * Get aggregated Greeks for a specific underlying symbol.
   */
  async aggregateByUnderlying(
    userId: string,
    symbol: string,
  ): Promise<UnderlyingGreeksGroup | null> {
    const summary = await this.aggregatePortfolioGreeks(userId);
    return (
      summary.byUnderlying.find((g) => g.underlyingSymbol === symbol) || null
    );
  }

  /**
   * Get aggregated Greeks for positions expiring on a specific date.
   */
  async aggregateByExpiration(
    userId: string,
    expirationDate: string,
  ): Promise<AggregatedPositionGreeks[]> {
    const summary = await this.aggregatePortfolioGreeks(userId);
    const positions: AggregatedPositionGreeks[] = [];

    for (const underlying of summary.byUnderlying) {
      for (const position of underlying.positions) {
        if (position.expirationDate === expirationDate) {
          positions.push(position);
        }
      }
    }

    return positions;
  }

  private emptyAggregation(): AggregatedGreeksSummary {
    return {
      totalGreeks: GreeksSnapshot.empty(),
      longDelta: 0,
      shortDelta: 0,
      totalDailyDecay: 0,
      weeklyDecayProjection: 0,
      totalPositions: 0,
      notionalExposure: 0,
      byExpiration: [],
      byUnderlying: [],
    };
  }
}
