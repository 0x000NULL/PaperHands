import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../entities/position.entity';
import { OptionPosition } from '../entities/option-position.entity';
import { OptionStrategyType } from '../enums/cost-basis.enums';

export interface DetectedStrategy {
  strategyType: OptionStrategyType;
  underlyingSymbol: string;
  description: string;
  positions: {
    type: 'stock' | 'option';
    id: string;
    symbol: string;
    quantity: number;
    optionType?: 'call' | 'put';
    strikePrice?: number;
    expirationDate?: string;
  }[];
  maxProfit?: number;
  maxLoss?: number;
  breakeven?: number[];
  riskLevel: 'low' | 'medium' | 'high';
  marginRequirement?: number;
}

export interface PortfolioStrategies {
  coveredPositions: DetectedStrategy[];
  nakedPositions: DetectedStrategy[];
  spreads: DetectedStrategy[];
  totalCoveredCallIncome: number;
  totalCashSecuredPutPremium: number;
}

@Injectable()
export class OptionStrategyService {
  private readonly logger = new Logger(OptionStrategyService.name);

  constructor(
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(OptionPosition)
    private optionPositionRepository: Repository<OptionPosition>,
  ) {}

  /**
   * Detect all option strategies in a user's portfolio
   */
  async detectPortfolioStrategies(
    userId: string,
  ): Promise<PortfolioStrategies> {
    const [stockPositions, optionPositions] = await Promise.all([
      this.positionRepository.find({ where: { userId } }),
      this.optionPositionRepository.find({ where: { userId } }),
    ]);

    const coveredPositions: DetectedStrategy[] = [];
    const nakedPositions: DetectedStrategy[] = [];
    const spreads: DetectedStrategy[] = [];

    // Group options by underlying
    const optionsByUnderlying = new Map<string, OptionPosition[]>();
    for (const opt of optionPositions) {
      const existing = optionsByUnderlying.get(opt.underlyingSymbol) || [];
      existing.push(opt);
      optionsByUnderlying.set(opt.underlyingSymbol, existing);
    }

    // Create a map of stock positions
    const stockBySymbol = new Map<string, Position>();
    for (const pos of stockPositions) {
      stockBySymbol.set(pos.symbol, pos);
    }

    // Analyze each underlying
    for (const [underlying, options] of optionsByUnderlying) {
      const stockPosition = stockBySymbol.get(underlying);

      // Check for covered calls
      const shortCalls = options.filter(
        (o) => String(o.optionType) === 'call' && o.quantity < 0,
      );
      const longCalls = options.filter(
        (o) => String(o.optionType) === 'call' && o.quantity > 0,
      );
      const shortPuts = options.filter(
        (o) => String(o.optionType) === 'put' && o.quantity < 0,
      );
      const longPuts = options.filter(
        (o) => String(o.optionType) === 'put' && o.quantity > 0,
      );

      // Detect covered calls
      for (const shortCall of shortCalls) {
        const contractsNeeded = Math.abs(shortCall.quantity) * 100;

        if (
          stockPosition &&
          Number(stockPosition.quantity) >= contractsNeeded
        ) {
          coveredPositions.push(
            this.createCoveredCallStrategy(
              underlying,
              stockPosition,
              shortCall,
            ),
          );
        } else {
          nakedPositions.push(
            this.createNakedCallStrategy(underlying, shortCall),
          );
        }
      }

      // Detect cash-secured puts
      for (const shortPut of shortPuts) {
        // For paper trading, we assume all short puts are cash-secured
        // In a real system, we'd check buying power
        coveredPositions.push(
          this.createCashSecuredPutStrategy(underlying, shortPut),
        );
      }

      // Detect vertical spreads (bull call, bear put, etc.)
      const callSpreads = this.detectVerticalSpreads(
        underlying,
        longCalls,
        shortCalls,
        'call',
      );
      const putSpreads = this.detectVerticalSpreads(
        underlying,
        longPuts,
        shortPuts,
        'put',
      );
      spreads.push(...callSpreads, ...putSpreads);

      // Detect naked puts (if no cash)
      // Detect naked calls (no stock coverage)
      for (const longCall of longCalls) {
        if (!this.isPartOfSpread(longCall, callSpreads)) {
          nakedPositions.push(
            this.createLongCallStrategy(underlying, longCall),
          );
        }
      }

      for (const longPut of longPuts) {
        if (!this.isPartOfSpread(longPut, putSpreads)) {
          nakedPositions.push(this.createLongPutStrategy(underlying, longPut));
        }
      }
    }

    // Calculate totals
    const totalCoveredCallIncome = coveredPositions
      .filter((s) => s.strategyType === OptionStrategyType.COVERED_CALL)
      .reduce((sum, s) => sum + (s.maxProfit || 0), 0);

    const totalCashSecuredPutPremium = coveredPositions
      .filter((s) => s.strategyType === OptionStrategyType.CASH_SECURED_PUT)
      .reduce((sum, s) => sum + (s.maxProfit || 0), 0);

    return {
      coveredPositions,
      nakedPositions,
      spreads,
      totalCoveredCallIncome,
      totalCashSecuredPutPremium,
    };
  }

