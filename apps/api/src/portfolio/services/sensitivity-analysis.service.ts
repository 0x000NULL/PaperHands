import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OptionPosition } from '../entities/option-position.entity';
import { TradierService } from '../../market-data/tradier.service';
import {
  GreeksSnapshot,
  SensitivityCalculator,
} from '../domain/greeks-snapshot';

/**
 * Single sensitivity scenario with price and IV changes.
 */
export interface SensitivityScenario {
  priceChange: number; // Percentage change in underlying price
  ivChange: number; // Percentage point change in IV
  newPrice: number; // Resulting underlying price
  newIV: number; // Resulting IV
  pnlEstimate: number; // Estimated P&L in dollars
  newDelta: number; // Estimated new portfolio delta
  newTheta: number; // Estimated new portfolio theta
}

/**
 * Sensitivity analysis result for a symbol.
 */
export interface SensitivityAnalysisResult {
  symbol: string;
  currentPrice: number;
  currentIV: number;
  scenarios: SensitivityScenario[];
}

/**
 * Delta exposure at a specific price level.
 */
export interface DeltaExposurePoint {
  priceLevel: number;
  percentChange: number;
  portfolioPnL: number;
  deltaDollars: number;
}

/**
 * Theta decay projection for a specific day.
 */
export interface ThetaDecayPoint {
  date: string;
  dailyDecay: number;
  cumulativeDecay: number;
  remainingPositions: number;
}

/**
 * Service for sensitivity analysis and what-if scenarios.
 *
 * Uses the SensitivityCalculator domain object for pure calculations.
 * Provides:
 * - Multi-scenario sensitivity analysis (price + IV changes)
 * - Delta exposure analysis across price levels
 * - Theta decay projections over time
 */
@Injectable()
export class SensitivityAnalysisService {
  private readonly logger = new Logger(SensitivityAnalysisService.name);

  constructor(
    @InjectRepository(OptionPosition)
    private readonly optionPositionRepository: Repository<OptionPosition>,
    private readonly tradierService: TradierService,
  ) {}

  /**
   * Get sensitivity analysis for positions on a specific underlying.
   *
   * @param userId - User ID
   * @param symbol - Underlying symbol
   * @param priceChanges - Array of price change percentages to analyze
   * @param ivChanges - Array of IV change percentage points to analyze
   */
  async analyzeSymbolSensitivity(
    userId: string,
    symbol: string,
    priceChanges: number[] = [-10, -5, 0, 5, 10],
    ivChanges: number[] = [-10, 0, 10],
  ): Promise<SensitivityAnalysisResult> {
    const positions = await this.optionPositionRepository.find({
      where: { userId, underlyingSymbol: symbol },
    });

    const quote = await this.tradierService.getQuote(symbol);
    const currentPrice = quote.last;

    const optionSymbols = positions.map((p) => p.optionSymbol);
    const optionQuotes =
      optionSymbols.length > 0
        ? await this.tradierService.getOptionQuotes(optionSymbols)
        : new Map();

    // Calculate average current IV
    let totalIV = 0;
    let ivCount = 0;
    for (const position of positions) {
      const optQuote = optionQuotes.get(position.optionSymbol);
      const iv = optQuote?.greeks?.iv || position.greeksSnapshot?.iv || 0;
      if (iv > 0) {
        totalIV += iv;
        ivCount++;
      }
    }
    const currentIV = ivCount > 0 ? totalIV / ivCount : 0;

    const scenarios: SensitivityScenario[] = [];

    for (const priceChange of priceChanges) {
      for (const ivChange of ivChanges) {
        const scenario = this.calculateScenario(
          positions,
          optionQuotes,
          currentPrice,
          currentIV,
          priceChange,
          ivChange,
        );
        scenarios.push(scenario);
      }
    }

    return {
      symbol,
      currentPrice,
      currentIV,
      scenarios,
    };
  }

