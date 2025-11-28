import { Module } from '@nestjs/common';
import { FinnhubService } from './finnhub.service';
import { TradierService } from './tradier.service';
import { MarketDataController } from './market-data.controller';

@Module({
  controllers: [MarketDataController],
  providers: [FinnhubService, TradierService],
  exports: [FinnhubService, TradierService],
})
export class MarketDataModule {}
