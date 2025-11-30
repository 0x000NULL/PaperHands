import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WashSale, WashSaleType } from '../entities/wash-sale.entity';
import { LotSale } from '../entities/lot-sale.entity';
import { TaxLot } from '../entities/tax-lot.entity';
import { OptionClosure } from '../entities/option-closure.entity';
import { WashSaleDetectorService, WashSaleDetectionResult as DetectorResult } from './wash-sale-detector.service';
import { WashSaleQueueService } from './wash-sale-queue.service';

/**
 * Public detection result returned by WashSaleService.
 */
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

/**
 * Service for wash sale detection and management.
 *
 * This is the public-facing service that orchestrates wash sale detection.
 * It delegates to:
 * - WashSaleDetectorService for detection logic
 * - WashSaleQueueService for background job scheduling
 *
 * The service provides both synchronous (immediate) and asynchronous (queued)
 * wash sale detection options.
 */
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
    private readonly detector: WashSaleDetectorService,
    private readonly queue: WashSaleQueueService,
  ) {}

  /**
   * Detect wash sale for a stock sale (LotSale) - synchronous detection.
   * For asynchronous (background) detection, use queueDetectionForStockSale().
   */
  async detectWashSaleForStockSale(
    lotSale: LotSale,
  ): Promise<WashSaleDetectionResult> {
    const result = await this.detector.detectForStockSale(lotSale);

    if (!result.isWashSale || !result.replacementPurchase) {
      return { isWashSale: false };
    }

    // Record the wash sale
    const washSale = await this.recordWashSale({
      userId: lotSale.userId,
      symbol: lotSale.symbol,
      washSaleType: result.washSaleType as WashSaleType,
      triggeringSaleId: lotSale.id,
      replacementTaxLotId: result.replacementPurchase.type === 'stock' ? result.replacementPurchase.id : undefined,
      replacementOptionSymbol: result.replacementPurchase.optionSymbol,
      originalLoss: result.triggeringSale.loss,
      quantityAffected: result.quantityAffected!,
      saleDate: result.triggeringSale.date,
      replacementDate: result.replacementPurchase.date,
    });

    return {
      isWashSale: true,
      washSale,
      replacementPurchase: result.replacementPurchase,
    };
  }

  /**
   * Queue wash sale detection for a stock sale (asynchronous).
   * Returns the job ID for tracking.
   */
  async queueDetectionForStockSale(lotSaleId: string): Promise<string> {
    return this.queue.queueStockSaleDetection(lotSaleId);
  }

  /**
   * Detect wash sale for an option closure - synchronous detection.
   * For asynchronous (background) detection, use queueDetectionForOptionClosure().
   */
  async detectWashSaleForOptionClosure(
    closure: OptionClosure,
  ): Promise<WashSaleDetectionResult> {
    const result = await this.detector.detectForOptionClosure(closure);

    if (!result.isWashSale || !result.replacementPurchase) {
      return { isWashSale: false };
    }

    // Record the wash sale
    const washSale = await this.recordWashSale({
      userId: closure.userId,
      symbol: closure.underlyingSymbol,
      washSaleType: result.washSaleType as WashSaleType,
      triggeringOptionClosureId: closure.id,
      replacementTaxLotId: result.replacementPurchase.type === 'stock' ? result.replacementPurchase.id : undefined,
      replacementOptionSymbol: result.replacementPurchase.optionSymbol,
      originalLoss: result.triggeringSale.loss,
      quantityAffected: result.quantityAffected!,
      saleDate: result.triggeringSale.date,
      replacementDate: result.replacementPurchase.date,
    });

    return {
      isWashSale: true,
      washSale,
      replacementPurchase: result.replacementPurchase,
    };
  }

  /**
   * Queue wash sale detection for an option closure (asynchronous).
   * Returns the job ID for tracking.
   */
  async queueDetectionForOptionClosure(optionClosureId: string): Promise<string> {
    return this.queue.queueOptionClosureDetection(optionClosureId);
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
    return this.detector.wouldPurchaseTriggerWashSale(userId, symbol, purchaseDate);
  }

  /**
   * Queue a batch scan for a user's recent sales.
   * Useful for backfilling wash sale records.
   */
  async queueBatchScanForUser(userId: string, sinceDate?: Date): Promise<string> {
    return this.queue.queueBatchScanForUser(userId, sinceDate);
  }

  /**
   * Get queue statistics for monitoring.
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    return this.queue.getQueueStats();
  }
}
