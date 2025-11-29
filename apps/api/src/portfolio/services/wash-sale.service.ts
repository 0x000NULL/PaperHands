import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { WashSale, WashSaleType } from '../entities/wash-sale.entity';
import { LotSale } from '../entities/lot-sale.entity';
import { TaxLot } from '../entities/tax-lot.entity';
import { OptionClosure } from '../entities/option-closure.entity';

interface OptionPositionQueryResult {
  id: string;
  optionSymbol: string;
  quantity: number;
  createdAt: Date;
}

const WASH_SALE_WINDOW_DAYS = 30;

interface WashSaleDetectionResult {
  isWashSale: boolean;
  washSale?: WashSale;
  replacementPurchase?: {
    type: 'stock' | 'option';
    id: string;
    symbol: string;
    date: Date;
    quantity: number;
  };
}

interface WashSaleSummary {
  totalDisallowedLosses: number;
  totalWashSales: number;
  bySymbol: {
    symbol: string;
    disallowedLoss: number;
    count: number;
  }[];
  byType: {
    type: WashSaleType;
    disallowedLoss: number;
    count: number;
  }[];
}

@Injectable()
export class WashSaleService {
  private readonly logger = new Logger(WashSaleService.name);

  constructor(
    @InjectRepository(WashSale)
    private washSaleRepository: Repository<WashSale>,
    @InjectRepository(LotSale)
    private lotSaleRepository: Repository<LotSale>,
    @InjectRepository(TaxLot)
    private taxLotRepository: Repository<TaxLot>,
    @InjectRepository(OptionClosure)
    private optionClosureRepository: Repository<OptionClosure>,
  ) {}

  /**
   * Detect wash sale for a stock sale (LotSale)
   */
  async detectWashSaleForStockSale(
    lotSale: LotSale,
  ): Promise<WashSaleDetectionResult> {
    // Only check for losses
    if (lotSale.realizedGain >= 0) {
      return { isWashSale: false };
    }

    const saleDate = new Date(lotSale.soldAt);
    const windowStart = new Date(saleDate);
    windowStart.setDate(windowStart.getDate() - WASH_SALE_WINDOW_DAYS);
    const windowEnd = new Date(saleDate);
    windowEnd.setDate(windowEnd.getDate() + WASH_SALE_WINDOW_DAYS);

    // Check for replacement stock purchases
    const replacementStockLot = await this.findReplacementStockPurchase(
      lotSale.userId,
      lotSale.symbol,
      saleDate,
      windowStart,
      windowEnd,
      lotSale.taxLotId, // Exclude the original lot
    );

    if (replacementStockLot) {
      const washSale = await this.recordWashSale({
        userId: lotSale.userId,
        symbol: lotSale.symbol,
        washSaleType: WashSaleType.STOCK_TO_STOCK,
        triggeringSaleId: lotSale.id,
        replacementTaxLotId: replacementStockLot.id,
        originalLoss: lotSale.realizedGain,
        quantityAffected: Math.min(
          lotSale.quantitySold,
          Number(replacementStockLot.originalQuantity),
        ),
        saleDate,
        replacementDate: new Date(replacementStockLot.acquiredAt),
      });

      return {
        isWashSale: true,
        washSale,
        replacementPurchase: {
          type: 'stock',
          id: replacementStockLot.id,
          symbol: lotSale.symbol,
          date: new Date(replacementStockLot.acquiredAt),
          quantity: Number(replacementStockLot.originalQuantity),
        },
      };
    }

    // Check for replacement option purchases (calls on the same underlying)
    const replacementOption = await this.findReplacementCallOption(
      lotSale.userId,
      lotSale.symbol,
      saleDate,
      windowStart,
      windowEnd,
    );

    if (replacementOption) {
      const washSale = await this.recordWashSale({
        userId: lotSale.userId,
        symbol: lotSale.symbol,
        washSaleType: WashSaleType.STOCK_TO_OPTION,
        triggeringSaleId: lotSale.id,
        replacementOptionSymbol: replacementOption.optionSymbol,
        originalLoss: lotSale.realizedGain,
        quantityAffected: Math.min(
          lotSale.quantitySold,
          Math.abs(replacementOption.quantity) * 100,
        ),
        saleDate,
        replacementDate: new Date(replacementOption.createdAt),
      });

      return {
        isWashSale: true,
        washSale,
        replacementPurchase: {
          type: 'option',
          id: replacementOption.id,
          symbol: replacementOption.optionSymbol,
          date: new Date(replacementOption.createdAt),
          quantity: Math.abs(replacementOption.quantity) * 100,
        },
      };
    }

    return { isWashSale: false };
  }

