import { Module } from '@nestjs/common';
import { FinnhubService } from './finnhub.service';
import { TradierService } from './tradier.service';
import { MarketDataController } from './market-data.controller';
import { MarketHoursService } from '../common/services/market-hours.service';

@Module({
  controllers: [MarketDataController],
  providers: [FinnhubService, TradierService, MarketHoursService],
  exports: [FinnhubService, TradierService, MarketHoursService],
})
export class MarketDataModule {}
