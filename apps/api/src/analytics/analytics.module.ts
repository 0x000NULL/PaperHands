import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { SnapshotProcessor } from './jobs/snapshot.processor';
import { PortfolioSnapshot } from './entities/portfolio-snapshot.entity';
import { Order } from '../orders/entities/order.entity';
import { Position } from '../portfolio/entities/position.entity';
import { TaxLot } from '../portfolio/entities/tax-lot.entity';
import { LotSale } from '../portfolio/entities/lot-sale.entity';
import { User } from '../users/entities/user.entity';
import { UserPreferences } from '../users/entities/user-preferences.entity';
import { MarketDataModule } from '../market-data/market-data.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { MarketHoursService } from '../common/services/market-hours.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PortfolioSnapshot,
      Order,
      Position,
      TaxLot,
      LotSale,
      User,
      UserPreferences,
    ]),
    MarketDataModule,
    PortfolioModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, SnapshotProcessor, MarketHoursService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
