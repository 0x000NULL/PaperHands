import { Module } from '@nestjs/common';
import { FinnhubService } from './finnhub.service';
import { MarketDataController } from './market-data.controller';

@Module({
  controllers: [MarketDataController],
  providers: [FinnhubService],
  exports: [FinnhubService],
})
export class MarketDataModule {}
