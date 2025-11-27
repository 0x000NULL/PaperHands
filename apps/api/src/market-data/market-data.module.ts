import { Module } from '@nestjs/common';
import { TradierService } from './tradier.service';
import { MarketDataController } from './market-data.controller';

@Module({
  controllers: [MarketDataController],
  providers: [TradierService],
  exports: [TradierService],
})
export class MarketDataModule {}
