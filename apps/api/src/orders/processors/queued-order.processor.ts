import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrderExecutionService } from '../services/order-execution.service';
import { MarketHoursService } from '../../common/services/market-hours.service';

@Injectable()
export class QueuedOrderProcessor {
  private readonly logger = new Logger(QueuedOrderProcessor.name);
  private isProcessing = false;
  private hasProcessedToday = false;
  private lastProcessedDate: string | null = null;

  constructor(
    private orderExecutionService: OrderExecutionService,
    private marketHoursService: MarketHoursService,
  ) {}

  /**
   * Process queued market orders at market open (9:30 AM ET, Mon-Fri)
   * Run every minute between 9:30 and 9:35 AM to catch market open
   */
  @Cron('* 30-35 9 * * 1-5', {
    timeZone: 'America/New_York',
  })
  async processQueuedOrdersAtMarketOpen(): Promise<void> {
    const today = new Date().toDateString();

    // Only process once per day
    if (this.hasProcessedToday && this.lastProcessedDate === today) {
      return;
    }

    // Prevent overlapping executions
    if (this.isProcessing) {
      return;
    }

    // Verify market is actually open
    const session = this.marketHoursService.getCurrentSession();
    if (session !== 'regular') {
      return;
    }

    this.isProcessing = true;

    try {
      const queuedOrders = await this.orderExecutionService.getQueuedOrders();

      if (queuedOrders.length === 0) {
        this.logger.log('No queued orders to process at market open');
        this.hasProcessedToday = true;
        this.lastProcessedDate = today;
        return;
      }

      this.logger.log(
        `Processing ${queuedOrders.length} queued orders at market open`,
      );

      let successCount = 0;
      let failCount = 0;

      for (const order of queuedOrders) {
        try {
          await this.orderExecutionService.executeQueuedMarketOrder(order.id);
          successCount++;
          this.logger.log(
            `Executed queued order ${order.id}: ${order.side} ${order.quantity} ${order.symbol}`,
          );
        } catch (error) {
          failCount++;
          this.logger.error(
            `Failed to execute queued order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        // Small delay between orders to avoid overwhelming the quote service
        await this.delay(100);
      }

      this.logger.log(
        `Market open order processing complete: ${successCount} succeeded, ${failCount} failed`,
      );

      this.hasProcessedToday = true;
      this.lastProcessedDate = today;
    } catch (error) {
      this.logger.error(
        `Error processing queued orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Reset the daily processing flag at midnight
   */
  @Cron('0 0 0 * * *', {
    timeZone: 'America/New_York',
  })
  resetDailyFlag(): void {
    this.hasProcessedToday = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
