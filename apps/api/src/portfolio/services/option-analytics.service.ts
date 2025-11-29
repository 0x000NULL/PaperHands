import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { OptionClosure } from '../entities/option-closure.entity';
import { OptionPosition } from '../entities/option-position.entity';

export interface OptionTradeStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netPnL: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  avgHoldingDays: number;
}

export interface OptionStatsByType {
  calls: OptionTradeStats;
  puts: OptionTradeStats;
  combined: OptionTradeStats;
}

export interface OptionStatsByClosureType {
  soldToClose: OptionTradeStats;
  boughtToClose: OptionTradeStats;
  expiredWorthless: OptionTradeStats;
  exercised: OptionTradeStats;
  assigned: OptionTradeStats;
}

export interface MonthlyOptionStats {
  month: string;
  year: number;
  trades: number;
  pnl: number;
  winRate: number;
  premiumCollected: number;
  premiumPaid: number;
}

export interface OptionPerformanceByUnderlying {
  symbol: string;
  trades: number;
  pnl: number;
  winRate: number;
  avgReturn: number;
}

export interface OptionAnalyticsSummary {
  byOptionType: OptionStatsByType;
  byClosureType: OptionStatsByClosureType;
  monthlyStats: MonthlyOptionStats[];
  topPerformingUnderlyings: OptionPerformanceByUnderlying[];
  worstPerformingUnderlyings: OptionPerformanceByUnderlying[];
  openPositionStats: {
    totalContracts: number;
    totalMarketValue: number;
    totalUnrealizedPnL: number;
    avgDaysToExpiration: number;
    longContracts: number;
    shortContracts: number;
  };
}

@Injectable()
export class OptionAnalyticsService {
  constructor(
    @InjectRepository(OptionClosure)
    private optionClosureRepository: Repository<OptionClosure>,
    @InjectRepository(OptionPosition)
    private optionPositionRepository: Repository<OptionPosition>,
  ) {}

