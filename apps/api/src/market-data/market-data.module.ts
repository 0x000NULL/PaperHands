import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinnhubService } from './finnhub.service';
import { TradierService } from './tradier.service';
import { VolatilityService } from './services/volatility.service';
import { VolatilitySnapshotProcessor } from './processors/volatility-snapshot.processor';
import { MarketDataController } from './market-data.controller';
import { MarketHoursService } from '../common/services/market-hours.service';
import { VolatilitySnapshot } from './entities/volatility-snapshot.entity';
import { Position } from '../portfolio/entities/position.entity';
import { OptionPosition } from '../portfolio/entities/option-position.entity';
import { WatchlistItem } from '../watchlists/entities/watchlist-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VolatilitySnapshot,
      Position,
      OptionPosition,
      WatchlistItem,
    ]),
  ],
  controllers: [MarketDataController],
  providers: [
    FinnhubService,
    TradierService,
    VolatilityService,
    VolatilitySnapshotProcessor,
    MarketHoursService,
  ],
  exports: [
    FinnhubService,
    TradierService,
    VolatilityService,
    MarketHoursService,
  ],
})
export class MarketDataModule {}
