import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { LotSale } from '../entities/lot-sale.entity';
import { OptionClosure } from '../entities/option-closure.entity';
import { WashSale, WashSaleType } from '../entities/wash-sale.entity';
import { TaxLot } from '../entities/tax-lot.entity';
import { WashSaleDetectorService, WashSaleDetectionResult } from '../services/wash-sale-detector.service';

export const WASH_SALE_QUEUE = 'wash-sale-detection';

/**
 * Job types for wash sale detection queue.
 */
export enum WashSaleJobType {
  /** Detect wash sale for a specific stock sale */
  DETECT_FOR_STOCK_SALE = 'detect-for-stock-sale',
  /** Detect wash sale for a specific option closure */
  DETECT_FOR_OPTION_CLOSURE = 'detect-for-option-closure',
  /** Batch scan for a user's recent sales */
  BATCH_SCAN_USER = 'batch-scan-user',
  /** Scan all users for recent unprocessed sales (scheduled job) */
  SCAN_ALL_USERS = 'scan-all-users',
}

/**
 * Job data interfaces.
 */
export interface DetectStockSaleJobData {
  lotSaleId: string;
}

export interface DetectOptionClosureJobData {
  optionClosureId: string;
}

export interface BatchScanUserJobData {
  userId: string;
  sinceDate?: string; // ISO date string
}

/**
 * BullMQ processor for background wash sale detection.
 *
 * This processor handles wash sale detection asynchronously,
 * allowing the main order execution flow to remain fast.
 *
 * Jobs are processed with:
 * - Automatic retries on failure
 * - Deduplication to avoid double-processing
 * - Batch scanning for historical analysis
 */
@Processor(WASH_SALE_QUEUE)
@Injectable()
export class WashSaleDetectionProcessor extends WorkerHost {
  private readonly logger = new Logger(WashSaleDetectionProcessor.name);

  constructor(
    private readonly detector: WashSaleDetectorService,
    @InjectRepository(LotSale)
    private readonly lotSaleRepository: Repository<LotSale>,
    @InjectRepository(OptionClosure)
    private readonly optionClosureRepository: Repository<OptionClosure>,
    @InjectRepository(WashSale)
    private readonly washSaleRepository: Repository<WashSale>,
    @InjectRepository(TaxLot)
    private readonly taxLotRepository: Repository<TaxLot>,
  ) {
    super();
  }

  async process(job: Job<unknown>): Promise<unknown> {
    switch (job.name) {
      case WashSaleJobType.DETECT_FOR_STOCK_SALE:
        return this.processStockSaleDetection(job as Job<DetectStockSaleJobData>);

      case WashSaleJobType.DETECT_FOR_OPTION_CLOSURE:
        return this.processOptionClosureDetection(job as Job<DetectOptionClosureJobData>);

      case WashSaleJobType.BATCH_SCAN_USER:
        return this.processBatchScanUser(job as Job<BatchScanUserJobData>);

      case WashSaleJobType.SCAN_ALL_USERS:
        return this.processScanAllUsers(job);

      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return null;
    }
  }

  /**
   * Process wash sale detection for a specific stock sale.
   */
  private async processStockSaleDetection(
    job: Job<DetectStockSaleJobData>,
  ): Promise<{ detected: boolean; washSaleId?: string }> {
    const { lotSaleId } = job.data;

    const lotSale = await this.lotSaleRepository.findOne({
      where: { id: lotSaleId },
    });

    if (!lotSale) {
      this.logger.warn(`LotSale ${lotSaleId} not found`);
      return { detected: false };
    }

    // Skip if already processed (has an existing wash sale record)
    const existingWashSale = await this.washSaleRepository.findOne({
      where: { triggeringSaleId: lotSaleId },
    });

    if (existingWashSale) {
      this.logger.debug(`LotSale ${lotSaleId} already has wash sale record`);
      return { detected: true, washSaleId: existingWashSale.id };
    }

    const result = await this.detector.detectForStockSale(lotSale);

    if (result.isWashSale && result.replacementPurchase) {
      const washSale = await this.recordWashSale(lotSale.userId, result);
      return { detected: true, washSaleId: washSale.id };
    }

    return { detected: false };
  }

