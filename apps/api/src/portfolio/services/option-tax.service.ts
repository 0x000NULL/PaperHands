import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { OptionClosure } from '../entities/option-closure.entity';
import { OptionPosition } from '../entities/option-position.entity';
import { GainType, OptionClosureType } from '../enums/cost-basis.enums';

export interface OptionRealizedGainsSummary {
  shortTermGains: number;
  shortTermLosses: number;
  longTermGains: number;
  longTermLosses: number;
  totalShortTerm: number;
  totalLongTerm: number;
  totalRealized: number;
  transactionCount: number;
}

export interface OptionClosureFilters {
  underlyingSymbol?: string;
  closureType?: OptionClosureType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class OptionTaxService {
  private readonly logger = new Logger(OptionTaxService.name);

  constructor(
    @InjectRepository(OptionClosure)
    private optionClosureRepository: Repository<OptionClosure>,
    @InjectRepository(OptionPosition)
    private optionPositionRepository: Repository<OptionPosition>,
  ) {}

  /**
   * Record a sell-to-close closure (when user sells a long position)
   */
  async recordSoldToClose(
    manager: EntityManager,
    userId: string,
    optionPosition: OptionPosition,
    quantityClosed: number,
    closingPremium: number,
    closingOrderId: string,
    closedAt: Date,
  ): Promise<OptionClosure> {
    const holdingDays = this.calculateHoldingDays(
      optionPosition.createdAt,
      closedAt,
    );
    const gainType = this.determineGainType(holdingDays);

    const multiplier = 100; // Options are for 100 shares per contract
    const costBasis =
      Number(optionPosition.avgCostBasis) * quantityClosed * multiplier;
    const proceeds = closingPremium * quantityClosed * multiplier;
    const realizedGain = proceeds - costBasis;

    const closure = manager.create(OptionClosure, {
      userId,
      optionPositionId: optionPosition.id,
      closingOrderId,
      optionSymbol: optionPosition.optionSymbol,
      underlyingSymbol: optionPosition.underlyingSymbol,
      optionType: optionPosition.optionType,
      strikePrice: optionPosition.strikePrice,
      expirationDate: optionPosition.expirationDate,
      closureType: OptionClosureType.SOLD_TO_CLOSE,
      quantityClosed,
      openingPremium: optionPosition.avgCostBasis,
      closingPremium,
      realizedGain,
      proceeds,
      costBasis,
      gainType,
      holdingDays,
      closedAt,
    });

    const savedClosure = await manager.save(closure);

    this.logger.log(
      `Recorded sold-to-close for ${quantityClosed} contracts of ${optionPosition.optionSymbol}: ` +
        `$${realizedGain.toFixed(2)} ${gainType} gain/loss`,
    );

    return savedClosure;
  }

  /**
   * Record a buy-to-close closure (when user buys back a short position)
   * For short positions: opening premium was RECEIVED (proceeds), closing premium is PAID (cost)
   */
  async recordBuyToClose(
    manager: EntityManager,
    userId: string,
    optionPosition: OptionPosition,
    quantityClosed: number,
    closingPremium: number,
    closingOrderId: string,
    closedAt: Date,
  ): Promise<OptionClosure> {
    const holdingDays = this.calculateHoldingDays(
      optionPosition.createdAt,
      closedAt,
    );
    const gainType = this.determineGainType(holdingDays);

    const multiplier = 100;
    // For short positions: proceeds = premium received when selling to open
    // costBasis = premium paid when buying to close
    const proceeds =
      Number(optionPosition.avgCostBasis) * quantityClosed * multiplier;
    const costBasis = closingPremium * quantityClosed * multiplier;
    const realizedGain = proceeds - costBasis;

    const closure = manager.create(OptionClosure, {
      userId,
      optionPositionId: optionPosition.id,
      closingOrderId,
      optionSymbol: optionPosition.optionSymbol,
      underlyingSymbol: optionPosition.underlyingSymbol,
      optionType: optionPosition.optionType,
      strikePrice: optionPosition.strikePrice,
      expirationDate: optionPosition.expirationDate,
      closureType: OptionClosureType.BOUGHT_TO_CLOSE,
      quantityClosed,
      openingPremium: optionPosition.avgCostBasis,
      closingPremium,
      realizedGain,
      proceeds,
      costBasis,
      gainType,
      holdingDays,
      closedAt,
    });

    const savedClosure = await manager.save(closure);

    this.logger.log(
      `Recorded buy-to-close for ${quantityClosed} short contracts of ${optionPosition.optionSymbol}: ` +
        `$${realizedGain.toFixed(2)} ${gainType} gain/loss`,
    );

    return savedClosure;
  }

  /**
   * Record an expired worthless closure for a short position (OTM at expiration)
   * When a short option expires worthless, the premium received is pure profit
   */
  async recordShortExpiredWorthless(
    manager: EntityManager,
    userId: string,
    optionPosition: OptionPosition,
    expiredAt: Date,
  ): Promise<OptionClosure> {
    const holdingDays = this.calculateHoldingDays(
      optionPosition.createdAt,
      expiredAt,
    );
    const gainType = this.determineGainType(holdingDays);

    const multiplier = 100;
    const quantityClosed = Math.abs(Number(optionPosition.quantity));
    // For short positions expiring worthless:
    // - Proceeds = premium received when selling to open (this is profit)
    // - Cost basis = 0 (expired worthless, no cost to close)
    const proceeds =
      Number(optionPosition.avgCostBasis) * quantityClosed * multiplier;
    const costBasis = 0;
    const realizedGain = proceeds; // Full premium kept as profit

    const closure = manager.create(OptionClosure, {
      userId,
      optionPositionId: optionPosition.id,
      closingOrderId: null,
      optionSymbol: optionPosition.optionSymbol,
      underlyingSymbol: optionPosition.underlyingSymbol,
      optionType: optionPosition.optionType,
      strikePrice: optionPosition.strikePrice,
      expirationDate: optionPosition.expirationDate,
      closureType: OptionClosureType.EXPIRED_WORTHLESS,
      quantityClosed,
      openingPremium: optionPosition.avgCostBasis,
      closingPremium: null,
      realizedGain,
      proceeds,
      costBasis,
      gainType,
      holdingDays,
      closedAt: expiredAt,
    });

    const savedClosure = await manager.save(closure);

    this.logger.log(
      `Recorded short expired worthless for ${quantityClosed} contracts of ${optionPosition.optionSymbol}: ` +
        `$${realizedGain.toFixed(2)} ${gainType} gain (full premium kept)`,
    );

    return savedClosure;
  }

  /**
   * Record an expired worthless closure (OTM at expiration)
   */
  async recordExpiredWorthless(
    manager: EntityManager,
    userId: string,
    optionPosition: OptionPosition,
    expiredAt: Date,
  ): Promise<OptionClosure> {
    const holdingDays = this.calculateHoldingDays(
      optionPosition.createdAt,
      expiredAt,
    );
    const gainType = this.determineGainType(holdingDays);

    const multiplier = 100;
    const quantityClosed = Math.abs(Number(optionPosition.quantity));
    const costBasis =
      Number(optionPosition.avgCostBasis) * quantityClosed * multiplier;
    const proceeds = 0; // Expired worthless
    const realizedGain = proceeds - costBasis; // This will be negative (loss)

    const closure = manager.create(OptionClosure, {
      userId,
      optionPositionId: optionPosition.id,
      closingOrderId: null,
      optionSymbol: optionPosition.optionSymbol,
      underlyingSymbol: optionPosition.underlyingSymbol,
      optionType: optionPosition.optionType,
      strikePrice: optionPosition.strikePrice,
      expirationDate: optionPosition.expirationDate,
      closureType: OptionClosureType.EXPIRED_WORTHLESS,
      quantityClosed,
      openingPremium: optionPosition.avgCostBasis,
      closingPremium: null,
      realizedGain,
      proceeds,
      costBasis,
      gainType,
      holdingDays,
      closedAt: expiredAt,
    });

    const savedClosure = await manager.save(closure);

    this.logger.log(
      `Recorded expired worthless for ${quantityClosed} contracts of ${optionPosition.optionSymbol}: ` +
        `$${realizedGain.toFixed(2)} ${gainType} loss`,
    );

    return savedClosure;
  }

  /**
   * Record an ITM exercise closure
   * Note: The cost basis effect is recorded in the resulting stock position
   */
  async recordExercised(
    manager: EntityManager,
    userId: string,
    optionPosition: OptionPosition,
    exercisedAt: Date,
    resultingStockOrderId: string | null,
  ): Promise<OptionClosure> {
    const holdingDays = this.calculateHoldingDays(
      optionPosition.createdAt,
      exercisedAt,
    );
    const gainType = this.determineGainType(holdingDays);

    const multiplier = 100;
    const quantityClosed = Math.abs(Number(optionPosition.quantity));
    const costBasis =
      Number(optionPosition.avgCostBasis) * quantityClosed * multiplier;

    // For exercised options, the premium paid becomes part of the stock cost basis
    // The realized gain/loss on the option itself is $0
    // (the economic effect is in the stock position)
    const proceeds = 0;
    const realizedGain = 0;

    const closure = manager.create(OptionClosure, {
      userId,
      optionPositionId: optionPosition.id,
      closingOrderId: null,
      optionSymbol: optionPosition.optionSymbol,
      underlyingSymbol: optionPosition.underlyingSymbol,
      optionType: optionPosition.optionType,
      strikePrice: optionPosition.strikePrice,
      expirationDate: optionPosition.expirationDate,
      closureType: OptionClosureType.EXERCISED,
      quantityClosed,
      openingPremium: optionPosition.avgCostBasis,
      closingPremium: null,
      realizedGain,
      proceeds,
      costBasis,
      gainType,
      holdingDays,
      resultingStockOrderId,
      closedAt: exercisedAt,
    });

    const savedClosure = await manager.save(closure);

    this.logger.log(
      `Recorded exercise for ${quantityClosed} contracts of ${optionPosition.optionSymbol} ` +
        `into stock order ${resultingStockOrderId}`,
    );

    return savedClosure;
  }

  /**
   * Record an assignment closure (for short positions)
   */
  async recordAssigned(
    manager: EntityManager,
    userId: string,
    optionPosition: OptionPosition,
    assignedAt: Date,
    resultingStockOrderId: string | null,
  ): Promise<OptionClosure> {
    const holdingDays = this.calculateHoldingDays(
      optionPosition.createdAt,
      assignedAt,
    );
    const gainType = this.determineGainType(holdingDays);

    const multiplier = 100;
    const quantityClosed = Math.abs(Number(optionPosition.quantity));
    const proceeds =
      Number(optionPosition.avgCostBasis) * quantityClosed * multiplier;

    // For assigned short options, the premium received was income
    // The gain/loss depends on the subsequent stock transaction
    const costBasis = 0;
    const realizedGain = proceeds; // Premium collected is realized

    const closure = manager.create(OptionClosure, {
      userId,
      optionPositionId: optionPosition.id,
      closingOrderId: null,
      optionSymbol: optionPosition.optionSymbol,
      underlyingSymbol: optionPosition.underlyingSymbol,
      optionType: optionPosition.optionType,
      strikePrice: optionPosition.strikePrice,
      expirationDate: optionPosition.expirationDate,
      closureType: OptionClosureType.ASSIGNED,
      quantityClosed,
      openingPremium: optionPosition.avgCostBasis,
      closingPremium: null,
      realizedGain,
      proceeds,
      costBasis,
      gainType,
      holdingDays,
      resultingStockOrderId,
      closedAt: assignedAt,
    });

    const savedClosure = await manager.save(closure);

    this.logger.log(
      `Recorded assignment for ${quantityClosed} short contracts of ${optionPosition.optionSymbol}`,
    );

    return savedClosure;
  }

  /**
   * Get option closures with filtering
   */
  async getOptionClosures(
    userId: string,
    filters?: OptionClosureFilters,
  ): Promise<OptionClosure[]> {
    const queryBuilder = this.optionClosureRepository
      .createQueryBuilder('closure')
      .where('closure.userId = :userId', { userId });

    if (filters?.underlyingSymbol) {
      queryBuilder.andWhere('closure.underlyingSymbol = :symbol', {
        symbol: filters.underlyingSymbol,
      });
    }
    if (filters?.closureType) {
      queryBuilder.andWhere('closure.closureType = :closureType', {
        closureType: filters.closureType,
      });
    }
    if (filters?.startDate) {
      queryBuilder.andWhere('closure.closedAt >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters?.endDate) {
      queryBuilder.andWhere('closure.closedAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    queryBuilder.orderBy('closure.closedAt', 'DESC');

    if (filters?.limit) {
      queryBuilder.take(filters.limit);
    }
    if (filters?.offset) {
      queryBuilder.skip(filters.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Get realized gains summary for options (for tax reporting)
   */
  async getOptionRealizedGainsSummary(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<OptionRealizedGainsSummary> {
    const results = await this.optionClosureRepository
      .createQueryBuilder('closure')
      .select('closure.gainType', 'gainType')
      .addSelect(
        'SUM(CASE WHEN closure.realizedGain > 0 THEN closure.realizedGain ELSE 0 END)',
        'gains',
      )
      .addSelect(
        'SUM(CASE WHEN closure.realizedGain < 0 THEN closure.realizedGain ELSE 0 END)',
        'losses',
      )
      .addSelect('SUM(closure.realizedGain)', 'totalGain')
      .addSelect('SUM(closure.proceeds)', 'totalProceeds')
      .addSelect('SUM(closure.costBasis)', 'totalCostBasis')
      .addSelect('COUNT(*)', 'transactionCount')
      .where('closure.userId = :userId', { userId })
      .andWhere('closure.closedAt >= :startDate', { startDate })
      .andWhere('closure.closedAt <= :endDate', { endDate })
      .groupBy('closure.gainType')
      .getRawMany();

    let shortTermGains = 0;
    let shortTermLosses = 0;
    let longTermGains = 0;
    let longTermLosses = 0;
    let transactionCount = 0;

    for (const row of results as Array<{
      gainType: GainType;
      gains: string | number;
      losses: string | number;
      transactionCount: string | number;
    }>) {
      const gains = Number(row.gains) || 0;
      const losses = Number(row.losses) || 0;
      const count = Number(row.transactionCount) || 0;

      if (row.gainType === GainType.SHORT_TERM) {
        shortTermGains = gains;
        shortTermLosses = Math.abs(losses);
      } else {
        longTermGains = gains;
        longTermLosses = Math.abs(losses);
      }
      transactionCount += count;
    }

    const totalShortTerm = shortTermGains - shortTermLosses;
    const totalLongTerm = longTermGains - longTermLosses;

    return {
      shortTermGains,
      shortTermLosses,
      longTermGains,
      longTermLosses,
      totalShortTerm,
      totalLongTerm,
      totalRealized: totalShortTerm + totalLongTerm,
      transactionCount,
    };
  }

  /**
   * Get combined stock + option realized gains
   */
  async getCombinedRealizedGainsSummary(
    userId: string,
    startDate: Date,
    endDate: Date,
    stockGains: OptionRealizedGainsSummary,
  ): Promise<{
    stocks: OptionRealizedGainsSummary;
    options: OptionRealizedGainsSummary;
    combined: OptionRealizedGainsSummary;
  }> {
    const options = await this.getOptionRealizedGainsSummary(
      userId,
      startDate,
      endDate,
    );

    const combined: OptionRealizedGainsSummary = {
      shortTermGains: stockGains.shortTermGains + options.shortTermGains,
      shortTermLosses: stockGains.shortTermLosses + options.shortTermLosses,
      longTermGains: stockGains.longTermGains + options.longTermGains,
      longTermLosses: stockGains.longTermLosses + options.longTermLosses,
      totalShortTerm: stockGains.totalShortTerm + options.totalShortTerm,
      totalLongTerm: stockGains.totalLongTerm + options.totalLongTerm,
      totalRealized: stockGains.totalRealized + options.totalRealized,
      transactionCount: stockGains.transactionCount + options.transactionCount,
    };

    return {
      stocks: stockGains,
      options,
      combined,
    };
  }

  // ============ Private Helper Methods ============

  private calculateHoldingDays(acquiredAt: Date, closedAt: Date): number {
    return Math.floor(
      (closedAt.getTime() - acquiredAt.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private determineGainType(holdingDays: number): GainType {
    return holdingDays > 365 ? GainType.LONG_TERM : GainType.SHORT_TERM;
  }
}
