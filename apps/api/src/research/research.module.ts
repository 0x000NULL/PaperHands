import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { ResearchController } from './research.controller';
import {
  NewsService,
  EarningsService,
  EconomicCalendarService,
  AnalystRatingsService,
  SecFilingsService,
  InsiderTradingService,
  FundamentalsService,
} from './services';

@Module({
  imports: [MarketDataModule],
  controllers: [ResearchController],
  providers: [
    NewsService,
    EarningsService,
    EconomicCalendarService,
    AnalystRatingsService,
    SecFilingsService,
    InsiderTradingService,
    FundamentalsService,
  ],
  exports: [
    NewsService,
    EarningsService,
    AnalystRatingsService,
    FundamentalsService,
  ],
})
export class ResearchModule {}
