import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { TaxLot } from '../entities/tax-lot.entity';
import { LotSale } from '../entities/lot-sale.entity';
import { UserCostBasisPreference } from '../../users/entities/user-cost-basis-preference.entity';
import {
  CostBasisMethod,
  TaxLotStatus,
  GainType,
} from '../enums/cost-basis.enums';

export interface RealizedGainsSummary {
  shortTermGains: number;
  shortTermLosses: number;
  longTermGains: number;
  longTermLosses: number;
  totalShortTerm: number;
  totalLongTerm: number;
  totalRealized: number;
  transactionCount: number;
}

export interface CostBasisPreview {
  method: CostBasisMethod;
  estimatedGain: number;
  estimatedProceeds: number;
  estimatedCostBasis: number;
  lots: {
    lotId: string;
    quantity: number;
    costBasisPerShare: number;
    acquiredAt: Date;
    holdingDays: number;
    gainType: GainType;
    estimatedGain: number;
  }[];
}

@Injectable()
export class TaxLotService {
  private readonly logger = new Logger(TaxLotService.name);

  constructor(
    @InjectRepository(TaxLot)
    private taxLotRepository: Repository<TaxLot>,
    @InjectRepository(LotSale)
    private lotSaleRepository: Repository<LotSale>,
    @InjectRepository(UserCostBasisPreference)
    private prefRepository: Repository<UserCostBasisPreference>,
  ) {}

  /**
   * Create a tax lot when a BUY order is filled
   */
  async createTaxLot(
    manager: EntityManager,
    userId: string,
    symbol: string,
    quantity: number,
    pricePerShare: number,
    sourceOrderId: string,
    acquiredAt: Date,
  ): Promise<TaxLot> {
    const taxLot = manager.create(TaxLot, {
      userId,
      symbol,
      originalQuantity: quantity,
      remainingQuantity: quantity,
      costBasisPerShare: pricePerShare,
      sourceOrderId,
      acquiredAt,
      status: TaxLotStatus.OPEN,
    });
    return manager.save(taxLot);
  }

  /**
   * Sell shares using the specified cost basis method
   */
  async sellShares(
    manager: EntityManager,
    userId: string,
    symbol: string,
    quantity: number,
    salePrice: number,
    sellOrderId: string,
    soldAt: Date,
    method?: CostBasisMethod,
    specificLotIds?: string[],
  ): Promise<LotSale[]> {
    const effectiveMethod =
      method || (await this.getUserMethod(userId, symbol));

    let lotsToSell: TaxLot[];

    if (effectiveMethod === CostBasisMethod.SPECIFIC && specificLotIds) {
      lotsToSell = await this.getSpecificLots(
        manager,
        userId,
        symbol,
        specificLotIds,
      );
    } else {
      lotsToSell = await this.getLotsForMethod(
        manager,
        userId,
        symbol,
        effectiveMethod,
      );
    }

    if (lotsToSell.length === 0) {
      throw new BadRequestException(`No tax lots found for ${symbol}`);
    }

    return this.executeSales(
      manager,
      lotsToSell,
      quantity,
      salePrice,
      sellOrderId,
      soldAt,
      userId,
      symbol,
    );
  }

  /**
   * Get the user's preferred cost basis method for a symbol
   */
  async getUserMethod(
    userId: string,
    symbol: string,
  ): Promise<CostBasisMethod> {
    const pref = await this.prefRepository.findOne({ where: { userId } });
    if (!pref) {
      return CostBasisMethod.FIFO; // Default
    }
    return pref.symbolOverrides[symbol] || pref.defaultMethod;
  }

  /**
   * Get open lots for a position (for specific lot selection UI)
   */
  async getOpenLots(userId: string, symbol?: string): Promise<TaxLot[]> {
    const where: Record<string, unknown> = {
      userId,
      status: TaxLotStatus.OPEN,
    };
    if (symbol) {
      where.symbol = symbol;
    }
    return this.taxLotRepository.find({
      where,
      order: { acquiredAt: 'ASC' },
    });
  }

  /**
   * Get all tax lots for a user (optionally filtered by symbol)
   */
  async getTaxLots(userId: string, symbol?: string): Promise<TaxLot[]> {
    const where: Record<string, unknown> = { userId };
    if (symbol) {
      where.symbol = symbol;
    }
    return this.taxLotRepository.find({
      where,
      order: { acquiredAt: 'DESC' },
    });
  }

