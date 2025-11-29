import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Watchlist } from './watchlist.entity';

@Entity('watchlist_items')
@Unique(['watchlistId', 'symbol'])
export class WatchlistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Watchlist, (watchlist: Watchlist) => watchlist.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'watchlist_id' })
  watchlist: Watchlist;

  @Index()
  @Column({ name: 'watchlist_id' })
  watchlistId: string;

  @Column({ length: 10 })
  symbol: string;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  addedAt: Date;
}
