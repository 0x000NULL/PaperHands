import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Position } from '../portfolio/entities/position.entity';
import { TaxLot } from '../portfolio/entities/tax-lot.entity';
import { LotSale } from '../portfolio/entities/lot-sale.entity';
import { PortfolioSnapshot } from './entities/portfolio-snapshot.entity';
import { User } from '../users/entities/user.entity';
import { FinnhubService } from '../market-data/finnhub.service';
import { TaxLotService } from '../portfolio/services/tax-lot.service';
import { GainType } from '../portfolio/enums/cost-basis.enums';

export type AnalyticsPeriod = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

export interface PerformanceDataPoint {
  date: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface TradeStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  totalRealized: number;
  maxDrawdown: number;
  sharpeRatio: number | null;
}

export interface AllocationItem {
  symbol: string;
  quantity: number;
  marketValue: number;
  costBasis: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  allocation: number; // percentage of portfolio
  sector?: string;
}

export interface GainsSummary {
  realizedGain: number;
  unrealizedGain: number;
  totalGain: number;
  shortTermRealized: number;
  longTermRealized: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(TaxLot)
    private taxLotRepository: Repository<TaxLot>,
    @InjectRepository(LotSale)
    private lotSaleRepository: Repository<LotSale>,
    @InjectRepository(PortfolioSnapshot)
    private snapshotRepository: Repository<PortfolioSnapshot>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private finnhubService: FinnhubService,
    private taxLotService: TaxLotService,
  ) {}

  /**
   * Get portfolio performance history
   */
  async getPerformanceHistory(
    userId: string,
    period: AnalyticsPeriod,
  ): Promise<PerformanceDataPoint[]> {
    const { startDate, endDate } = this.getPeriodDates(period);

    // Try to get snapshots first
    const snapshots = await this.snapshotRepository.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    if (snapshots.length > 0) {
      const firstValue = Number(snapshots[0].totalValue);
      return snapshots.map((s) => {
        const value = Number(s.totalValue);
        const change = value - firstValue;
        const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;
        return {
          date: s.date.toISOString().split('T')[0],
          value,
          change,
          changePercent,
        };
      });
    }

    // Fallback: reconstruct from orders
    return this.reconstructPerformanceFromOrders(userId, startDate, endDate);
  }

  /**
   * Get trade statistics
   */
  async getTradeStatistics(userId: string): Promise<TradeStatistics> {
    // Get all realized trades from lot sales
    const lotSales = await this.lotSaleRepository.find({
      where: { userId },
      order: { soldAt: 'ASC' },
    });

    if (lotSales.length === 0) {
      return this.getEmptyStatistics();
    }

    const gains = lotSales.filter((s) => Number(s.realizedGain) > 0);
    const losses = lotSales.filter((s) => Number(s.realizedGain) < 0);

    const totalWins = gains.reduce((sum, s) => sum + Number(s.realizedGain), 0);
    const totalLosses = Math.abs(
      losses.reduce((sum, s) => sum + Number(s.realizedGain), 0),
    );

    const winRate =
      lotSales.length > 0 ? (gains.length / lotSales.length) * 100 : 0;
    const avgWin = gains.length > 0 ? totalWins / gains.length : 0;
    const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;

    const largestWin =
      gains.length > 0
        ? Math.max(...gains.map((s) => Number(s.realizedGain)))
        : 0;
    const largestLoss =
      losses.length > 0
        ? Math.abs(Math.min(...losses.map((s) => Number(s.realizedGain))))
        : 0;

    const profitFactor =
      totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const totalRealized = totalWins - totalLosses;

    // Calculate max drawdown and Sharpe ratio from snapshots
    const { maxDrawdown, sharpeRatio } =
      await this.calculateRiskMetrics(userId);

    return {
      totalTrades: lotSales.length,
      winningTrades: gains.length,
      losingTrades: losses.length,
      winRate,
      avgWin,
      avgLoss,
      largestWin,
      largestLoss,
      profitFactor,
      totalRealized,
      maxDrawdown,
      sharpeRatio,
    };
  }

  /**
   * Get allocation breakdown
   */
  async getAllocationBreakdown(userId: string): Promise<AllocationItem[]> {
    const positions = await this.positionRepository.find({
      where: { userId },
    });

    if (positions.length === 0) {
      return [];
    }

    // Get current prices
    const symbols = positions.map((p) => p.symbol);
    const quotes = await Promise.all(
      symbols.map((s) => this.finnhubService.getQuote(s)),
    );

    const allocations: AllocationItem[] = [];
    let totalMarketValue = 0;

    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const quote = quotes[i];
      const currentPrice = quote?.last || Number(position.avgCostBasis);
      const quantity = Number(position.quantity);
      const costBasis = quantity * Number(position.avgCostBasis);
      const marketValue = quantity * currentPrice;
      const unrealizedGain = marketValue - costBasis;

      totalMarketValue += marketValue;

      allocations.push({
        symbol: position.symbol,
        quantity,
        marketValue,
        costBasis,
        unrealizedGain,
        unrealizedGainPercent:
          costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0,
        allocation: 0, // Will calculate after
        sector: undefined, // Could fetch from external API
      });
    }

    // Calculate allocation percentages
    for (const item of allocations) {
      item.allocation =
        totalMarketValue > 0 ? (item.marketValue / totalMarketValue) * 100 : 0;
    }

    // Sort by allocation descending
    return allocations.sort((a, b) => b.allocation - a.allocation);
  }

  /**
   * Get gains summary (realized + unrealized)
   */
  async getGainsSummary(userId: string): Promise<GainsSummary> {
    // Get unrealized gains from positions
    const positions = await this.positionRepository.find({
      where: { userId },
    });

    let unrealizedGain = 0;

    if (positions.length > 0) {
      const symbols = positions.map((p) => p.symbol);
      const quotes = await Promise.all(
        symbols.map((s) => this.finnhubService.getQuote(s)),
      );

      for (let i = 0; i < positions.length; i++) {
        const position = positions[i];
        const quote = quotes[i];
        const currentPrice = quote?.last || Number(position.avgCostBasis);
        const quantity = Number(position.quantity);
        const costBasis = quantity * Number(position.avgCostBasis);
        const marketValue = quantity * currentPrice;
        unrealizedGain += marketValue - costBasis;
      }
    }

    // Get realized gains from lot sales
    const realizedResult = await this.lotSaleRepository
      .createQueryBuilder('sale')
      .select('SUM(sale.realizedGain)', 'total')
      .addSelect('sale.gainType', 'gainType')
      .where('sale.userId = :userId', { userId })
      .groupBy('sale.gainType')
      .getRawMany();

    let shortTermRealized = 0;
    let longTermRealized = 0;

    for (const row of realizedResult as Array<{
      gainType: GainType;
      total: string | number;
    }>) {
      if (row.gainType === GainType.SHORT_TERM) {
        shortTermRealized = Number(row.total) || 0;
      } else {
        longTermRealized = Number(row.total) || 0;
      }
    }

    const realizedGain = shortTermRealized + longTermRealized;

    return {
      realizedGain,
      unrealizedGain,
      totalGain: realizedGain + unrealizedGain,
      shortTermRealized,
      longTermRealized,
    };
  }

  /**
   * Get benchmark comparison data
   */
  async getBenchmarkComparison(
    userId: string,
    benchmarkSymbol: string,
    period: AnalyticsPeriod,
  ): Promise<{
    portfolio: PerformanceDataPoint[];
    benchmark: PerformanceDataPoint[];
  }> {
    const portfolio = await this.getPerformanceHistory(userId, period);

    // Get benchmark historical data
    const timeframe = this.periodToTimeframe(period) as
      | '1D'
      | '1W'
      | '1M'
      | '3M'
      | '1Y'
      | '5Y';
    const benchmarkResponse = await this.finnhubService.getCandles(
      benchmarkSymbol,
      timeframe,
    );

    if (
      !benchmarkResponse ||
      !benchmarkResponse.candles ||
      benchmarkResponse.candles.length === 0
    ) {
      return { portfolio, benchmark: [] };
    }

    const candles = benchmarkResponse.candles;
    const firstPrice = candles[0].close;
    const benchmark: PerformanceDataPoint[] = candles.map((candle) => {
      const change = candle.close - firstPrice;
      const changePercent = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
      return {
        date: new Date(candle.timestamp * 1000).toISOString().split('T')[0],
        value: candle.close,
        change,
        changePercent,
      };
    });

    return { portfolio, benchmark };
  }

  /**
   * Create a portfolio snapshot (called by scheduled job)
   */
  async createDailySnapshot(userId: string): Promise<PortfolioSnapshot> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const positions = await this.positionRepository.find({
      where: { userId },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if snapshot already exists for today
    const existing = await this.snapshotRepository.findOne({
      where: { userId, date: today },
    });

    if (existing) {
      this.logger.log(
        `Snapshot already exists for user ${userId} on ${today.toISOString().split('T')[0]}`,
      );
      return existing;
    }

    let positionsValue = 0;
    const positionDetails: PortfolioSnapshot['positionDetails'] = [];

    if (positions.length > 0) {
      const symbols = positions.map((p) => p.symbol);
      const quotes = await Promise.all(
        symbols.map((s) => this.finnhubService.getQuote(s)),
      );

      for (let i = 0; i < positions.length; i++) {
        const position = positions[i];
        const quote = quotes[i];
        const currentPrice = quote?.last || Number(position.avgCostBasis);
        const quantity = Number(position.quantity);
        const costBasis = quantity * Number(position.avgCostBasis);
        const marketValue = quantity * currentPrice;

        positionsValue += marketValue;
        positionDetails.push({
          symbol: position.symbol,
          quantity,
          marketValue,
          price: currentPrice,
          costBasis,
          unrealizedGain: marketValue - costBasis,
        });
      }
    }

    const cashBalance = Number(user.cashBalance);
    const totalValue = cashBalance + positionsValue;

    const snapshot = this.snapshotRepository.create({
      userId,
      date: today,
      totalValue,
      cashBalance,
      positionsValue,
      positionDetails,
      isReconstructed: false,
    });

    return this.snapshotRepository.save(snapshot);
  }

  // ============ Private Helper Methods ============

  private getPeriodDates(period: AnalyticsPeriod): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '1W':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '1M':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'YTD':
        startDate.setMonth(0);
        startDate.setDate(1);
        break;
      case '1Y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'ALL':
        startDate.setFullYear(2000); // Far back enough
        break;
    }

    return { startDate, endDate };
  }

  private periodToTimeframe(period: AnalyticsPeriod): string {
    switch (period) {
      case '1W':
        return '1D';
      case '1M':
        return '1D';
      case '3M':
        return '1D';
      case 'YTD':
        return '1D';
      case '1Y':
        return '1D';
      case 'ALL':
        return '1M';
      default:
        return '1D';
    }
  }

  private async reconstructPerformanceFromOrders(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PerformanceDataPoint[]> {
    // Get user's starting cash balance
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return [];

    // For now, return a simple reconstruction
    // In production, you'd need to simulate the portfolio day by day
    const currentValue = Number(user.cashBalance);

    // Get positions value
    const positions = await this.positionRepository.find({
      where: { userId },
    });

    let positionsValue = 0;
    if (positions.length > 0) {
      const symbols = positions.map((p) => p.symbol);
      const quotes = await Promise.all(
        symbols.map((s) => this.finnhubService.getQuote(s)),
      );

      for (let i = 0; i < positions.length; i++) {
        const position = positions[i];
        const quote = quotes[i];
        const currentPrice = quote?.last || Number(position.avgCostBasis);
        positionsValue += Number(position.quantity) * currentPrice;
      }
    }

    const totalValue = currentValue + positionsValue;
    const startingValue = 100000; // Default starting balance

    return [
      {
        date: startDate.toISOString().split('T')[0],
        value: startingValue,
        change: 0,
        changePercent: 0,
      },
      {
        date: endDate.toISOString().split('T')[0],
        value: totalValue,
        change: totalValue - startingValue,
        changePercent: ((totalValue - startingValue) / startingValue) * 100,
      },
    ];
  }

  private async calculateRiskMetrics(
    userId: string,
  ): Promise<{ maxDrawdown: number; sharpeRatio: number | null }> {
    const snapshots = await this.snapshotRepository.find({
      where: { userId },
      order: { date: 'ASC' },
    });

    if (snapshots.length < 2) {
      return { maxDrawdown: 0, sharpeRatio: null };
    }

    // Calculate max drawdown
    let peak = Number(snapshots[0].totalValue);
    let maxDrawdown = 0;

    for (const snapshot of snapshots) {
      const value = Number(snapshot.totalValue);
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate daily returns for Sharpe ratio
    const dailyReturns: number[] = [];
    for (let i = 1; i < snapshots.length; i++) {
      const prevValue = Number(snapshots[i - 1].totalValue);
      const currValue = Number(snapshots[i].totalValue);
      if (prevValue > 0) {
        dailyReturns.push((currValue - prevValue) / prevValue);
      }
    }

    if (dailyReturns.length < 2) {
      return { maxDrawdown: maxDrawdown * 100, sharpeRatio: null };
    }

    // Calculate Sharpe ratio (assuming risk-free rate of 0 for simplicity)
    const avgReturn =
      dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
      dailyReturns.length;
    const stdDev = Math.sqrt(variance);

    // Annualize (252 trading days)
    const annualizedReturn = avgReturn * 252;
    const annualizedStdDev = stdDev * Math.sqrt(252);

    const sharpeRatio =
      annualizedStdDev > 0 ? annualizedReturn / annualizedStdDev : null;

    return { maxDrawdown: maxDrawdown * 100, sharpeRatio };
  }

  private getEmptyStatistics(): TradeStatistics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      profitFactor: 0,
      totalRealized: 0,
      maxDrawdown: 0,
      sharpeRatio: null,
    };
  }
}
