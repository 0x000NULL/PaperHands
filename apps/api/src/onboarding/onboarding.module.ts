import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { User } from '../users/entities/user.entity';
import { UserPreferences } from '../users/entities/user-preferences.entity';
import { Watchlist } from '../watchlists/entities/watchlist.entity';
import { WatchlistItem } from '../watchlists/entities/watchlist-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserPreferences, Watchlist, WatchlistItem]),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
