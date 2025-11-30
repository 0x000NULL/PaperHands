import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Watchlist } from './entities/watchlist.entity';
import { WatchlistItem } from './entities/watchlist-item.entity';

export interface WatchlistSummary {
  id: string;
  name: string;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchlistDetail {
  id: string;
  name: string;
  items: {
    id: string;
    symbol: string;
    sortOrder: number;
    addedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class WatchlistsService {
  constructor(
    @InjectRepository(Watchlist)
    private watchlistRepository: Repository<Watchlist>,
    @InjectRepository(WatchlistItem)
    private watchlistItemRepository: Repository<WatchlistItem>,
  ) {}

  async getWatchlists(userId: string): Promise<WatchlistSummary[]> {
    const watchlists = await this.watchlistRepository.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'ASC' },
    });

    return watchlists.map((w) => ({
      id: w.id,
      name: w.name,
      itemCount: w.items?.length ?? 0,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  }

  async getWatchlist(userId: string, id: string): Promise<WatchlistDetail> {
    const watchlist = await this.watchlistRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!watchlist) {
      throw new NotFoundException('Watchlist not found');
    }

    if (watchlist.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const items = (watchlist.items ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        id: item.id,
        symbol: item.symbol,
        sortOrder: item.sortOrder,
        addedAt: item.addedAt,
      }));

    return {
      id: watchlist.id,
      name: watchlist.name,
      items,
      createdAt: watchlist.createdAt,
      updatedAt: watchlist.updatedAt,
    };
  }

  async createWatchlist(
    userId: string,
    name: string,
  ): Promise<WatchlistDetail> {
    // Check for duplicate name
    const existing = await this.watchlistRepository.findOne({
      where: { userId, name },
    });

    if (existing) {
      throw new ConflictException('A watchlist with this name already exists');
    }

    const watchlist = this.watchlistRepository.create({
      userId,
      name,
    });

    await this.watchlistRepository.save(watchlist);

    return {
      id: watchlist.id,
      name: watchlist.name,
      items: [],
      createdAt: watchlist.createdAt,
      updatedAt: watchlist.updatedAt,
    };
  }

  async updateWatchlist(
    userId: string,
    id: string,
    name: string,
  ): Promise<WatchlistDetail> {
    const watchlist = await this.watchlistRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!watchlist) {
      throw new NotFoundException('Watchlist not found');
    }

    if (watchlist.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Check for duplicate name (excluding current watchlist)
    const existing = await this.watchlistRepository.findOne({
      where: { userId, name },
    });

    if (existing && existing.id !== id) {
      throw new ConflictException('A watchlist with this name already exists');
    }

    watchlist.name = name;
    await this.watchlistRepository.save(watchlist);

    const items = (watchlist.items ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        id: item.id,
        symbol: item.symbol,
        sortOrder: item.sortOrder,
        addedAt: item.addedAt,
      }));

    return {
      id: watchlist.id,
      name: watchlist.name,
      items,
      createdAt: watchlist.createdAt,
      updatedAt: watchlist.updatedAt,
    };
  }

  async deleteWatchlist(userId: string, id: string): Promise<void> {
    const watchlist = await this.watchlistRepository.findOne({
      where: { id },
    });

    if (!watchlist) {
      throw new NotFoundException('Watchlist not found');
    }

    if (watchlist.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.watchlistRepository.remove(watchlist);
  }

  async addSymbol(
    userId: string,
    watchlistId: string,
    symbol: string,
  ): Promise<WatchlistDetail> {
    const watchlist = await this.watchlistRepository.findOne({
      where: { id: watchlistId },
      relations: ['items'],
    });

    if (!watchlist) {
      throw new NotFoundException('Watchlist not found');
    }

    if (watchlist.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const upperSymbol = symbol.toUpperCase();

    // Check if symbol already exists
    const existingItem = watchlist.items?.find(
      (item) => item.symbol === upperSymbol,
    );

    if (existingItem) {
      throw new ConflictException('Symbol already in watchlist');
    }

    // Get max sort order
    const maxSortOrder =
      watchlist.items?.reduce(
        (max, item) => Math.max(max, item.sortOrder),
        -1,
      ) ?? -1;

    const item = this.watchlistItemRepository.create({
      watchlistId,
      symbol: upperSymbol,
      sortOrder: maxSortOrder + 1,
    });

    await this.watchlistItemRepository.save(item);

    // Reload and return
    return this.getWatchlist(userId, watchlistId);
  }

  async removeSymbol(
    userId: string,
    watchlistId: string,
    symbol: string,
  ): Promise<WatchlistDetail> {
    const watchlist = await this.watchlistRepository.findOne({
      where: { id: watchlistId },
      relations: ['items'],
    });

    if (!watchlist) {
      throw new NotFoundException('Watchlist not found');
    }

    if (watchlist.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const upperSymbol = symbol.toUpperCase();
    const item = watchlist.items?.find((i) => i.symbol === upperSymbol);

    if (!item) {
      throw new NotFoundException('Symbol not in watchlist');
    }

    await this.watchlistItemRepository.remove(item);

    // Reload and return
    return this.getWatchlist(userId, watchlistId);
  }

  async reorderItems(
    userId: string,
    watchlistId: string,
    itemIds: string[],
  ): Promise<WatchlistDetail> {
    const watchlist = await this.watchlistRepository.findOne({
      where: { id: watchlistId },
      relations: ['items'],
    });

    if (!watchlist) {
      throw new NotFoundException('Watchlist not found');
    }

    if (watchlist.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Validate that all itemIds belong to this watchlist (IDOR protection)
    const validItemIds = new Set(watchlist.items?.map((item) => item.id) ?? []);
    const invalidIds = itemIds.filter((id) => !validItemIds.has(id));
    if (invalidIds.length > 0) {
      throw new ForbiddenException(
        'Cannot reorder items from other watchlists',
      );
    }

    // Update sort order for each item
    const updates = itemIds.map((itemId, index) =>
      this.watchlistItemRepository.update(itemId, { sortOrder: index }),
    );

    await Promise.all(updates);

    // Reload and return
    return this.getWatchlist(userId, watchlistId);
  }
}
