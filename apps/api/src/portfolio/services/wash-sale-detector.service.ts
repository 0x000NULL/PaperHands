import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxLot } from '../entities/tax-lot.entity';
import { OptionClosure } from '../entities/option-closure.entity';
import { LotSale } from '../entities/lot-sale.entity';
import { WashSaleWindow } from '../domain/wash-sale-window';
import { SubstantiallyIdenticalRules } from '../domain/substantially-identical.rules';

/**
 * Result of a replacement security search.
 */
export interface ReplacementSecurityResult {
  type: 'stock' | 'option';
  id: string;
  symbol: string;
  date: Date;
  quantity: number;
  optionSymbol?: string;
}

/**
 * Detection result returned by the detector.
 */
export interface WashSaleDetectionResult {
  isWashSale: boolean;
  triggeringSale: {
    type: 'stock' | 'option';
    id: string;
    symbol: string;
    loss: number;
    date: Date;
  };
  replacementPurchase?: ReplacementSecurityResult;
  washSaleType?:
    | 'STOCK_TO_STOCK'
    | 'STOCK_TO_OPTION'
    | 'OPTION_TO_STOCK'
    | 'OPTION_TO_OPTION';
  quantityAffected?: number;
  daysBetween?: number;
}

/**
 * Query result for option position searches.
 */
interface OptionPositionQueryResult {
  id: string;
  optionSymbol: string;
  underlyingSymbol: string;
  optionType: string;
  quantity: number;
  strikePrice: number;
  createdAt: Date;
}

/**
 * Service responsible for detecting wash sales.
 *
 * This service extracts the detection logic from WashSaleService,
 * using domain objects for window calculations and substantially identical rules.
 * It does NOT record wash sales - that responsibility remains with WashSaleService.
 */
@Injectable()
export class WashSaleDetectorService {
  private readonly logger = new Logger(WashSaleDetectorService.name);

  constructor(
    @InjectRepository(TaxLot)
    private readonly taxLotRepository: Repository<TaxLot>,
    @InjectRepository(OptionClosure)
    private readonly optionClosureRepository: Repository<OptionClosure>,
    @InjectRepository(LotSale)
    private readonly lotSaleRepository: Repository<LotSale>,
  ) {}

  /**
   * Detect if a stock sale (LotSale) triggers a wash sale.
   * Returns detection result without recording the wash sale.
   */
  async detectForStockSale(lotSale: LotSale): Promise<WashSaleDetectionResult> {
    const triggeringSale = {
      type: 'stock' as const,
      id: lotSale.id,
      symbol: lotSale.symbol,
      loss: Number(lotSale.realizedGain),
      date: new Date(lotSale.soldAt),
    };

    // Only check for losses
    if (lotSale.realizedGain >= 0) {
      return { isWashSale: false, triggeringSale };
    }

    const window = WashSaleWindow.fromSaleDate(new Date(lotSale.soldAt));
    const bounds = window.getQueryBounds();

    // Check for replacement stock purchases
    const replacementStock = await this.findReplacementStockPurchase(
      lotSale.userId,
      lotSale.symbol,
      bounds.windowStart,
      bounds.windowEnd,
      bounds.saleDate,
      lotSale.taxLotId,
    );

    if (replacementStock) {
      const daysBetween = window.getDaysBetween(replacementStock.date);
      const quantityAffected = Math.min(
        lotSale.quantitySold,
        replacementStock.quantity,
      );

      return {
        isWashSale: true,
        triggeringSale,
        replacementPurchase: replacementStock,
        washSaleType: 'STOCK_TO_STOCK',
        quantityAffected,
        daysBetween,
      };
    }

    // Check for replacement call option purchases (stock to call is substantially identical)
    const replacementCall = await this.findReplacementCallOption(
      lotSale.userId,
      lotSale.symbol,
      bounds.windowStart,
      bounds.windowEnd,
      bounds.saleDate,
    );

    if (replacementCall) {
      const daysBetween = window.getDaysBetween(replacementCall.date);
      const quantityAffected = Math.min(
        lotSale.quantitySold,
        replacementCall.quantity * 100, // Each contract = 100 shares
      );

      return {
        isWashSale: true,
        triggeringSale,
        replacementPurchase: replacementCall,
        washSaleType: 'STOCK_TO_OPTION',
        quantityAffected,
        daysBetween,
      };
    }

    return { isWashSale: false, triggeringSale };
  }