  /**
   * Process wash sale detection for a specific option closure.
   */
  private async processOptionClosureDetection(
    job: Job<DetectOptionClosureJobData>,
  ): Promise<{ detected: boolean; washSaleId?: string }> {
    const { optionClosureId } = job.data;

    const closure = await this.optionClosureRepository.findOne({
      where: { id: optionClosureId },
    });

    if (!closure) {
      this.logger.warn(`OptionClosure ${optionClosureId} not found`);
      return { detected: false };
    }

    // Skip if already processed
    const existingWashSale = await this.washSaleRepository.findOne({
      where: { triggeringOptionClosureId: optionClosureId },
    });

    if (existingWashSale) {
      this.logger.debug(`OptionClosure ${optionClosureId} already has wash sale record`);
      return { detected: true, washSaleId: existingWashSale.id };
    }

    const result = await this.detector.detectForOptionClosure(closure);

    if (result.isWashSale && result.replacementPurchase) {
      const washSale = await this.recordWashSale(closure.userId, result);
      return { detected: true, washSaleId: washSale.id };
    }

    return { detected: false };
  }

  /**
   * Batch scan a user's recent sales for wash sales.
   */
  private async processBatchScanUser(
    job: Job<BatchScanUserJobData>,
  ): Promise<{ stockSalesProcessed: number; optionClosuresProcessed: number; washSalesDetected: number }> {
    const { userId, sinceDate } = job.data;
    const since = sinceDate ? new Date(sinceDate) : this.getDefaultScanDate();

    let stockSalesProcessed = 0;
    let optionClosuresProcessed = 0;
    let washSalesDetected = 0;

    // Find stock sales with losses that haven't been checked
    const stockSalesWithLosses = await this.lotSaleRepository.find({
      where: {
        userId,
        soldAt: MoreThan(since),
        // Only losses can trigger wash sales
      },
      order: { soldAt: 'ASC' },
    });

    for (const lotSale of stockSalesWithLosses) {
      if (Number(lotSale.realizedGain) >= 0) continue;

      // Check if already processed
      const existing = await this.washSaleRepository.findOne({
        where: { triggeringSaleId: lotSale.id },
      });
      if (existing) continue;

      const result = await this.detector.detectForStockSale(lotSale);
      stockSalesProcessed++;

      if (result.isWashSale && result.replacementPurchase) {
        await this.recordWashSale(userId, result);
        washSalesDetected++;
      }

      // Update progress
      await job.updateProgress({
        stockSalesProcessed,
        optionClosuresProcessed,
        washSalesDetected,
      });
    }

    // Find option closures with losses
    const optionClosuresWithLosses = await this.optionClosureRepository.find({
      where: {
        userId,
        closedAt: MoreThan(since),
      },
      order: { closedAt: 'ASC' },
    });

    for (const closure of optionClosuresWithLosses) {
      if (Number(closure.realizedGain) >= 0) continue;

      // Check if already processed
      const existing = await this.washSaleRepository.findOne({
        where: { triggeringOptionClosureId: closure.id },
      });
      if (existing) continue;

      const result = await this.detector.detectForOptionClosure(closure);
      optionClosuresProcessed++;

      if (result.isWashSale && result.replacementPurchase) {
        await this.recordWashSale(userId, result);
        washSalesDetected++;
      }

      // Update progress
      await job.updateProgress({
        stockSalesProcessed,
        optionClosuresProcessed,
        washSalesDetected,
      });
    }

    this.logger.log(
      `Batch scan for user ${userId}: ${stockSalesProcessed} stock sales, ` +
        `${optionClosuresProcessed} option closures processed, ` +
        `${washSalesDetected} wash sales detected`,
    );

    return { stockSalesProcessed, optionClosuresProcessed, washSalesDetected };
  }