  /**
   * Get delta exposure analysis at various price levels.
   *
   * @param userId - User ID
   * @param symbol - Optional: filter by underlying symbol
   */
  async analyzeDeltaExposure(
    userId: string,
    symbol?: string,
  ): Promise<DeltaExposurePoint[]> {
    let positions = await this.optionPositionRepository.find({
      where: { userId },
    });

    if (symbol) {
      positions = positions.filter((p) => p.underlyingSymbol === symbol);
    }

    if (positions.length === 0) {
      return [];
    }

    // Get current prices
    const underlyingSymbols = [
      ...new Set(positions.map((p) => p.underlyingSymbol)),
    ];
    const underlyingQuotes =
      await this.tradierService.getQuotes(underlyingSymbols);
    const currentPrices = new Map(
      underlyingQuotes.map((q) => [q.symbol, q.last]),
    );

    const optionSymbols = positions.map((p) => p.optionSymbol);
    const quotes = await this.tradierService.getOptionQuotes(optionSymbols);

    // Calculate delta exposure at various price levels
    const priceChanges = [-20, -15, -10, -5, -2, 0, 2, 5, 10, 15, 20];
    const exposures: DeltaExposurePoint[] = [];

    // Calculate average current price for display
    const avgCurrentPrice =
      Array.from(currentPrices.values()).reduce((a, b) => a + b, 0) /
      Math.max(currentPrices.size, 1);

    for (const changePercent of priceChanges) {
      let totalDeltaDollars = 0;
      let portfolioPnL = 0;

      for (const position of positions) {
        const quote = quotes.get(position.optionSymbol);
        const rawGreeks = quote?.greeks || position.greeksSnapshot;
        const currentPrice = currentPrices.get(position.underlyingSymbol) || 0;

        if (!rawGreeks || !currentPrice) continue;

        const greeks = GreeksSnapshot.fromRaw(rawGreeks);
        const qty = Number(position.quantity);
        const multiplier = SensitivityCalculator.CONTRACT_MULTIPLIER;
        const priceChange = (currentPrice * changePercent) / 100;
        const newPrice = currentPrice + priceChange;

        // Calculate P&L using domain calculator
        const pnl = SensitivityCalculator.estimatePriceChangePnL(
          greeks,
          priceChange,
          qty,
          multiplier,
        );

        portfolioPnL += pnl;
        totalDeltaDollars += greeks.delta * qty * multiplier * newPrice;
      }

      exposures.push({
        priceLevel: avgCurrentPrice + (avgCurrentPrice * changePercent) / 100,
        percentChange: changePercent,
        portfolioPnL,
        deltaDollars: totalDeltaDollars,
      });
    }

    return exposures;
  }

  /**
   * Project theta decay over the next N days.
   *
   * @param userId - User ID
   * @param days - Number of days to project
   */
  async projectThetaDecay(
    userId: string,
    days: number = 30,
  ): Promise<ThetaDecayPoint[]> {
    const positions = await this.optionPositionRepository.find({
      where: { userId },
    });

    if (positions.length === 0) {
      return [];
    }

    const optionSymbols = positions.map((p) => p.optionSymbol);
    const quotes = await this.tradierService.getOptionQuotes(optionSymbols);

    const now = new Date();
    const projections: ThetaDecayPoint[] = [];
    let cumulativeDecay = 0;

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      let dailyTheta = 0;
      let remainingPositions = 0;

      for (const position of positions) {
        const expDate = new Date(position.expirationDate);
        const daysToExp = Math.ceil(
          (expDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Only count positions that haven't expired
        if (daysToExp > 0) {
          remainingPositions++;

          const quote = quotes.get(position.optionSymbol);
          const rawGreeks = quote?.greeks || position.greeksSnapshot;

          if (rawGreeks) {
            const qty = Number(position.quantity);
            const multiplier = SensitivityCalculator.CONTRACT_MULTIPLIER;
            // Theta is typically negative, so we take absolute value for "decay"
            dailyTheta += Math.abs(
              SensitivityCalculator.calculateDailyDecay(
                rawGreeks.theta,
                qty,
                multiplier,
              ),
            );
          }
        }
      }

      cumulativeDecay += dailyTheta;

      projections.push({
        date: dateStr,
        dailyDecay: dailyTheta,
        cumulativeDecay,
        remainingPositions,
      });
    }

    return projections;
  }

  /**
   * Calculate a single sensitivity scenario.
   */
  private calculateScenario(
    positions: OptionPosition[],
    optionQuotes: Map<string, any>,
    currentPrice: number,
    currentIV: number,
    priceChangePercent: number,
    ivChangePercent: number,
  ): SensitivityScenario {
    const newPrice = currentPrice * (1 + priceChangePercent / 100);
    const priceDiff = newPrice - currentPrice;

    let totalPnL = 0;
    let newDelta = 0;
    let newTheta = 0;

    for (const position of positions) {
      const optQuote = optionQuotes.get(position.optionSymbol);
      const rawGreeks = optQuote?.greeks || position.greeksSnapshot;

      if (!rawGreeks) continue;

      const greeks = GreeksSnapshot.fromRaw(rawGreeks);
      const qty = Number(position.quantity);
      const multiplier = SensitivityCalculator.CONTRACT_MULTIPLIER;

      // Price change P&L
      const pricePnL = SensitivityCalculator.estimatePriceChangePnL(
        greeks,
        priceDiff,
        qty,
        multiplier,
      );

      // IV change P&L
      const ivPnL = SensitivityCalculator.estimateIVChangePnL(
        greeks,
        ivChangePercent,
        qty,
        multiplier,
      );

      totalPnL += pricePnL + ivPnL;

      // Estimate new Greeks
      const estimatedNewDelta = SensitivityCalculator.estimateNewDelta(
        greeks.delta,
        greeks.gamma,
        priceDiff,
      );
      newDelta += estimatedNewDelta * qty * multiplier;
      newTheta += greeks.theta * qty * multiplier;
    }

    // Calculate new IV
    const newIV = currentIV * (1 + ivChangePercent / 100);

    return {
      priceChange: priceChangePercent,
      ivChange: ivChangePercent,
      newPrice,
      newIV,
      pnlEstimate: totalPnL,
      newDelta,
      newTheta,
    };
  }
}
