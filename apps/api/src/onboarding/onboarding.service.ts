import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserPreferences } from '../users/entities/user-preferences.entity';
import { Watchlist } from '../watchlists/entities/watchlist.entity';
import { WatchlistItem } from '../watchlists/entities/watchlist-item.entity';
import { CompleteStepDto } from './dto/update-onboarding.dto';
import { OrderType, TimeInForce } from '../orders/enums/order.enums';
import { CostBasisMethod } from '../portfolio/enums/cost-basis.enums';

export interface OnboardingStatus {
  completed: boolean;
  currentStep: number;
  completedAt: Date | null;
  preferences: {
    defaultOrderType: OrderType;
    defaultTimeInForce: TimeInForce;
    defaultCostBasisMethod: CostBasisMethod;
    tourCompleted: boolean;
  } | null;
}

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserPreferences)
    private preferencesRepository: Repository<UserPreferences>,
    @InjectRepository(Watchlist)
    private watchlistRepository: Repository<Watchlist>,
    @InjectRepository(WatchlistItem)
    private watchlistItemRepository: Repository<WatchlistItem>,
  ) {}

  async getStatus(userId: string): Promise<OnboardingStatus> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    return {
      completed: user.onboardingCompleted,
      currentStep: user.onboardingStep,
      completedAt: user.onboardingCompletedAt,
      preferences: preferences
        ? {
            defaultOrderType: preferences.defaultOrderType,
            defaultTimeInForce: preferences.defaultTimeInForce,
            defaultCostBasisMethod: preferences.defaultCostBasisMethod,
            tourCompleted: preferences.tourCompleted,
          }
        : null,
    };
  }

  async completeStep(
    userId: string,
    step: number,
    data?: CompleteStepDto,
  ): Promise<OnboardingStatus> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Process step-specific data
    switch (step) {
      case 1:
        // Welcome step - no data to process, just mark as viewed
        break;

      case 2:
        // Cash setup
        if (data?.cashSetup?.startingCash) {
          user.cashBalance = data.cashSetup.startingCash;
          await this.userRepository.save(user);
        }
        break;

      case 3:
        // Watchlist setup
        if (data?.watchlistSetup) {
          const { watchlistName, symbols } = data.watchlistSetup;
          await this.createWatchlistWithSymbols(userId, watchlistName, symbols);
        }
        break;

      case 4:
        // Trading preferences
        if (data?.preferences) {
          await this.updatePreferences(userId, data.preferences);
        }
        break;

      case 5:
        // Tour intro - mark tour as started/completed
        await this.updateTourStatus(userId, true);
        break;

      default:
        throw new BadRequestException(`Invalid step: ${step}`);
    }

    // Update user's current step
    user.onboardingStep = step;
    await this.userRepository.save(user);

    return this.getStatus(userId);
  }

  async completeOnboarding(userId: string): Promise<OnboardingStatus> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.onboardingCompleted = true;
    user.onboardingCompletedAt = new Date();
    await this.userRepository.save(user);

    return this.getStatus(userId);
  }

  async skipOnboarding(userId: string): Promise<OnboardingStatus> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create default preferences if not exists
    await this.ensurePreferencesExist(userId);

    user.onboardingCompleted = true;
    user.onboardingCompletedAt = new Date();
    await this.userRepository.save(user);

    return this.getStatus(userId);
  }

  async resetOnboarding(userId: string): Promise<OnboardingStatus> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.onboardingCompleted = false;
    user.onboardingCompletedAt = null;
    user.onboardingStep = 0;
    await this.userRepository.save(user);

    // Reset tour status
    const preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (preferences) {
      preferences.tourCompleted = false;
      await this.preferencesRepository.save(preferences);
    }

    return this.getStatus(userId);
  }

  private async createWatchlistWithSymbols(
    userId: string,
    name: string,
    symbols: string[],
  ): Promise<void> {
    // Check if watchlist with same name exists
    const existing = await this.watchlistRepository.findOne({
      where: { userId, name },
    });

    if (existing) {
      // Just add symbols to existing watchlist
      await this.addSymbolsToWatchlist(existing.id, symbols);
      return;
    }

    // Create new watchlist
    const watchlist = this.watchlistRepository.create({
      userId,
      name,
    });
    await this.watchlistRepository.save(watchlist);

    // Add symbols
    await this.addSymbolsToWatchlist(watchlist.id, symbols);
  }

  private async addSymbolsToWatchlist(
    watchlistId: string,
    symbols: string[],
  ): Promise<void> {
    const existingItems = await this.watchlistItemRepository.find({
      where: { watchlistId },
    });

    const existingSymbols = new Set(existingItems.map((i) => i.symbol));
    let maxSortOrder = existingItems.reduce(
      (max, item) => Math.max(max, item.sortOrder),
      -1,
    );

    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      if (!existingSymbols.has(upperSymbol)) {
        maxSortOrder++;
        const item = this.watchlistItemRepository.create({
          watchlistId,
          symbol: upperSymbol,
          sortOrder: maxSortOrder,
        });
        await this.watchlistItemRepository.save(item);
        existingSymbols.add(upperSymbol);
      }
    }
  }

  private async updatePreferences(
    userId: string,
    prefs: {
      defaultOrderType?: OrderType;
      defaultTimeInForce?: TimeInForce;
      defaultCostBasisMethod?: CostBasisMethod;
    },
  ): Promise<void> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({
        userId,
        ...prefs,
      });
    } else {
      if (prefs.defaultOrderType) {
        preferences.defaultOrderType = prefs.defaultOrderType;
      }
      if (prefs.defaultTimeInForce) {
        preferences.defaultTimeInForce = prefs.defaultTimeInForce;
      }
      if (prefs.defaultCostBasisMethod) {
        preferences.defaultCostBasisMethod = prefs.defaultCostBasisMethod;
      }
    }

    await this.preferencesRepository.save(preferences);
  }

  private async updateTourStatus(
    userId: string,
    completed: boolean,
  ): Promise<void> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({
        userId,
        tourCompleted: completed,
      });
    } else {
      preferences.tourCompleted = completed;
    }

    await this.preferencesRepository.save(preferences);
  }

  private async ensurePreferencesExist(userId: string): Promise<void> {
    const existing = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!existing) {
      const preferences = this.preferencesRepository.create({
        userId,
      });
      await this.preferencesRepository.save(preferences);
    }
  }
}