  /**
   * Detect wash sale for an option closure
   */
  async detectWashSaleForOptionClosure(
    closure: OptionClosure,
  ): Promise<WashSaleDetectionResult> {
    // Only check for losses
    if (closure.realizedGain >= 0) {
      return { isWashSale: false };
    }

    const saleDate = new Date(closure.closedAt);
    const windowStart = new Date(saleDate);
    windowStart.setDate(windowStart.getDate() - WASH_SALE_WINDOW_DAYS);
    const windowEnd = new Date(saleDate);
    windowEnd.setDate(windowEnd.getDate() + WASH_SALE_WINDOW_DAYS);

    // Check for replacement option purchases (substantially identical)
    const replacementOption = await this.findSubstantiallyIdenticalOption(
      closure.userId,
      closure.underlyingSymbol,
      closure.optionType as 'call' | 'put',
      Number(closure.strikePrice),
      closure.id,
      saleDate,
      windowStart,
      windowEnd,
    );

    if (replacementOption) {
      const washSale = await this.recordWashSale({
        userId: closure.userId,
        symbol: closure.underlyingSymbol,
        washSaleType: WashSaleType.OPTION_TO_OPTION,
        triggeringOptionClosureId: closure.id,
        replacementOptionSymbol: replacementOption.optionSymbol,
        originalLoss: Number(closure.realizedGain),
        quantityAffected: Math.min(
          Math.abs(closure.quantityClosed),
          Math.abs(replacementOption.quantity),
        ),
        saleDate,
        replacementDate: new Date(replacementOption.createdAt),
      });

      return {
        isWashSale: true,
        washSale,
        replacementPurchase: {
          type: 'option',
          id: replacementOption.id,
          symbol: replacementOption.optionSymbol,
          date: new Date(replacementOption.createdAt),
          quantity: Math.abs(replacementOption.quantity),
        },
      };
    }

    // For call options, check for replacement stock purchases
    if (String(closure.optionType) === 'call') {
      const replacementStock = await this.findReplacementStockPurchase(
        closure.userId,
        closure.underlyingSymbol,
        saleDate,
        windowStart,
        windowEnd,
      );

      if (replacementStock) {
        const washSale = await this.recordWashSale({
          userId: closure.userId,
          symbol: closure.underlyingSymbol,
          washSaleType: WashSaleType.OPTION_TO_STOCK,
          triggeringOptionClosureId: closure.id,
          replacementTaxLotId: replacementStock.id,
          originalLoss: Number(closure.realizedGain),
          quantityAffected: Math.min(
            Math.abs(closure.quantityClosed) * 100,
            Number(replacementStock.originalQuantity),
          ),
          saleDate,
          replacementDate: new Date(replacementStock.acquiredAt),
        });

        return {
          isWashSale: true,
          washSale,
          replacementPurchase: {
            type: 'stock',
            id: replacementStock.id,
            symbol: closure.underlyingSymbol,
            date: new Date(replacementStock.acquiredAt),
            quantity: Number(replacementStock.originalQuantity),
          },
        };
      }
    }

    return { isWashSale: false };
  }

  /**
   * Find replacement stock purchase within wash sale window
   */
  private async findReplacementStockPurchase(
    userId: string,
    symbol: string,
    saleDate: Date,
    windowStart: Date,
    windowEnd: Date,
    excludeLotId?: string,
  ): Promise<TaxLot | null> {
    const queryBuilder = this.taxLotRepository
      .createQueryBuilder('lot')
      .where('lot.userId = :userId', { userId })
      .andWhere('lot.symbol = :symbol', { symbol })
      .andWhere('lot.acquiredAt BETWEEN :windowStart AND :windowEnd', {
        windowStart,
        windowEnd,
      })
      .andWhere('lot.acquiredAt != :saleDate', { saleDate }); // Exclude same-day transactions

    if (excludeLotId) {
      queryBuilder.andWhere('lot.id != :excludeLotId', { excludeLotId });
    }

    return queryBuilder.orderBy('lot.acquiredAt', 'ASC').getOne();
  }

