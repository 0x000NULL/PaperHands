import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OptionPosition } from '../entities/option-position.entity';
import { Position } from '../entities/position.entity';
import { User } from '../../users/entities/user.entity';
import { TradierService } from '../../market-data/tradier.service';

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
  ) {}

  /**
   * Get aggregated portfolio Greeks summary
   */
  async getPortfolioGreeks(userId: string): Promise<PortfolioGreeksSummary> {
    const positions = await this.optionPositionRepository.find({
      where: { userId },
    });

    if (positions.length === 0) {
      return this.emptyGreeksSummary();
    }

    // Fetch fresh Greeks for all positions
    const optionSymbols = positions.map((p) => p.optionSymbol);
    const quotes = await this.tradierService.getOptionQuotes(optionSymbols);

    // Get underlying prices for notional calculation
    const underlyingSymbols = [
      ...new Set(positions.map((p) => p.underlyingSymbol)),
    ];
    const underlyingQuotes =
      await this.tradierService.getQuotes(underlyingSymbols);
    const underlyingPrices = new Map(
      underlyingQuotes.map((q) => [q.symbol, q.last]),
    );

    let netDelta = 0;
    let netGamma = 0;
    let netTheta = 0;
    let netVega = 0;
    let netRho = 0;
    let longDelta = 0;
    let shortDelta = 0;
    let notionalExposure = 0;

    const expirationMap = new Map<
      string,
      { delta: number; theta: number; count: number }
    >();
    const now = new Date();

    for (const position of positions) {
      const quote = quotes.get(position.optionSymbol);
      const greeks = quote?.greeks || position.greeksSnapshot;

      if (!greeks) continue;

      const qty = Number(position.quantity);
      const multiplier = 100;

      // Aggregate Greeks (multiply by quantity and multiplier)
      const posDelta = greeks.delta * qty * multiplier;
      const posGamma = greeks.gamma * qty * multiplier;
      const posTheta = greeks.theta * qty * multiplier;
      const posVega = greeks.vega * qty * multiplier;
      const posRho = greeks.rho * qty * multiplier;

      netDelta += posDelta;
      netGamma += posGamma;
      netTheta += posTheta;
      netVega += posVega;
      netRho += posRho;

      if (posDelta > 0) {
        longDelta += posDelta;
      } else {
        shortDelta += Math.abs(posDelta);
      }

      // Calculate notional exposure
      const underlyingPrice =
        underlyingPrices.get(position.underlyingSymbol) || 0;
      notionalExposure += Math.abs(posDelta) * underlyingPrice;

      // Group by expiration
      const expDateStr = new Date(position.expirationDate)
        .toISOString()
        .split('T')[0];
      const existing = expirationMap.get(expDateStr) || {
        delta: 0,
        theta: 0,
        count: 0,
      };
      existing.delta += posDelta;
      existing.theta += posTheta;
      existing.count++;
      expirationMap.set(expDateStr, existing);
    }

    // Build expiration buckets
    const positionsByExpiration: ExpirationBucket[] = [];
    for (const [dateStr, data] of expirationMap) {
      const expDate = new Date(dateStr);
      const daysToExpiration = Math.ceil(
        (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      positionsByExpiration.push({
        expirationDate: dateStr,
        daysToExpiration,
        positionCount: data.count,
        netDelta: data.delta,
        netTheta: data.theta,
      });
    }

    // Sort by expiration date
    positionsByExpiration.sort(
      (a, b) =>
        new Date(a.expirationDate).getTime() -
        new Date(b.expirationDate).getTime(),
    );

    return {
      netDelta,
      netGamma,
      netTheta,
      netVega,
      netRho,
      longDelta,
      shortDelta,
      totalDailyDecay: netTheta,
      weeklyDecayProjection: netTheta * 5, // 5 trading days
      totalPositions: positions.length,
      positionsByExpiration,
      notionalExposure,
    };
  }

  /**
   * Get Greeks grouped by underlying symbol
   */
  async getGreeksByUnderlying(userId: string): Promise<UnderlyingGreeks[]> {
    const optionPositions = await this.optionPositionRepository.find({
      where: { userId },
    });

    const stockPositions = await this.positionRepository.find({
      where: { userId },
    });

    if (optionPositions.length === 0 && stockPositions.length === 0) {
      return [];
    }

    // Fetch fresh quotes
    const optionSymbols = optionPositions.map((p) => p.optionSymbol);
    const quotes = await this.tradierService.getOptionQuotes(optionSymbols);

    const underlyingSymbols = [
      ...new Set([
        ...optionPositions.map((p) => p.underlyingSymbol),
        ...stockPositions.map((p) => p.symbol),
      ]),
    ];
    const underlyingQuotes =
      await this.tradierService.getQuotes(underlyingSymbols);
    const underlyingPrices = new Map(
      underlyingQuotes.map((q) => [q.symbol, q.last]),
    );

    const now = new Date();
    const underlyingMap = new Map<string, UnderlyingGreeks>();

    // Initialize with stock positions
    for (const stockPos of stockPositions) {
      const price = underlyingPrices.get(stockPos.symbol) || 0;
      underlyingMap.set(stockPos.symbol, {
        underlyingSymbol: stockPos.symbol,
        underlyingPrice: price,
        positions: [],
        totalDelta: Number(stockPos.quantity), // Stock has delta of 1 per share
        totalGamma: 0,
        totalTheta: 0,
        totalVega: 0,
        stockPosition: {
          quantity: Number(stockPos.quantity),
          marketValue: Number(stockPos.quantity) * price,
        },
      });
    }

    // Process option positions
    for (const position of optionPositions) {
      const quote = quotes.get(position.optionSymbol);
      const greeks = quote?.greeks || position.greeksSnapshot;
      const price = quote ? (quote.bid + quote.ask) / 2 : 0;

      if (!greeks) continue;

      const qty = Number(position.quantity);
      const multiplier = 100;
      const expDate = new Date(position.expirationDate);
      const daysToExpiration = Math.ceil(
        (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const positionGreeks: PositionGreeks = {
        optionSymbol: position.optionSymbol,
        optionType: position.optionType as 'call' | 'put',
        strikePrice: Number(position.strikePrice),
        expirationDate: expDate.toISOString().split('T')[0],
        quantity: qty,
        marketValue: price * Math.abs(qty) * multiplier,
        delta: greeks.delta * qty * multiplier,
        gamma: greeks.gamma * qty * multiplier,
        theta: greeks.theta * qty * multiplier,
        vega: greeks.vega * qty * multiplier,
        rho: greeks.rho * qty * multiplier,
        iv: greeks.iv,
        daysToExpiration,
      };

      let underlying = underlyingMap.get(position.underlyingSymbol);
      if (!underlying) {
        underlying = {
          underlyingSymbol: position.underlyingSymbol,
          underlyingPrice: underlyingPrices.get(position.underlyingSymbol) || 0,
          positions: [],
          totalDelta: 0,
          totalGamma: 0,
          totalTheta: 0,
          totalVega: 0,
        };
        underlyingMap.set(position.underlyingSymbol, underlying);
      }

      underlying.positions.push(positionGreeks);
      underlying.totalDelta += positionGreeks.delta;
      underlying.totalGamma += positionGreeks.gamma;
      underlying.totalTheta += positionGreeks.theta;
      underlying.totalVega += positionGreeks.vega;
    }

    return Array.from(underlyingMap.values()).sort((a, b) =>
      a.underlyingSymbol.localeCompare(b.underlyingSymbol),
    );
  }

  /**
   * Get theta decay projection over the next N days
   */
  async getThetaDecayProjection(
    userId: string,
    days: number = 30,
  ): Promise<ThetaProjection[]> {
    const positions = await this.optionPositionRepository.find({
      where: { userId },
    });

    if (positions.length === 0) {
      return [];
    }

    const optionSymbols = positions.map((p) => p.optionSymbol);
    const quotes = await this.tradierService.getOptionQuotes(optionSymbols);

    const now = new Date();
    const projections: ThetaProjection[] = [];
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
          const greeks = quote?.greeks || position.greeksSnapshot;

          if (greeks) {
            const qty = Number(position.quantity);
            const multiplier = 100;
            // Theta is typically negative (time decay), so we make it positive for "decay"
            dailyTheta += Math.abs(greeks.theta * qty * multiplier);
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
   * Get delta exposure analysis at various price levels
   */
  async getDeltaExposureAnalysis(
    userId: string,
    symbol?: string,
  ): Promise<DeltaExposure[]> {
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
    const exposures: DeltaExposure[] = [];

    for (const changePercent of priceChanges) {
      let totalDeltaDollars = 0;
      let portfolioPnL = 0;

      for (const position of positions) {
        const quote = quotes.get(position.optionSymbol);
        const greeks = quote?.greeks || position.greeksSnapshot;
        const currentPrice = currentPrices.get(position.underlyingSymbol) || 0;

        if (!greeks || !currentPrice) continue;

        const qty = Number(position.quantity);
        const multiplier = 100;
        const priceChange = (currentPrice * changePercent) / 100;
        const newPrice = currentPrice + priceChange;

        // Simplified P&L estimate using delta and gamma
        const deltaPnL = greeks.delta * priceChange * qty * multiplier;
        const gammaPnL =
          0.5 * greeks.gamma * Math.pow(priceChange, 2) * qty * multiplier;

        portfolioPnL += deltaPnL + gammaPnL;
        totalDeltaDollars += greeks.delta * qty * multiplier * newPrice;
      }

      const avgCurrentPrice =
        Array.from(currentPrices.values()).reduce((a, b) => a + b, 0) /
        currentPrices.size;

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
   * Get sensitivity analysis for a specific underlying
   */
  async getGreeksSensitivity(
    userId: string,
    symbol: string,
    priceChanges: number[] = [-10, -5, 0, 5, 10],
    ivChanges: number[] = [-10, 0, 10],
  ): Promise<SensitivityResult> {
    const positions = await this.optionPositionRepository.find({
      where: { userId, underlyingSymbol: symbol },
    });

    const quote = await this.tradierService.getQuote(symbol);
    const currentPrice = quote.last;

    const optionSymbols = positions.map((p) => p.optionSymbol);
    const optionQuotes =
      await this.tradierService.getOptionQuotes(optionSymbols);

    const scenarios: SensitivityScenario[] = [];

    for (const priceChange of priceChanges) {
      for (const ivChange of ivChanges) {
        const newPrice = currentPrice * (1 + priceChange / 100);
        let totalPnL = 0;
        let newDelta = 0;
        let newTheta = 0;

        for (const position of positions) {
          const optQuote = optionQuotes.get(position.optionSymbol);
          const greeks = optQuote?.greeks || position.greeksSnapshot;

          if (!greeks) continue;

          const qty = Number(position.quantity);
          const multiplier = 100;
          const priceDiff = newPrice - currentPrice;

          // Simplified Greeks sensitivity:
          // Delta P&L + 0.5 * Gamma * price^2 + Vega * IV change
          const deltaPnL = greeks.delta * priceDiff * qty * multiplier;
          const gammaPnL =
            0.5 * greeks.gamma * Math.pow(priceDiff, 2) * qty * multiplier;
          const vegaPnL =
            greeks.vega * (ivChange / 100) * qty * multiplier * 100;

          totalPnL += deltaPnL + gammaPnL + vegaPnL;

          // Simplified new Greeks estimate
          // Delta changes by gamma * price change
          newDelta +=
            (greeks.delta + greeks.gamma * priceDiff) * qty * multiplier;
          newTheta += greeks.theta * qty * multiplier;
        }

        const avgNewIV =
          positions.reduce((sum, p) => {
            const q = optionQuotes.get(p.optionSymbol);
            return sum + (q?.greeks?.iv || 0) * (1 + ivChange / 100);
          }, 0) / Math.max(positions.length, 1);

        scenarios.push({
          priceChange,
          ivChange,
          newPrice,
          newIV: avgNewIV,
          pnlEstimate: totalPnL,
          newDelta,
          newTheta,
        });
      }
    }

    return {
      symbol,
      currentPrice,
      scenarios,
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