  /**
   * Get strategy classification for a specific option position
   */
  async getPositionStrategy(
    userId: string,
    optionPositionId: string,
  ): Promise<DetectedStrategy | null> {
    const optionPosition = await this.optionPositionRepository.findOne({
      where: { id: optionPositionId, userId },
    });

    if (!optionPosition) return null;

    const stockPosition = await this.positionRepository.findOne({
      where: { userId, symbol: optionPosition.underlyingSymbol },
    });

    // Simple classification based on position type
    if (optionPosition.quantity > 0) {
      if (String(optionPosition.optionType) === 'call') {
        return this.createLongCallStrategy(
          optionPosition.underlyingSymbol,
          optionPosition,
        );
      } else {
        return this.createLongPutStrategy(
          optionPosition.underlyingSymbol,
          optionPosition,
        );
      }
    } else {
      // Short position
      if (String(optionPosition.optionType) === 'call') {
        const contractsNeeded = Math.abs(optionPosition.quantity) * 100;
        if (
          stockPosition &&
          Number(stockPosition.quantity) >= contractsNeeded
        ) {
          return this.createCoveredCallStrategy(
            optionPosition.underlyingSymbol,
            stockPosition,
            optionPosition,
          );
        } else {
          return this.createNakedCallStrategy(
            optionPosition.underlyingSymbol,
            optionPosition,
          );
        }
      } else {
        return this.createCashSecuredPutStrategy(
          optionPosition.underlyingSymbol,
          optionPosition,
        );
      }
    }
  }

  /**
   * Check if selling a call would be covered
   */
  async wouldBeCoveredCall(
    userId: string,
    underlyingSymbol: string,
    contracts: number,
  ): Promise<{
    isCovered: boolean;
    sharesOwned: number;
    sharesNeeded: number;
  }> {
    const stockPosition = await this.positionRepository.findOne({
      where: { userId, symbol: underlyingSymbol },
    });

    const sharesOwned = stockPosition ? Number(stockPosition.quantity) : 0;
    const sharesNeeded = contracts * 100;

    return {
      isCovered: sharesOwned >= sharesNeeded,
      sharesOwned,
      sharesNeeded,
    };
  }

  private createCoveredCallStrategy(
    underlying: string,
    stockPosition: Position,
    optionPosition: OptionPosition,
  ): DetectedStrategy {
    const premium =
      Math.abs(Number(optionPosition.avgCostBasis)) *
      Math.abs(optionPosition.quantity) *
      100;
    const strikePrice = Number(optionPosition.strikePrice);
    const stockCost = Number(stockPosition.avgCostBasis);
    const contractsUsed = Math.abs(optionPosition.quantity);
    const sharesUsed = contractsUsed * 100;

    // Max profit = (strike - cost basis) * shares + premium
    const maxProfit = (strikePrice - stockCost) * sharesUsed + premium;

    // Breakeven = cost basis - premium per share
    const breakeven = stockCost - premium / sharesUsed;

    return {
      strategyType: OptionStrategyType.COVERED_CALL,
      underlyingSymbol: underlying,
      description: `Covered call on ${underlying}: ${contractsUsed} contract(s) at $${strikePrice} strike`,
      positions: [
        {
          type: 'stock',
          id: stockPosition.id,
          symbol: underlying,
          quantity: sharesUsed,
        },
        {
          type: 'option',
          id: optionPosition.id,
          symbol: optionPosition.optionSymbol,
          quantity: optionPosition.quantity,
          optionType: 'call',
          strikePrice,
          expirationDate: optionPosition.expirationDate.toISOString(),
        },
      ],
      maxProfit,
      maxLoss: (stockCost - premium / sharesUsed) * sharesUsed, // Max loss if stock goes to 0
      breakeven: [breakeven],
      riskLevel: 'low',
    };
  }