  /**
   * Find replacement call option purchase
   */
  private async findReplacementCallOption(
    userId: string,
    underlyingSymbol: string,
    saleDate: Date,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<OptionPositionQueryResult | null> {
    // Look for open long call positions acquired within the window
    const result: OptionPositionQueryResult[] =
      await this.optionClosureRepository.manager.query(
        `
      SELECT op.id, op."optionSymbol", op.quantity, op."createdAt"
      FROM option_positions op
      WHERE op."userId" = $1
        AND op."underlyingSymbol" = $2
        AND op."optionType" = 'call'
        AND op.quantity > 0
        AND op."createdAt" BETWEEN $3 AND $4
        AND op."createdAt" != $5
      ORDER BY op."createdAt" ASC
      LIMIT 1
      `,
        [userId, underlyingSymbol, windowStart, windowEnd, saleDate],
      );

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Find substantially identical option
   */
  private async findSubstantiallyIdenticalOption(
    userId: string,
    underlyingSymbol: string,
    optionType: 'call' | 'put',
    strikePrice: number,
    _excludeClosureId: string,
    saleDate: Date,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<OptionPositionQueryResult | null> {
    // Look for options with same underlying, type, and similar strike (within 5%)
    const strikeLow = strikePrice * 0.95;
    const strikeHigh = strikePrice * 1.05;

    const result: OptionPositionQueryResult[] =
      await this.optionClosureRepository.manager.query(
        `
      SELECT op.id, op."optionSymbol", op.quantity, op."createdAt"
      FROM option_positions op
      WHERE op."userId" = $1
        AND op."underlyingSymbol" = $2
        AND op."optionType" = $3
        AND op."strikePrice" BETWEEN $4 AND $5
        AND op.quantity > 0
        AND op."createdAt" BETWEEN $6 AND $7
        AND op."createdAt" != $8
      ORDER BY op."createdAt" ASC
      LIMIT 1
      `,
        [
          userId,
          underlyingSymbol,
          optionType,
          strikeLow,
          strikeHigh,
          windowStart,
          windowEnd,
          saleDate,
        ],
      );

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Record a wash sale
   */
  private async recordWashSale(params: {
    userId: string;
    symbol: string;
    washSaleType: WashSaleType;
    triggeringSaleId?: string;
    triggeringOptionClosureId?: string;
    replacementTaxLotId?: string;
    replacementOptionSymbol?: string;
    originalLoss: number;
    quantityAffected: number;
    saleDate: Date;
    replacementDate: Date;
  }): Promise<WashSale> {
    const daysBetween = Math.round(
      (params.replacementDate.getTime() - params.saleDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // Calculate disallowed loss (proportional if partial replacement)
    const disallowedLoss = params.originalLoss; // Full loss disallowed for now
    const costBasisAdjustment = Math.abs(disallowedLoss);

    const washSale = this.washSaleRepository.create({
      userId: params.userId,
      symbol: params.symbol,
      washSaleType: params.washSaleType,
      triggeringSaleId: params.triggeringSaleId || null,
      triggeringOptionClosureId: params.triggeringOptionClosureId || null,
      replacementTaxLotId: params.replacementTaxLotId || null,
      replacementOptionSymbol: params.replacementOptionSymbol || null,
      disallowedLoss,
      originalLoss: params.originalLoss,
      quantityAffected: params.quantityAffected,
      costBasisAdjustment,
      saleDate: params.saleDate,
      replacementDate: params.replacementDate,
      daysBetween,
      taxYear: params.saleDate.getFullYear(),
      notes: `Wash sale detected: ${params.washSaleType}. Replacement purchased ${Math.abs(daysBetween)} days ${daysBetween >= 0 ? 'after' : 'before'} sale.`,
    });

    const savedWashSale = await this.washSaleRepository.save(washSale);

    // Adjust cost basis on replacement lot if it's a stock
    if (params.replacementTaxLotId) {
      await this.adjustReplacementLotCostBasis(
        params.replacementTaxLotId,
        costBasisAdjustment,
        params.quantityAffected,
      );
    }

    this.logger.log(
      `Wash sale recorded for ${params.symbol}: ${params.washSaleType}, ` +
        `disallowed loss: $${Math.abs(disallowedLoss).toFixed(2)}`,
    );

    return savedWashSale;
  }

  /**
   * Adjust cost basis on replacement tax lot
   */
  private async adjustReplacementLotCostBasis(
    taxLotId: string,
    adjustment: number,
    quantity: number,
  ): Promise<void> {
    const lot = await this.taxLotRepository.findOne({
      where: { id: taxLotId },
    });
    if (!lot) return;

    const perShareAdjustment = adjustment / quantity;
    const newCostBasis = Number(lot.costBasisPerShare) + perShareAdjustment;

    await this.taxLotRepository.update(taxLotId, {
      costBasisPerShare: newCostBasis,
    });

    this.logger.log(
      `Adjusted cost basis for lot ${taxLotId}: +$${perShareAdjustment.toFixed(4)}/share`,
    );
  }

  /**
   * Get wash sales for a user
   */
  async getWashSales(
    userId: string,
    options?: {
      taxYear?: number;
      symbol?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<WashSale[]> {
    const queryBuilder = this.washSaleRepository
      .createQueryBuilder('ws')
      .where('ws.userId = :userId', { userId });

    if (options?.taxYear) {
      queryBuilder.andWhere('ws.taxYear = :taxYear', {
        taxYear: options.taxYear,
      });
    }

    if (options?.symbol) {
      queryBuilder.andWhere('ws.symbol = :symbol', { symbol: options.symbol });
    }

    queryBuilder.orderBy('ws.saleDate', 'DESC');

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Get wash sale summary for tax reporting
   */
  async getWashSaleSummary(
    userId: string,
    taxYear?: number,
  ): Promise<WashSaleSummary> {
    const currentYear = taxYear || new Date().getFullYear();

    const washSales = await this.washSaleRepository.find({
      where: {
        userId,
        taxYear: currentYear,
      },
    });

    const bySymbol = new Map<
      string,
      { disallowedLoss: number; count: number }
    >();
    const byType = new Map<
      WashSaleType,
      { disallowedLoss: number; count: number }
    >();

    let totalDisallowedLosses = 0;

    for (const ws of washSales) {
      totalDisallowedLosses += Math.abs(Number(ws.disallowedLoss));

      // Group by symbol
      const symbolData = bySymbol.get(ws.symbol) || {
        disallowedLoss: 0,
        count: 0,
      };
      symbolData.disallowedLoss += Math.abs(Number(ws.disallowedLoss));
      symbolData.count += 1;
      bySymbol.set(ws.symbol, symbolData);

      // Group by type
      const typeData = byType.get(ws.washSaleType) || {
        disallowedLoss: 0,
        count: 0,
      };
      typeData.disallowedLoss += Math.abs(Number(ws.disallowedLoss));
      typeData.count += 1;
      byType.set(ws.washSaleType, typeData);
    }

    return {
      totalDisallowedLosses,
      totalWashSales: washSales.length,
      bySymbol: Array.from(bySymbol.entries()).map(([symbol, data]) => ({
        symbol,
        ...data,
      })),
      byType: Array.from(byType.entries()).map(([type, data]) => ({
        type,
        ...data,
      })),
    };
  }

  /**
   * Check if a potential purchase would trigger a wash sale
   * (call this before placing an order to warn the user)
   */
  async wouldTriggerWashSale(
    userId: string,
    symbol: string,
    purchaseDate: Date = new Date(),
  ): Promise<{
    wouldTrigger: boolean;
    recentLosses: {
      type: 'stock' | 'option';
      date: Date;
      loss: number;
    }[];
  }> {
    const windowStart = new Date(purchaseDate);
    windowStart.setDate(windowStart.getDate() - WASH_SALE_WINDOW_DAYS);

    // Check for recent stock losses
    const recentStockLosses = await this.lotSaleRepository.find({
      where: {
        userId,
        symbol,
        soldAt: Between(windowStart, purchaseDate),
        realizedGain: LessThan(0),
      },
      order: { soldAt: 'DESC' },
    });

    // Check for recent option losses
    const recentOptionLosses = await this.optionClosureRepository.find({
      where: {
        userId,
        underlyingSymbol: symbol,
        closedAt: Between(windowStart, purchaseDate),
        realizedGain: LessThan(0),
      },
      order: { closedAt: 'DESC' },
    });

    const recentLosses = [
      ...recentStockLosses.map((s) => ({
        type: 'stock' as const,
        date: new Date(s.soldAt),
        loss: Number(s.realizedGain),
      })),
      ...recentOptionLosses.map((o) => ({
        type: 'option' as const,
        date: new Date(o.closedAt),
        loss: Number(o.realizedGain),
      })),
    ];

    return {
      wouldTrigger: recentLosses.length > 0,
      recentLosses,
    };
  }
}
