import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AnalyticsService } from '../analytics.service';
import { MarketHoursService } from '../../common/services/market-hours.service';

@Injectable()
export class SnapshotProcessor {
  private readonly logger = new Logger(SnapshotProcessor.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private analyticsService: AnalyticsService,
    private marketHoursService: MarketHoursService,
  ) {}

  /**
   * Create daily portfolio snapshots at 4:30 PM ET (after market close)
   * Runs Monday through Friday only
   */
  @Cron('30 16 * * 1-5', {
    name: 'daily-portfolio-snapshot',
    timeZone: 'America/New_York',
  })
  async createDailySnapshots(): Promise<void> {
    this.logger.log('Starting daily portfolio snapshot job');

    // Double-check market is closed (handle early close days)
    const session = this.marketHoursService.getCurrentSession();
    if (session === 'regular') {
      this.logger.log('Market still open, skipping snapshot');
      return;
    }

    try {
      // Get all users
      const users = await this.userRepository.find({
        select: ['id'],
      });

      this.logger.log(`Creating snapshots for ${users.length} users`);

      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          await this.analyticsService.createDailySnapshot(user.id);
          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to create snapshot for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Daily snapshot job completed: ${successCount} success, ${errorCount} errors`,
      );
    } catch (error) {
      this.logger.error(
        `Daily snapshot job failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create a snapshot for a specific user (can be called manually)
   */
  async createSnapshotForUser(userId: string): Promise<void> {
    this.logger.log(`Creating manual snapshot for user ${userId}`);
    await this.analyticsService.createDailySnapshot(userId);
  }
}
