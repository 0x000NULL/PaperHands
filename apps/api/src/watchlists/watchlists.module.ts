import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Watchlist } from './entities/watchlist.entity';
import { WatchlistItem } from './entities/watchlist-item.entity';
import { WatchlistsController } from './watchlists.controller';
import { WatchlistsService } from './watchlists.service';

@Module({
  imports: [TypeOrmModule.forFeature([Watchlist, WatchlistItem])],
  controllers: [WatchlistsController],
  providers: [WatchlistsService],
  exports: [WatchlistsService],
})
export class WatchlistsModule {}
