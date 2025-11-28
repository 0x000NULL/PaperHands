import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from './entities/position.entity';
import { User } from '../users/entities/user.entity';
import { FinnhubService } from '../market-data/finnhub.service';

export interface PortfolioPosition {
  symbol: string;
  quantity: number;
  avgCostBasis: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface Portfolio {
  cashBalance: number;
  positions: PortfolioPosition[];
  totalValue: number;
}

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private finnhubService: FinnhubService,
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

    // Get current quotes for all positions
    const symbols = positions.map((p) => p.symbol);
    const quotes = await this.finnhubService.getQuotes(symbols);
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    // Calculate portfolio positions with current values
    const portfolioPositions: PortfolioPosition[] = positions.map((p) => {
      const quote = quoteMap.get(p.symbol);
      const currentPrice = quote?.last ?? 0;
      const quantity = Number(p.quantity);
      const avgCostBasis = Number(p.avgCostBasis);
      const marketValue = currentPrice * quantity;
      const costBasis = avgCostBasis * quantity;
      const gainLoss = marketValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      return {
        symbol: p.symbol,
        quantity,
        avgCostBasis,
        currentPrice,
        marketValue,
        gainLoss,
        gainLossPercent,
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
}