  private createCashSecuredPutStrategy(
    underlying: string,
    optionPosition: OptionPosition,
  ): DetectedStrategy {
    const premium =
      Math.abs(Number(optionPosition.avgCostBasis)) *
      Math.abs(optionPosition.quantity) *
      100;
    const strikePrice = Number(optionPosition.strikePrice);
    const contracts = Math.abs(optionPosition.quantity);

    // Max profit = premium received
    const maxProfit = premium;

    // Max loss = (strike price * 100 * contracts) - premium
    const maxLoss = strikePrice * 100 * contracts - premium;

    // Breakeven = strike - premium per share
    const breakeven = strikePrice - premium / (contracts * 100);

    // Cash needed to secure the put
    const marginRequirement = strikePrice * 100 * contracts;

    return {
      strategyType: OptionStrategyType.CASH_SECURED_PUT,
      underlyingSymbol: underlying,
      description: `Cash-secured put on ${underlying}: ${contracts} contract(s) at $${strikePrice} strike`,
      positions: [
        {
          type: 'option',
          id: optionPosition.id,
          symbol: optionPosition.optionSymbol,
          quantity: optionPosition.quantity,
          optionType: 'put',
          strikePrice,
          expirationDate: optionPosition.expirationDate.toISOString(),
        },
      ],
      maxProfit,
      maxLoss,
      breakeven: [breakeven],
      riskLevel: 'medium',
      marginRequirement,
    };
  }

  private createNakedCallStrategy(
    underlying: string,
    optionPosition: OptionPosition,
  ): DetectedStrategy {
    const premium =
      Math.abs(Number(optionPosition.avgCostBasis)) *
      Math.abs(optionPosition.quantity) *
      100;
    const strikePrice = Number(optionPosition.strikePrice);
    const contracts = Math.abs(optionPosition.quantity);

    return {
      strategyType: OptionStrategyType.NAKED_CALL,
      underlyingSymbol: underlying,
      description: `NAKED CALL on ${underlying}: ${contracts} contract(s) at $${strikePrice} strike - UNLIMITED RISK`,
      positions: [
        {
          type: 'option',
          id: optionPosition.id,
          symbol: optionPosition.optionSymbol,
          quantity: optionPosition.quantity,
          optionType: 'call',
          strikePrice,
          expirationDate: optionPosition.expirationDate.toISOString(),
        },
      ],
      maxProfit: premium,
      maxLoss: undefined, // Unlimited
      breakeven: [strikePrice + premium / (contracts * 100)],
      riskLevel: 'high',
    };
  }

  private createLongCallStrategy(
    underlying: string,
    optionPosition: OptionPosition,
  ): DetectedStrategy {
    const cost =
      Math.abs(Number(optionPosition.avgCostBasis)) *
      optionPosition.quantity *
      100;
    const strikePrice = Number(optionPosition.strikePrice);

    return {
      strategyType: OptionStrategyType.LONG_CALL,
      underlyingSymbol: underlying,
      description: `Long call on ${underlying}: ${optionPosition.quantity} contract(s) at $${strikePrice} strike`,
      positions: [
        {
          type: 'option',
          id: optionPosition.id,
          symbol: optionPosition.optionSymbol,
          quantity: optionPosition.quantity,
          optionType: 'call',
          strikePrice,
          expirationDate: optionPosition.expirationDate.toISOString(),
        },
      ],
      maxProfit: undefined, // Unlimited
      maxLoss: cost,
      breakeven: [strikePrice + cost / (optionPosition.quantity * 100)],
      riskLevel: 'medium',
    };
  }

