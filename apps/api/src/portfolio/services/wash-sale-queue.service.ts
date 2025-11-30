import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  WASH_SALE_QUEUE,
  WashSaleJobType,
  DetectStockSaleJobData,
  DetectOptionClosureJobData,
  BatchScanUserJobData,
} from '../processors/wash-sale-detection.processor';

/**
 * Service for queueing wash sale detection jobs.
 *
 * This service provides a clean API for scheduling wash sale detection,
 * abstracting the BullMQ queue implementation details.
 */
@Injectable()
export class WashSaleQueueService {
  private readonly logger = new Logger(WashSaleQueueService.name);

  constructor(
    @InjectQueue(WASH_SALE_QUEUE)
    private readonly washSaleQueue: Queue,
  ) {}

  /**
   * Queue wash sale detection for a stock sale (LotSale).
   * This should be called after a stock sale is recorded.
   *
   * @param lotSaleId - The ID of the lot sale to check
   * @param options - Optional job options
   */
  async queueStockSaleDetection(
    lotSaleId: string,
    options?: { delay?: number; priority?: number },
  ): Promise<string> {
    const job = await this.washSaleQueue.add(
      WashSaleJobType.DETECT_FOR_STOCK_SALE,
      { lotSaleId } as DetectStockSaleJobData,
      {
        delay: options?.delay,
        priority: options?.priority,
        // Deduplicate by lotSaleId
        jobId: `stock-sale-${lotSaleId}`,
        // Retry with exponential backoff
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 86400, // Remove after 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // Keep failed jobs for 7 days
        },
      },
    );

    this.logger.debug(
      `Queued wash sale detection for stock sale ${lotSaleId}, job ${job.id}`,
    );
    return job.id!;
  }

  /**
   * Queue wash sale detection for an option closure.
   * This should be called after an option closure is recorded.
   *
   * @param optionClosureId - The ID of the option closure to check
   * @param options - Optional job options
   */
  async queueOptionClosureDetection(
    optionClosureId: string,
    options?: { delay?: number; priority?: number },
  ): Promise<string> {
    const job = await this.washSaleQueue.add(
      WashSaleJobType.DETECT_FOR_OPTION_CLOSURE,
      { optionClosureId } as DetectOptionClosureJobData,
      {
        delay: options?.delay,
        priority: options?.priority,
        // Deduplicate by optionClosureId
        jobId: `option-closure-${optionClosureId}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 604800,
        },
      },
    );

    this.logger.debug(
      `Queued wash sale detection for option closure ${optionClosureId}, job ${job.id}`,
    );
    return job.id!;
  }

  /**
   * Queue a batch scan for a user's recent sales.
   * Useful for backfilling wash sale records or on-demand analysis.
   *
   * @param userId - The user ID to scan
   * @param sinceDate - Optional date to scan from (defaults to 60 days ago)
   */
  async queueBatchScanForUser(
    userId: string,
    sinceDate?: Date,
  ): Promise<string> {
    const job = await this.washSaleQueue.add(
      WashSaleJobType.BATCH_SCAN_USER,
      {
        userId,
        sinceDate: sinceDate?.toISOString(),
      } as BatchScanUserJobData,
      {
        // Deduplicate by userId to prevent multiple scans
        jobId: `batch-scan-${userId}-${Date.now()}`,
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 5000,
        },
        removeOnComplete: {
          age: 86400,
        },
        removeOnFail: {
          age: 604800,
        },
      },
    );

    this.logger.log(
      `Queued batch wash sale scan for user ${userId}, job ${job.id}`,
    );
    return job.id!;
  }

  /**
   * Schedule a scan of all users for recent unprocessed sales.
   * This is typically called by a cron job.
   */
  async queueScanAllUsers(): Promise<string> {
    const job = await this.washSaleQueue.add(
      WashSaleJobType.SCAN_ALL_USERS,
      {},
      {
        // Only one scan at a time
        jobId: `scan-all-${new Date().toISOString().split('T')[0]}`,
        attempts: 1,
        removeOnComplete: {
          age: 86400,
        },
        removeOnFail: {
          age: 604800,
        },
      },
    );

    this.logger.log(`Queued scan all users job ${job.id}`);
    return job.id!;
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
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.washSaleQueue.getWaitingCount(),
      this.washSaleQueue.getActiveCount(),
      this.washSaleQueue.getCompletedCount(),
      this.washSaleQueue.getFailedCount(),
      this.washSaleQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Drain all pending jobs (useful for testing/maintenance).
   */
  async drainQueue(): Promise<void> {
    await this.washSaleQueue.drain();
    this.logger.warn('Wash sale detection queue drained');
  }
}
