import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../../portfolio/entities/position.entity';
import { OptionPosition } from '../../portfolio/entities/option-position.entity';
import { WatchlistItem } from '../../watchlists/entities/watchlist-item.entity';
import { VolatilityService } from '../services/volatility.service';
import { MarketHoursService } from '../../common/services/market-hours.service';

@Injectable()
export class VolatilitySnapshotProcessor {
  private readonly logger = new Logger(VolatilitySnapshotProcessor.name);
  private isProcessing = false;

  constructor(
    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,
    @InjectRepository(OptionPosition)
    private readonly optionPositionRepo: Repository<OptionPosition>,
    @InjectRepository(WatchlistItem)
    private readonly watchlistItemRepo: Repository<WatchlistItem>,
    private readonly volatilityService: VolatilityService,
    private readonly marketHoursService: MarketHoursService,
  ) {}

  /**
   * Create daily volatility snapshots at 4:45 PM ET (after market close)
   * Runs Monday through Friday only
   * Runs slightly after portfolio snapshots to avoid API contention
   */
  @Cron('45 16 * * 1-5', {
    name: 'daily-volatility-snapshot',
    timeZone: 'America/New_York',
  })
  async createDailySnapshots(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('Volatility snapshot job already running, skipping');
      return;
    }

    this.isProcessing = true;
    this.logger.log('Starting daily volatility snapshot job');

    // Check market is closed
    const session = this.marketHoursService.getCurrentSession();
    if (session === 'regular') {
      this.logger.log('Market still open, skipping volatility snapshot');
      this.isProcessing = false;
      return;
    }

    try {
      // Get unique symbols from all tracked sources
      const symbols = await this.getTrackedSymbols();

      this.logger.log(
        `Creating volatility snapshots for ${symbols.length} symbols`,
      );

      let successCount = 0;
      let errorCount = 0;

      // Process symbols with rate limiting (avoid hitting API limits)
      for (const symbol of symbols) {
        try {
          const snapshot =
            await this.volatilityService.createDailySnapshot(symbol);
          if (snapshot) {
            successCount++;
          }
          // Small delay to avoid rate limiting
          await this.delay(500);
        } catch (error) {
          this.logger.error(
            `Failed to create volatility snapshot for ${symbol}: ${error instanceof Error ? error.message : String(error)}`,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Volatility snapshot job complete: ${successCount} success, ${errorCount} errors`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Cleanup old volatility snapshots (weekly on Sunday at 2 AM)
   */
  @Cron('0 2 * * 0', {
    name: 'volatility-snapshot-cleanup',
    timeZone: 'America/New_York',
  })
  async cleanupOldSnapshots(): Promise<void> {
    this.logger.log('Starting volatility snapshot cleanup');

    try {
      const deletedCount = await this.volatilityService.cleanupOldSnapshots();
      this.logger.log(`Cleaned up ${deletedCount} old volatility snapshots`);
    } catch (error) {
      this.logger.error(
        `Failed to cleanup volatility snapshots: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get all unique symbols that should be tracked
   * Sources: Stock positions, option underlyings, watchlist items
   */
  private async getTrackedSymbols(): Promise<string[]> {
    const symbolSet = new Set<string>();

    // Get unique symbols from stock positions
    const positions = await this.positionRepo
      .createQueryBuilder('position')
      .select('DISTINCT position.symbol', 'symbol')
      .getRawMany<{ symbol: string }>();

    for (const pos of positions) {
      symbolSet.add(pos.symbol.toUpperCase());
    }

    // Get unique underlying symbols from option positions
    const optionPositions = await this.optionPositionRepo
      .createQueryBuilder('option')
      .select('DISTINCT option.underlyingSymbol', 'symbol')
      .getRawMany<{ symbol: string }>();

    for (const opt of optionPositions) {
      symbolSet.add(opt.symbol.toUpperCase());
    }

    // Get unique symbols from watchlists
    const watchlistItems = await this.watchlistItemRepo
      .createQueryBuilder('item')
      .select('DISTINCT item.symbol', 'symbol')
      .getRawMany<{ symbol: string }>();

    for (const item of watchlistItems) {
      symbolSet.add(item.symbol.toUpperCase());
    }

    // Add some popular symbols that are commonly tracked
    const popularSymbols = ['SPY', 'QQQ', 'IWM', 'DIA', 'VIX'];
    for (const symbol of popularSymbols) {
      symbolSet.add(symbol);
    }

    return Array.from(symbolSet).sort();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