  /**
   * Get comprehensive option analytics for a user
   */
  async getOptionAnalytics(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<OptionAnalyticsSummary> {
    const [
      byOptionType,
      byClosureType,
      monthlyStats,
      performanceByUnderlying,
      openPositionStats,
    ] = await Promise.all([
      this.getStatsByOptionType(userId, startDate, endDate),
      this.getStatsByClosureType(userId, startDate, endDate),
      this.getMonthlyStats(userId, startDate, endDate),
      this.getPerformanceByUnderlying(userId, startDate, endDate),
      this.getOpenPositionStats(userId),
    ]);

    // Sort by P&L to get top and worst performers
    const sortedPerformance = [...performanceByUnderlying].sort(
      (a, b) => b.pnl - a.pnl,
    );

    return {
      byOptionType,
      byClosureType,
      monthlyStats,
      topPerformingUnderlyings: sortedPerformance.slice(0, 5),
      worstPerformingUnderlyings: sortedPerformance.slice(-5).reverse(),
      openPositionStats,
    };
  }

  /**
   * Get statistics by option type (calls vs puts)
   */
  async getStatsByOptionType(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<OptionStatsByType> {
    const closures = await this.getClosuresWithDateFilter(
      userId,
      startDate,
      endDate,
    );

    const callClosures = closures.filter(
      (c) => String(c.optionType) === 'call',
    );
    const putClosures = closures.filter((c) => String(c.optionType) === 'put');

    return {
      calls: this.calculateStats(callClosures),
      puts: this.calculateStats(putClosures),
      combined: this.calculateStats(closures),
    };
  }

  /**
   * Get statistics by closure type
   */
  async getStatsByClosureType(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<OptionStatsByClosureType> {
    const closures = await this.getClosuresWithDateFilter(
      userId,
      startDate,
      endDate,
    );

    const byType = {
      sold_to_close: [] as OptionClosure[],
      bought_to_close: [] as OptionClosure[],
      expired_worthless: [] as OptionClosure[],
      exercised: [] as OptionClosure[],
      assigned: [] as OptionClosure[],
    };

    for (const closure of closures) {
      const type = String(closure.closureType) as keyof typeof byType;
      if (byType[type]) {
        byType[type].push(closure);
      }
    }

    return {
      soldToClose: this.calculateStats(byType.sold_to_close),
      boughtToClose: this.calculateStats(byType.bought_to_close),
      expiredWorthless: this.calculateStats(byType.expired_worthless),
      exercised: this.calculateStats(byType.exercised),
      assigned: this.calculateStats(byType.assigned),
    };
  }

  /**
   * Get monthly statistics
   */
  async getMonthlyStats(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<MonthlyOptionStats[]> {
    const closures = await this.getClosuresWithDateFilter(
      userId,
      startDate,
      endDate,
    );

    const monthlyMap = new Map<
      string,
      {
        trades: number;
        wins: number;
        pnl: number;
        premiumCollected: number;
        premiumPaid: number;
      }
    >();

    for (const closure of closures) {
      const date = new Date(closure.closedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthlyMap.get(key) || {
        trades: 0,
        wins: 0,
        pnl: 0,
        premiumCollected: 0,
        premiumPaid: 0,
      };

      existing.trades += 1;
      const gain = Number(closure.realizedGain);
      existing.pnl += gain;
      if (gain > 0) existing.wins += 1;

      // Track premium flow (simplified)
      if (closure.quantityClosed < 0) {
        // Short position closed - premium was collected when opened
        existing.premiumCollected += Math.abs(Number(closure.proceeds));
      } else {
        // Long position closed - premium was paid when opened
        existing.premiumPaid += Math.abs(Number(closure.costBasis));
      }

      monthlyMap.set(key, existing);
    }

    // Convert to array and sort by date
    const result: MonthlyOptionStats[] = [];
    for (const [key, data] of monthlyMap) {
      const [year, month] = key.split('-');
      result.push({
        month: new Date(Number(year), Number(month) - 1).toLocaleDateString(
          'en-US',
          {
            month: 'short',
          },
        ),
        year: Number(year),
        trades: data.trades,
        pnl: data.pnl,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
        premiumCollected: data.premiumCollected,
        premiumPaid: data.premiumPaid,
      });
    }

    return result.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const monthOrder = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });
  }

  /**
   * Get performance by underlying symbol
   */
  async getPerformanceByUnderlying(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<OptionPerformanceByUnderlying[]> {
    const closures = await this.getClosuresWithDateFilter(
      userId,
      startDate,
      endDate,
    );

    const bySymbol = new Map<
      string,
      {
        trades: number;
        wins: number;
        totalPnL: number;
        totalCost: number;
      }
    >();

    for (const closure of closures) {
      const existing = bySymbol.get(closure.underlyingSymbol) || {
        trades: 0,
        wins: 0,
        totalPnL: 0,
        totalCost: 0,
      };

      existing.trades += 1;
      const gain = Number(closure.realizedGain);
      existing.totalPnL += gain;
      existing.totalCost += Math.abs(Number(closure.costBasis));
      if (gain > 0) existing.wins += 1;

      bySymbol.set(closure.underlyingSymbol, existing);
    }

    const result: OptionPerformanceByUnderlying[] = [];
    for (const [symbol, data] of bySymbol) {
      result.push({
        symbol,
        trades: data.trades,
        pnl: data.totalPnL,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
        avgReturn:
          data.totalCost > 0 ? (data.totalPnL / data.totalCost) * 100 : 0,
      });
    }

    return result;
  }

  /**
   * Get open position statistics
   */
  async getOpenPositionStats(userId: string): Promise<{
    totalContracts: number;
    totalMarketValue: number;
    totalUnrealizedPnL: number;
    avgDaysToExpiration: number;
    longContracts: number;
    shortContracts: number;
  }> {
    const openPositions = await this.optionPositionRepository.find({
      where: { userId },
    });

    if (openPositions.length === 0) {
      return {
        totalContracts: 0,
        totalMarketValue: 0,
        totalUnrealizedPnL: 0,
        avgDaysToExpiration: 0,
        longContracts: 0,
        shortContracts: 0,
      };
    }

    let totalContracts = 0;
    let totalMarketValue = 0;
    let totalUnrealizedPnL = 0;
    let totalDaysToExpiration = 0;
    let longContracts = 0;
    let shortContracts = 0;

    const now = new Date();

    for (const position of openPositions) {
      const contracts = Math.abs(position.quantity);
      totalContracts += contracts;

      if (position.quantity > 0) {
        longContracts += contracts;
      } else {
        shortContracts += contracts;
      }

      // Calculate unrealized P&L (using avgCostBasis as placeholder for current value)
      // Note: Real-time prices would need to come from a market data service
      const costBasis = Number(position.avgCostBasis) * position.quantity * 100;
      const currentValue = costBasis; // Without live prices, unrealized P&L is 0
      totalUnrealizedPnL += currentValue - costBasis;
      totalMarketValue += Math.abs(costBasis);

      // Calculate days to expiration
      const daysToExp = Math.max(
        0,
        Math.ceil(
          (position.expirationDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      totalDaysToExpiration += daysToExp * contracts;
    }

    return {
      totalContracts,
      totalMarketValue,
      totalUnrealizedPnL,
      avgDaysToExpiration:
        totalContracts > 0 ? totalDaysToExpiration / totalContracts : 0,
      longContracts,
      shortContracts,
    };
  }

  /**
   * Get win rate for specific time period
   */
  async getWinRateByPeriod(
    userId: string,
    period: 'week' | 'month' | 'quarter' | 'year',
  ): Promise<{ current: number; previous: number; change: number }> {
    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;

    switch (period) {
      case 'week':
        currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        previousEnd = currentStart;
        break;
      case 'month':
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = currentStart;
        break;
      case 'quarter': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        previousStart = new Date(
          now.getFullYear(),
          (currentQuarter - 1) * 3,
          1,
        );
        previousEnd = currentStart;
        break;
      }
      case 'year':
        currentStart = new Date(now.getFullYear(), 0, 1);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = currentStart;
        break;
    }

    const [currentStats, previousStats] = await Promise.all([
      this.getStatsByOptionType(userId, currentStart, now),
      this.getStatsByOptionType(userId, previousStart, previousEnd),
    ]);

    const current = currentStats.combined.winRate;
    const previous = previousStats.combined.winRate;
    const change = previous > 0 ? current - previous : current;

    return { current, previous, change };
  }

  /**
   * Helper: Get closures with optional date filter
   */
  private async getClosuresWithDateFilter(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<OptionClosure[]> {
    const where: Record<string, unknown> = { userId };

    if (startDate && endDate) {
      where.closedAt = Between(startDate, endDate);
    } else if (startDate) {
      where.closedAt = MoreThanOrEqual(startDate);
    } else if (endDate) {
      where.closedAt = LessThanOrEqual(endDate);
    }

    return this.optionClosureRepository.find({
      where,
      order: { closedAt: 'DESC' },
    });
  }

  /**
   * Helper: Calculate statistics from closures
   */
  private calculateStats(closures: OptionClosure[]): OptionTradeStats {
    if (closures.length === 0) {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalProfit: 0,
        totalLoss: 0,
        netPnL: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        largestWin: 0,
        largestLoss: 0,
        avgHoldingDays: 0,
      };
    }

    let wins = 0;
    let losses = 0;
    let totalProfit = 0;
    let totalLoss = 0;
    let largestWin = 0;
    let largestLoss = 0;
    let totalHoldingDays = 0;

    for (const closure of closures) {
      const gain = Number(closure.realizedGain);
      const holdingDays = Number(closure.holdingDays);

      totalHoldingDays += holdingDays;

      if (gain > 0) {
        wins += 1;
        totalProfit += gain;
        largestWin = Math.max(largestWin, gain);
      } else if (gain < 0) {
        losses += 1;
        totalLoss += Math.abs(gain);
        largestLoss = Math.max(largestLoss, Math.abs(gain));
      }
    }

    const totalTrades = closures.length;

    return {
      totalTrades,
      wins,
      losses,
      winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
      totalProfit,
      totalLoss,
      netPnL: totalProfit - totalLoss,
      avgWin: wins > 0 ? totalProfit / wins : 0,
      avgLoss: losses > 0 ? totalLoss / losses : 0,
      profitFactor:
        totalLoss > 0
          ? totalProfit / totalLoss
          : totalProfit > 0
            ? Infinity
            : 0,
      largestWin,
      largestLoss,
      avgHoldingDays: totalTrades > 0 ? totalHoldingDays / totalTrades : 0,
    };
  }
}
