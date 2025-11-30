import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from './entities/position.entity';
import { OptionPosition } from './entities/option-position.entity';
import { User } from '../users/entities/user.entity';
import { FinnhubService } from '../market-data/finnhub.service';
import { TradierService } from '../market-data/tradier.service';

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgCostBasis: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  dividendYield: number | null;
  annualDividendIncome: number | null;
}

export interface Portfolio {
  cashBalance: number;
  positions: PortfolioPosition[];
  totalValue: number;
}

export interface OptionPortfolioPosition {
  id: string;
  optionSymbol: string;
  underlyingSymbol: string;
  optionType: string;
  strikePrice: number;
  expirationDate: Date;
  quantity: number; // Positive = long, negative = short
  avgCostBasis: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  greeksSnapshot: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
    iv: number;
  } | null;
}

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(OptionPosition)
    private optionPositionRepository: Repository<OptionPosition>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private finnhubService: FinnhubService,
    private tradierService: TradierService,
  ) {}

  async getPortfolio(userId: string): Promise<Portfolio> {
    // Get user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get positions
    const positions = await this.positionRepository.find({
      where: { userId },
    });

    if (positions.length === 0) {
      return {
        cashBalance: Number(user.cashBalance),
        positions: [],
        totalValue: Number(user.cashBalance),
      };
    }

    // Get current quotes and metrics for all positions
    const symbols = positions.map((p) => p.symbol);
    const [quotes, metrics] = await Promise.all([
      this.finnhubService.getQuotes(symbols),
      this.finnhubService.getStockMetricsBatch(symbols),
    ]);
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    // Calculate portfolio positions with current values
    const portfolioPositions: PortfolioPosition[] = positions.map((p) => {
      const quote = quoteMap.get(p.symbol);
      const stockMetrics = metrics.get(p.symbol);
      const currentPrice = quote?.last ?? 0;
      const quantity = Number(p.quantity);
      const avgCostBasis = Number(p.avgCostBasis);
      const marketValue = currentPrice * quantity;
      const costBasis = avgCostBasis * quantity;
      const gainLoss = marketValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      // Calculate annual dividend income based on dividend per share
      const annualDividendIncome = stockMetrics?.dividendPerShare
        ? stockMetrics.dividendPerShare * quantity
        : null;

      return {
        symbol: p.symbol,
        quantity,
        avgCostBasis,
        currentPrice,
        marketValue,
        gainLoss,
        gainLossPercent,
        dividendYield: stockMetrics?.dividendYield ?? null,
        annualDividendIncome,
      };
    });

    // Calculate total value
    const positionsValue = portfolioPositions.reduce(
      (sum, p) => sum + p.marketValue,
      0,
    );
    const totalValue = Number(user.cashBalance) + positionsValue;

    return {
      cashBalance: Number(user.cashBalance),
      positions: portfolioPositions,
      totalValue,
    };
  }

  async findPosition(userId: string, symbol: string): Promise<Position | null> {
    return this.positionRepository.findOne({
      where: { userId, symbol: symbol.toUpperCase() },
    });
  }

  async createOrUpdatePosition(
    userId: string,
    symbol: string,
    quantity: number,
    price: number,
    isBuy: boolean,
  ): Promise<void> {
    const upperSymbol = symbol.toUpperCase();
    const existingPosition = await this.findPosition(userId, upperSymbol);

    if (isBuy) {
      if (existingPosition) {
        // Update existing position with weighted average cost basis
        const existingQty = Number(existingPosition.quantity);
        const existingCost = Number(existingPosition.avgCostBasis);
        const newTotalQty = existingQty + quantity;
        const newAvgCost =
          (existingQty * existingCost + quantity * price) / newTotalQty;

        await this.positionRepository.update(existingPosition.id, {
          quantity: newTotalQty,
          avgCostBasis: newAvgCost,
        });
      } else {
        // Create new position
        const position = this.positionRepository.create({
          userId,
          symbol: upperSymbol,
          quantity,
          avgCostBasis: price,
        });
        await this.positionRepository.save(position);
      }
    } else {
      // Sell
      if (existingPosition) {
        const existingQty = Number(existingPosition.quantity);
        const newQty = existingQty - quantity;

        if (newQty <= 0) {
          // Remove position entirely
          await this.positionRepository.remove(existingPosition);
        } else {
          // Update quantity (cost basis stays the same)
          await this.positionRepository.update(existingPosition.id, {
            quantity: newQty,
          });
        }
      }
    }
  }

  async getOptionPositions(userId: string): Promise<OptionPortfolioPosition[]> {
    const positions = await this.optionPositionRepository.find({
      where: { userId },
      order: { expirationDate: 'ASC' },
    });

    if (positions.length === 0) {
      return [];
    }

    // Fetch current prices for all option positions
    const optionPositions: OptionPortfolioPosition[] = [];

    for (const pos of positions) {
      const quote = await this.tradierService.getOptionQuote(pos.optionSymbol);
      const quantity = Number(pos.quantity);
      const avgCostBasis = Number(pos.avgCostBasis);

      // Use mid price for valuation
      const currentPrice = quote ? (quote.bid + quote.ask) / 2 : avgCostBasis;

      const contractMultiplier = 100;
      // For long positions (positive qty), value = currentPrice * qty * multiplier
      // For short positions (negative qty), the value represents liability
      const marketValue =
        currentPrice * Math.abs(quantity) * contractMultiplier;
      const costBasis = avgCostBasis * Math.abs(quantity) * contractMultiplier;

      // For long positions: gain when price goes up
      // For short positions: gain when price goes down
      const gainLoss =
        quantity > 0 ? marketValue - costBasis : costBasis - marketValue;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      optionPositions.push({
        id: pos.id,
        optionSymbol: pos.optionSymbol,
        underlyingSymbol: pos.underlyingSymbol,
        optionType: pos.optionType,
        strikePrice: Number(pos.strikePrice),
        expirationDate: pos.expirationDate,
        quantity,
        avgCostBasis,
        currentPrice,
        marketValue: quantity > 0 ? marketValue : -marketValue, // Negative for short positions (liability)
        gainLoss,
        gainLossPercent,
        greeksSnapshot: quote?.greeks ?? pos.greeksSnapshot,
      });
    }

    return optionPositions;
  }
}