  /**
   * Detect if an option closure triggers a wash sale.
   * Returns detection result without recording the wash sale.
   */
  async detectForOptionClosure(
    closure: OptionClosure,
  ): Promise<WashSaleDetectionResult> {
    const triggeringSale = {
      type: 'option' as const,
      id: closure.id,
      symbol: closure.underlyingSymbol,
      loss: Number(closure.realizedGain),
      date: new Date(closure.closedAt),
    };

    // Only check for losses
    if (Number(closure.realizedGain) >= 0) {
      return { isWashSale: false, triggeringSale };
    }

    const window = WashSaleWindow.fromSaleDate(new Date(closure.closedAt));
    const bounds = window.getQueryBounds();
    const optionType = String(closure.optionType) as 'call' | 'put';

    // Check for replacement option purchases (substantially identical options)
    const replacementOption = await this.findSubstantiallyIdenticalOption(
      closure.userId,
      closure.underlyingSymbol,
      optionType,
      Number(closure.strikePrice),
      bounds.windowStart,
      bounds.windowEnd,
      bounds.saleDate,
      closure.id,
    );

    if (replacementOption) {
      const daysBetween = window.getDaysBetween(replacementOption.date);
      const quantityAffected = Math.min(
        Math.abs(closure.quantityClosed),
        replacementOption.quantity,
      );

      return {
        isWashSale: true,
        triggeringSale,
        replacementPurchase: replacementOption,
        washSaleType: 'OPTION_TO_OPTION',
        quantityAffected,
        daysBetween,
      };
    }

    // For call options, check for replacement stock purchases (call to stock is substantially identical)
    if (optionType === 'call') {
      const replacementStock = await this.findReplacementStockPurchase(
        closure.userId,
        closure.underlyingSymbol,
        bounds.windowStart,
        bounds.windowEnd,
        bounds.saleDate,
      );

      if (replacementStock) {
        const daysBetween = window.getDaysBetween(replacementStock.date);
        const quantityAffected = Math.min(
          Math.abs(closure.quantityClosed) * 100,
          replacementStock.quantity,
        );

        return {
          isWashSale: true,
          triggeringSale,
          replacementPurchase: replacementStock,
          washSaleType: 'OPTION_TO_STOCK',
          quantityAffected,
          daysBetween,
        };
      }
    }

    return { isWashSale: false, triggeringSale };
  }

