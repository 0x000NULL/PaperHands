import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OptionPosition } from '../entities/option-position.entity';
import { Position } from '../entities/position.entity';
import { User } from '../../users/entities/user.entity';
import { TradierService } from '../../market-data/tradier.service';
import {
  GreeksAggregatorService,
  UnderlyingGreeksGroup,
} from './greeks-aggregator.service';
import { SensitivityAnalysisService } from './sensitivity-analysis.service';

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  iv: number;
}

export interface PortfolioGreeksSummary {
  // Total Greeks (sum across all positions)
  netDelta: number; // Share equivalents
  netGamma: number; // Delta change per $1
  netTheta: number; // Daily decay in dollars
  netVega: number; // Per 1% IV change
  netRho: number; // Per 1% interest rate change

  // Delta exposure
  longDelta: number; // Sum of positive deltas
  shortDelta: number; // Sum of negative deltas

  // Theta breakdown
  totalDailyDecay: number;
  weeklyDecayProjection: number;

  // Portfolio summary
  totalPositions: number;
  positionsByExpiration: ExpirationBucket[];

  // Notional exposure
  notionalExposure: number; // Dollar exposure based on delta
}

export interface ExpirationBucket {
  expirationDate: string;
  daysToExpiration: number;
  positionCount: number;
  netDelta: number;
  netTheta: number;
}

export interface UnderlyingGreeks {
  underlyingSymbol: string;
  underlyingPrice: number;
  positions: PositionGreeks[];
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  stockPosition?: {
    quantity: number;
    marketValue: number;
  };
}

export interface PositionGreeks {
  optionSymbol: string;
  optionType: 'call' | 'put';
  strikePrice: number;
  expirationDate: string;
  quantity: number;
  marketValue: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  iv: number;
  daysToExpiration: number;
}

export interface ThetaProjection {
  date: string;
  cumulativeDecay: number;
  dailyDecay: number;
  remainingPositions: number;
}

export interface DeltaExposure {
  priceLevel: number;
  percentChange: number;
  portfolioPnL: number;
  deltaDollars: number;
}

export interface SensitivityResult {
  symbol: string;
  currentPrice: number;
  scenarios: SensitivityScenario[];
}

export interface SensitivityScenario {
  priceChange: number;
  ivChange: number;
  newPrice: number;
  newIV: number;
  pnlEstimate: number;
  newDelta: number;
  newTheta: number;
}

/**
 * Public-facing service for portfolio Greeks.
 *
 * This service acts as a facade, delegating to:
 * - GreeksAggregatorService for aggregation logic
 * - SensitivityAnalysisService for what-if scenarios
 *
 * Maintains the existing public API for backward compatibility.
 */
@Injectable()
export class PortfolioGreeksService {
  private readonly logger = new Logger(PortfolioGreeksService.name);

  constructor(
    @InjectRepository(OptionPosition)
    private optionPositionRepository: Repository<OptionPosition>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private tradierService: TradierService,
    private readonly aggregator: GreeksAggregatorService,
    private readonly sensitivityAnalysis: SensitivityAnalysisService,
  ) {}

  /**
   * Get aggregated portfolio Greeks summary.
   * Delegates to GreeksAggregatorService.
   */
  async getPortfolioGreeks(userId: string): Promise<PortfolioGreeksSummary> {
    const aggregation = await this.aggregator.aggregatePortfolioGreeks(userId);

    return {
      netDelta: aggregation.totalGreeks.delta,
      netGamma: aggregation.totalGreeks.gamma,
      netTheta: aggregation.totalGreeks.theta,
      netVega: aggregation.totalGreeks.vega,
      netRho: aggregation.totalGreeks.rho,
      longDelta: aggregation.longDelta,
      shortDelta: aggregation.shortDelta,
      totalDailyDecay: aggregation.totalDailyDecay,
      weeklyDecayProjection: aggregation.weeklyDecayProjection,
      totalPositions: aggregation.totalPositions,
      positionsByExpiration: aggregation.byExpiration,
      notionalExposure: aggregation.notionalExposure,
    };
  }