  /**
   * Scan all users for recent unprocessed sales.
   * This is a scheduled job that runs periodically.
   */
  private async processScanAllUsers(
    job: Job,
  ): Promise<{ usersScanned: number; totalWashSalesDetected: number }> {
    const since = this.getDefaultScanDate();

    // Find all users with recent losses
    const usersWithRecentLosses = await this.lotSaleRepository
      .createQueryBuilder('ls')
      .select('DISTINCT ls.userId', 'userId')
      .where('ls.soldAt > :since', { since })
      .andWhere('ls.realizedGain < 0')
      .getRawMany<{ userId: string }>();

    const usersFromOptions = await this.optionClosureRepository
      .createQueryBuilder('oc')
      .select('DISTINCT oc.userId', 'userId')
      .where('oc.closedAt > :since', { since })
      .andWhere('oc.realizedGain < 0')
      .getRawMany<{ userId: string }>();

    const allUserIds = new Set([
      ...usersWithRecentLosses.map((u) => u.userId),
      ...usersFromOptions.map((u) => u.userId),
    ]);

    let usersScanned = 0;
    let totalWashSalesDetected = 0;

    for (const userId of allUserIds) {
      const result = await this.processBatchScanUser({
        data: { userId, sinceDate: since.toISOString() },
        updateProgress: async () => {},
      } as unknown as Job<BatchScanUserJobData>);

      usersScanned++;
      totalWashSalesDetected += result.washSalesDetected;

      await job.updateProgress({
        usersScanned,
        totalUsers: allUserIds.size,
        totalWashSalesDetected,
      });
    }

    this.logger.log(
      `Scan all users complete: ${usersScanned} users, ${totalWashSalesDetected} wash sales detected`,
    );

    return { usersScanned, totalWashSalesDetected };
  }

  /**
   * Record a wash sale in the database.
   */
  private async recordWashSale(
    userId: string,
    result: WashSaleDetectionResult,
  ): Promise<WashSale> {
    const { triggeringSale, replacementPurchase, washSaleType, quantityAffected, daysBetween } = result;

    if (!replacementPurchase || !washSaleType || quantityAffected === undefined || daysBetween === undefined) {
      throw new Error('Invalid wash sale detection result');
    }

    const disallowedLoss = triggeringSale.loss; // Full loss disallowed
    const costBasisAdjustment = Math.abs(disallowedLoss);

    const washSale = this.washSaleRepository.create({
      userId,
      symbol: triggeringSale.symbol,
      washSaleType: washSaleType as WashSaleType,
      triggeringSaleId: triggeringSale.type === 'stock' ? triggeringSale.id : null,
      triggeringOptionClosureId: triggeringSale.type === 'option' ? triggeringSale.id : null,
      replacementTaxLotId: replacementPurchase.type === 'stock' ? replacementPurchase.id : null,
      replacementOptionSymbol: replacementPurchase.type === 'option' ? replacementPurchase.optionSymbol : null,
      disallowedLoss,
      originalLoss: triggeringSale.loss,
      quantityAffected,
      costBasisAdjustment,
      saleDate: triggeringSale.date,
      replacementDate: replacementPurchase.date,
      daysBetween,
      taxYear: triggeringSale.date.getFullYear(),
      notes: `Wash sale detected: ${washSaleType}. Replacement purchased ${Math.abs(daysBetween)} days ${daysBetween >= 0 ? 'after' : 'before'} sale.`,
    });

    const savedWashSale = await this.washSaleRepository.save(washSale);

    // Adjust cost basis on replacement lot if it's a stock
    if (replacementPurchase.type === 'stock') {
      await this.adjustReplacementLotCostBasis(
        replacementPurchase.id,
        costBasisAdjustment,
        quantityAffected,
      );
    }

    this.logger.log(
      `Wash sale recorded for ${triggeringSale.symbol}: ${washSaleType}, ` +
        `disallowed loss: $${Math.abs(disallowedLoss).toFixed(2)}`,
    );

    return savedWashSale;
  }

  /**
   * Adjust cost basis on replacement tax lot.
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

    this.logger.debug(
      `Adjusted cost basis for lot ${taxLotId}: +$${perShareAdjustment.toFixed(4)}/share`,
    );
  }

  /**
   * Get default scan date (30 days back to cover wash sale window).
   */
  private getDefaultScanDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 60); // 60 days to cover full window + buffer
    return date;
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} (${job.name}) completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} (${job.name}) failed: ${error.message}`);
  }
}