  private createLongPutStrategy(
    underlying: string,
    optionPosition: OptionPosition,
  ): DetectedStrategy {
    const cost =
      Math.abs(Number(optionPosition.avgCostBasis)) *
      optionPosition.quantity *
      100;
    const strikePrice = Number(optionPosition.strikePrice);

    return {
      strategyType: OptionStrategyType.LONG_PUT,
      underlyingSymbol: underlying,
      description: `Long put on ${underlying}: ${optionPosition.quantity} contract(s) at $${strikePrice} strike`,
      positions: [
        {
          type: 'option',
          id: optionPosition.id,
          symbol: optionPosition.optionSymbol,
          quantity: optionPosition.quantity,
          optionType: 'put',
          strikePrice,
          expirationDate: optionPosition.expirationDate.toISOString(),
        },
      ],
      maxProfit: strikePrice * optionPosition.quantity * 100 - cost, // If stock goes to 0
      maxLoss: cost,
      breakeven: [strikePrice - cost / (optionPosition.quantity * 100)],
      riskLevel: 'medium',
    };
  }

  private detectVerticalSpreads(
    underlying: string,
    longOptions: OptionPosition[],
    shortOptions: OptionPosition[],
    optionType: 'call' | 'put',
  ): DetectedStrategy[] {
    const spreads: DetectedStrategy[] = [];

    // Match long and short options by expiration date to find spreads
    for (const longOpt of longOptions) {
      for (const shortOpt of shortOptions) {
        // Same expiration, different strikes = vertical spread
        if (
          longOpt.expirationDate.getTime() ===
            shortOpt.expirationDate.getTime() &&
          Number(longOpt.strikePrice) !== Number(shortOpt.strikePrice)
        ) {
          const longStrike = Number(longOpt.strikePrice);
          const shortStrike = Number(shortOpt.strikePrice);
          const contracts = Math.min(
            Math.abs(longOpt.quantity),
            Math.abs(shortOpt.quantity),
          );

          const isBullSpread =
            (optionType === 'call' && longStrike < shortStrike) ||
            (optionType === 'put' && longStrike > shortStrike);

          const spreadWidth = Math.abs(longStrike - shortStrike);
          const netDebit =
            (Number(longOpt.avgCostBasis) -
              Math.abs(Number(shortOpt.avgCostBasis))) *
            contracts *
            100;

          spreads.push({
            strategyType: isBullSpread
              ? OptionStrategyType.LONG_CALL // Using as proxy for bull spread
              : OptionStrategyType.LONG_PUT, // Using as proxy for bear spread
            underlyingSymbol: underlying,
            description: `${isBullSpread ? 'Bull' : 'Bear'} ${optionType} spread on ${underlying}: ${contracts} contract(s), $${Math.min(longStrike, shortStrike)}/$${Math.max(longStrike, shortStrike)}`,
            positions: [
              {
                type: 'option',
                id: longOpt.id,
                symbol: longOpt.optionSymbol,
                quantity: contracts,
                optionType,
                strikePrice: longStrike,
                expirationDate: longOpt.expirationDate.toISOString(),
              },
              {
                type: 'option',
                id: shortOpt.id,
                symbol: shortOpt.optionSymbol,
                quantity: -contracts,
                optionType,
                strikePrice: shortStrike,
                expirationDate: shortOpt.expirationDate.toISOString(),
              },
            ],
            maxProfit:
              netDebit < 0
                ? Math.abs(netDebit)
                : spreadWidth * contracts * 100 - netDebit,
            maxLoss:
              netDebit > 0
                ? netDebit
                : spreadWidth * contracts * 100 + netDebit,
            riskLevel: 'medium',
          });
        }
      }
    }

    return spreads;
  }

  private isPartOfSpread(
    option: OptionPosition,
    spreads: DetectedStrategy[],
  ): boolean {
    return spreads.some((spread) =>
      spread.positions.some((pos) => pos.id === option.id),
    );
  }
}