  /**
   * Get Greeks grouped by underlying symbol.
   * Delegates to GreeksAggregatorService.
   */
  async getGreeksByUnderlying(userId: string): Promise<UnderlyingGreeks[]> {
    const aggregation = await this.aggregator.aggregatePortfolioGreeks(userId);

    // Transform aggregator result to public API format
    return aggregation.byUnderlying.map((group) => {
      const positions: PositionGreeks[] = group.positions.map((p) => ({
        optionSymbol: p.optionSymbol,
        optionType: p.optionType,
        strikePrice: p.strikePrice,
        expirationDate: p.expirationDate,
        quantity: p.quantity,
        marketValue: p.marketValue,
        delta: p.greeks.delta,
        gamma: p.greeks.gamma,
        theta: p.greeks.theta,
        vega: p.greeks.vega,
        rho: p.greeks.rho,
        iv: p.greeks.iv,
        daysToExpiration: p.daysToExpiration,
      }));

      return {
        underlyingSymbol: group.underlyingSymbol,
        underlyingPrice: group.underlyingPrice,
        positions,
        totalDelta: group.totalGreeks.delta,
        totalGamma: group.totalGreeks.gamma,
        totalTheta: group.totalGreeks.theta,
        totalVega: group.totalGreeks.vega,
        stockPosition: group.stockPosition,
      };
    });
  }

  /**
   * Get theta decay projection over the next N days.
   * Delegates to SensitivityAnalysisService.
   */
  async getThetaDecayProjection(
    userId: string,
    days: number = 30,
  ): Promise<ThetaProjection[]> {
    const projections = await this.sensitivityAnalysis.projectThetaDecay(
      userId,
      days,
    );

    return projections.map((p) => ({
      date: p.date,
      dailyDecay: p.dailyDecay,
      cumulativeDecay: p.cumulativeDecay,
      remainingPositions: p.remainingPositions,
    }));
  }

  /**
   * Get delta exposure analysis at various price levels.
   * Delegates to SensitivityAnalysisService.
   */
  async getDeltaExposureAnalysis(
    userId: string,
    symbol?: string,
  ): Promise<DeltaExposure[]> {
    const exposures = await this.sensitivityAnalysis.analyzeDeltaExposure(
      userId,
      symbol,
    );

    return exposures.map((e) => ({
      priceLevel: e.priceLevel,
      percentChange: e.percentChange,
      portfolioPnL: e.portfolioPnL,
      deltaDollars: e.deltaDollars,
    }));
  }

  /**
   * Get sensitivity analysis for a specific underlying.
   * Delegates to SensitivityAnalysisService.
   */
  async getGreeksSensitivity(
    userId: string,
    symbol: string,
    priceChanges: number[] = [-10, -5, 0, 5, 10],
    ivChanges: number[] = [-10, 0, 10],
  ): Promise<SensitivityResult> {
    const result = await this.sensitivityAnalysis.analyzeSymbolSensitivity(
      userId,
      symbol,
      priceChanges,
      ivChanges,
    );

    return {
      symbol: result.symbol,
      currentPrice: result.currentPrice,
      scenarios: result.scenarios.map((s) => ({
        priceChange: s.priceChange,
        ivChange: s.ivChange,
        newPrice: s.newPrice,
        newIV: s.newIV,
        pnlEstimate: s.pnlEstimate,
        newDelta: s.newDelta,
        newTheta: s.newTheta,
      })),
    };
  }

  private emptyGreeksSummary(): PortfolioGreeksSummary {
    return {
      netDelta: 0,
      netGamma: 0,
      netTheta: 0,
      netVega: 0,
      netRho: 0,
      longDelta: 0,
      shortDelta: 0,
      totalDailyDecay: 0,
      weeklyDecayProjection: 0,
      totalPositions: 0,
      positionsByExpiration: [],
      notionalExposure: 0,
    };
  }
}