  /**
   * Get lot sales for a user
   */
  async getLotSales(
    userId: string,
    options?: {
      symbol?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<LotSale[]> {
    const queryBuilder = this.lotSaleRepository
      .createQueryBuilder('sale')
      .where('sale.userId = :userId', { userId });

    if (options?.symbol) {
      queryBuilder.andWhere('sale.symbol = :symbol', { symbol: options.symbol });
    }
    if (options?.startDate) {
      queryBuilder.andWhere('sale.soldAt >= :startDate', {
        startDate: options.startDate,
      });
    }
    if (options?.endDate) {
      queryBuilder.andWhere('sale.soldAt <= :endDate', {
        endDate: options.endDate,
      });
    }

    queryBuilder.orderBy('sale.soldAt', 'DESC');

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }
    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Get realized gains summary for tax reporting
   */
  async getRealizedGainsSummary(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<RealizedGainsSummary> {
    const results = await this.lotSaleRepository
      .createQueryBuilder('sale')
      .select('sale.gainType', 'gainType')
      .addSelect('SUM(CASE WHEN sale.realizedGain > 0 THEN sale.realizedGain ELSE 0 END)', 'gains')
      .addSelect('SUM(CASE WHEN sale.realizedGain < 0 THEN sale.realizedGain ELSE 0 END)', 'losses')
      .addSelect('SUM(sale.realizedGain)', 'totalGain')
      .addSelect('SUM(sale.proceeds)', 'totalProceeds')
      .addSelect('SUM(sale.costBasis)', 'totalCostBasis')
      .addSelect('COUNT(*)', 'transactionCount')
      .where('sale.userId = :userId', { userId })
      .andWhere('sale.soldAt >= :startDate', { startDate })
      .andWhere('sale.soldAt <= :endDate', { endDate })
      .groupBy('sale.gainType')
      .getRawMany();

    let shortTermGains = 0;
    let shortTermLosses = 0;
    let longTermGains = 0;
    let longTermLosses = 0;
    let transactionCount = 0;

    for (const row of results) {
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
   * Preview cost basis for a potential sale
   */
  async getCostBasisPreview(
    userId: string,
    symbol: string,
    quantity: number,
    salePrice: number,
    method?: CostBasisMethod,
  ): Promise<CostBasisPreview> {
    const effectiveMethod =
      method || (await this.getUserMethod(userId, symbol));

    const lots = await this.getLotsForMethod(
      this.taxLotRepository.manager,
      userId,
      symbol,
      effectiveMethod,
    );

    const now = new Date();
    let remainingToSell = quantity;
    let totalProceeds = 0;
    let totalCostBasis = 0;
    const lotPreviews: CostBasisPreview['lots'] = [];

    for (const lot of lots) {
      if (remainingToSell <= 0) break;

      const quantityFromLot = Math.min(
        Number(lot.remainingQuantity),
        remainingToSell,
      );

      const holdingDays = Math.floor(
        (now.getTime() - lot.acquiredAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const gainType =
        holdingDays > 365 ? GainType.LONG_TERM : GainType.SHORT_TERM;

      const costBasis = Number(lot.costBasisPerShare) * quantityFromLot;
      const proceeds = salePrice * quantityFromLot;
      const estimatedGain = proceeds - costBasis;

      lotPreviews.push({
        lotId: lot.id,
        quantity: quantityFromLot,
        costBasisPerShare: Number(lot.costBasisPerShare),
        acquiredAt: lot.acquiredAt,
        holdingDays,
        gainType,
        estimatedGain,
      });

      totalProceeds += proceeds;
      totalCostBasis += costBasis;
      remainingToSell -= quantityFromLot;
    }

    return {
      method: effectiveMethod,
      estimatedGain: totalProceeds - totalCostBasis,
      estimatedProceeds: totalProceeds,
      estimatedCostBasis: totalCostBasis,
      lots: lotPreviews,
    };
  }

  /**
   * Update user's cost basis preference
   */
  async updateUserPreference(
    userId: string,
    defaultMethod?: CostBasisMethod,
    symbolOverrides?: Record<string, CostBasisMethod>,
  ): Promise<UserCostBasisPreference> {
    let pref = await this.prefRepository.findOne({ where: { userId } });

    if (!pref) {
      pref = this.prefRepository.create({
        userId,
        defaultMethod: defaultMethod || CostBasisMethod.FIFO,
        symbolOverrides: symbolOverrides || {},
      });
    } else {
      if (defaultMethod !== undefined) {
        pref.defaultMethod = defaultMethod;
      }
      if (symbolOverrides !== undefined) {
        pref.symbolOverrides = {
          ...pref.symbolOverrides,
          ...symbolOverrides,
        };
      }
    }

    return this.prefRepository.save(pref);
  }

  /**
   * Get user's cost basis preferences
   */
  async getUserPreference(
    userId: string,
  ): Promise<UserCostBasisPreference | null> {
    return this.prefRepository.findOne({ where: { userId } });
  }

  // ============ Private Helper Methods ============

  /**
   * Get lots ordered by cost basis method
   */
  private async getLotsForMethod(
    manager: EntityManager,
    userId: string,
    symbol: string,
    method: CostBasisMethod,
  ): Promise<TaxLot[]> {
    const baseQuery = manager
      .createQueryBuilder(TaxLot, 'lot')
      .where('lot.userId = :userId', { userId })
      .andWhere('lot.symbol = :symbol', { symbol })
      .andWhere('lot.status = :status', { status: TaxLotStatus.OPEN })
      .andWhere('lot.remainingQuantity > 0');

    switch (method) {
      case CostBasisMethod.FIFO:
        return baseQuery.orderBy('lot.acquiredAt', 'ASC').getMany();

      case CostBasisMethod.LIFO:
        return baseQuery.orderBy('lot.acquiredAt', 'DESC').getMany();

      case CostBasisMethod.HIFO:
        return baseQuery.orderBy('lot.costBasisPerShare', 'DESC').getMany();

      default:
        return baseQuery.orderBy('lot.acquiredAt', 'ASC').getMany();
    }
  }

  /**
   * Get specific lots by ID
   */
  private async getSpecificLots(
    manager: EntityManager,
    userId: string,
    symbol: string,
    lotIds: string[],
  ): Promise<TaxLot[]> {
    if (lotIds.length === 0) {
      return [];
    }

    return manager
      .createQueryBuilder(TaxLot, 'lot')
      .where('lot.userId = :userId', { userId })
      .andWhere('lot.symbol = :symbol', { symbol })
      .andWhere('lot.id IN (:...lotIds)', { lotIds })
      .andWhere('lot.status = :status', { status: TaxLotStatus.OPEN })
      .andWhere('lot.remainingQuantity > 0')
      .orderBy('lot.acquiredAt', 'ASC')
      .getMany();
  }

  /**
   * Execute sales against selected lots
   */
  private async executeSales(
    manager: EntityManager,
    lots: TaxLot[],
    totalQuantity: number,
    salePrice: number,
    sellOrderId: string,
    soldAt: Date,
    userId: string,
    symbol: string,
  ): Promise<LotSale[]> {
    const sales: LotSale[] = [];
    let remainingToSell = totalQuantity;

    for (const lot of lots) {
      if (remainingToSell <= 0) break;

      const quantityFromThisLot = Math.min(
        Number(lot.remainingQuantity),
        remainingToSell,
      );

      // Calculate holding period
      const holdingDays = Math.floor(
        (soldAt.getTime() - lot.acquiredAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const gainType =
        holdingDays > 365 ? GainType.LONG_TERM : GainType.SHORT_TERM;

      // Calculate gains
      const costBasis = Number(lot.costBasisPerShare) * quantityFromThisLot;
      const proceeds = salePrice * quantityFromThisLot;
      const realizedGain = proceeds - costBasis;

      // Create LotSale record
      const sale = manager.create(LotSale, {
        taxLotId: lot.id,
        sellOrderId,
        userId,
        symbol,
        quantitySold: quantityFromThisLot,
        costBasisPerShare: lot.costBasisPerShare,
        salePrice,
        realizedGain,
        proceeds,
        costBasis,
        gainType,
        holdingDays,
        soldAt,
      });
      sales.push(await manager.save(sale));

      // Update lot
      const newRemaining = Number(lot.remainingQuantity) - quantityFromThisLot;
      await manager.update(TaxLot, lot.id, {
        remainingQuantity: newRemaining,
        status: newRemaining <= 0 ? TaxLotStatus.CLOSED : TaxLotStatus.OPEN,
        closedAt: newRemaining <= 0 ? soldAt : null,
      });

      remainingToSell -= quantityFromThisLot;

      this.logger.log(
        `Sold ${quantityFromThisLot} shares from lot ${lot.id} ` +
          `(${gainType}): $${realizedGain.toFixed(2)} gain/loss`,
      );
    }

    if (remainingToSell > 0) {
      this.logger.warn(
        `Not enough shares in lots to cover sale of ${totalQuantity} ${symbol}. ` +
          `Remaining: ${remainingToSell}`,
      );
    }

    return sales;
  }
}