  /**
   * Check if a potential purchase would trigger a wash sale.
   * Used to warn users before placing orders.
   */
  async wouldPurchaseTriggerWashSale(
    userId: string,
    symbol: string,
    purchaseDate: Date = new Date(),
  ): Promise<{
    wouldTrigger: boolean;
    recentLosses: Array<{
      type: 'stock' | 'option';
      date: Date;
      loss: number;
    }>;
  }> {
    const window = WashSaleWindow.fromSaleDate(purchaseDate);
    // For purchases, we look BACKWARD in the window (sales before purchase)
    const windowStart = window.startDate;

    // Check for recent stock losses
    const recentStockLosses = await this.lotSaleRepository
      .createQueryBuilder('ls')
      .where('ls.userId = :userId', { userId })
      .andWhere('ls.symbol = :symbol', { symbol })
      .andWhere('ls.soldAt BETWEEN :windowStart AND :purchaseDate', {
        windowStart,
        purchaseDate,
      })
      .andWhere('ls.realizedGain < 0')
      .orderBy('ls.soldAt', 'DESC')
      .getMany();

    // Check for recent option losses on this underlying
    const recentOptionLosses = await this.optionClosureRepository
      .createQueryBuilder('oc')
      .where('oc.userId = :userId', { userId })
      .andWhere('oc.underlyingSymbol = :symbol', { symbol })
      .andWhere('oc.closedAt BETWEEN :windowStart AND :purchaseDate', {
        windowStart,
        purchaseDate,
      })
      .andWhere('oc.realizedGain < 0')
      .orderBy('oc.closedAt', 'DESC')
      .getMany();

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

  /**
   * Find replacement stock purchase within wash sale window.
   */
  private async findReplacementStockPurchase(
    userId: string,
    symbol: string,
    windowStart: Date,
    windowEnd: Date,
    saleDate: Date,
    excludeLotId?: string,
  ): Promise<ReplacementSecurityResult | null> {
    const queryBuilder = this.taxLotRepository
      .createQueryBuilder('lot')
      .where('lot.userId = :userId', { userId })
      .andWhere('lot.symbol = :symbol', { symbol })
      .andWhere('lot.acquiredAt BETWEEN :windowStart AND :windowEnd', {
        windowStart,
        windowEnd,
      })
      .andWhere('lot.acquiredAt != :saleDate', { saleDate });

    if (excludeLotId) {
      queryBuilder.andWhere('lot.id != :excludeLotId', { excludeLotId });
    }

    const lot = await queryBuilder.orderBy('lot.acquiredAt', 'ASC').getOne();

    if (!lot) return null;

    return {
      type: 'stock',
      id: lot.id,
      symbol: lot.symbol,
      date: new Date(lot.acquiredAt),
      quantity: Number(lot.originalQuantity),
    };
  }

  /**
   * Find replacement call option purchase.
   * Per IRS rules, long calls on the same underlying are substantially identical to the stock.
   */
  private async findReplacementCallOption(
    userId: string,
    underlyingSymbol: string,
    windowStart: Date,
    windowEnd: Date,
    saleDate: Date,
  ): Promise<ReplacementSecurityResult | null> {
    // Look for open long call positions acquired within the window
    const result: OptionPositionQueryResult[] =
      await this.optionClosureRepository.manager.query(
        `
        SELECT op.id, op."optionSymbol", op."underlyingSymbol", op."optionType",
               op.quantity, op."strikePrice", op."createdAt"
        FROM option_positions op
        WHERE op."userId" = $1
          AND op."underlyingSymbol" = $2
          AND op."optionType" = 'call'
          AND op.quantity > 0
          AND op."createdAt" BETWEEN $3 AND $4
          AND DATE(op."createdAt") != DATE($5)
        ORDER BY op."createdAt" ASC
        LIMIT 1
        `,
        [userId, underlyingSymbol, windowStart, windowEnd, saleDate],
      );

    if (result.length === 0) return null;

    const option = result[0];
    return {
      type: 'option',
      id: option.id,
      symbol: underlyingSymbol,
      optionSymbol: option.optionSymbol,
      date: new Date(option.createdAt),
      quantity: Math.abs(option.quantity),
    };
  }

  /**
   * Find substantially identical option.
   * Uses SubstantiallyIdenticalRules to determine strike price bounds.
   */
  private async findSubstantiallyIdenticalOption(
    userId: string,
    underlyingSymbol: string,
    optionType: 'call' | 'put',
    strikePrice: number,
    windowStart: Date,
    windowEnd: Date,
    saleDate: Date,
    excludeClosureId: string,
  ): Promise<ReplacementSecurityResult | null> {
    // Use domain object to get strike bounds
    const strikeBounds =
      SubstantiallyIdenticalRules.getStrikeBounds(strikePrice);

    const result: OptionPositionQueryResult[] =
      await this.optionClosureRepository.manager.query(
        `
        SELECT op.id, op."optionSymbol", op."underlyingSymbol", op."optionType",
               op.quantity, op."strikePrice", op."createdAt"
        FROM option_positions op
        WHERE op."userId" = $1
          AND op."underlyingSymbol" = $2
          AND op."optionType" = $3
          AND op."strikePrice" BETWEEN $4 AND $5
          AND op.quantity > 0
          AND op."createdAt" BETWEEN $6 AND $7
          AND DATE(op."createdAt") != DATE($8)
        ORDER BY op."createdAt" ASC
        LIMIT 1
        `,
        [
          userId,
          underlyingSymbol,
          optionType,
          strikeBounds.low,
          strikeBounds.high,
          windowStart,
          windowEnd,
          saleDate,
        ],
      );

    if (result.length === 0) return null;

    const option = result[0];

    // Double-check with domain object
    const isIdentical = SubstantiallyIdenticalRules.isSubstantiallyIdentical(
      { symbol: underlyingSymbol, type: optionType, strikePrice },
      {
        symbol: underlyingSymbol,
        type: optionType,
        strikePrice: option.strikePrice,
      },
    );

    if (!isIdentical) return null;

    return {
      type: 'option',
      id: option.id,
      symbol: underlyingSymbol,
      optionSymbol: option.optionSymbol,
      date: new Date(option.createdAt),
      quantity: Math.abs(option.quantity),
    };
  }
}
