import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export interface PositionDetail {
  symbol: string;
  quantity: number;
  marketValue: number;
  price: number;
  costBasis: number;
  unrealizedGain: number;
}

@Entity('portfolio_snapshots')
@Index(['userId', 'date'])
@Unique(['userId', 'date'])
export class PortfolioSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column()
  userId: string;

  @Index()
  @Column({ type: 'date' })
  date: Date;

  @Column('decimal', { precision: 14, scale: 2 })
  totalValue: number;

  @Column('decimal', { precision: 14, scale: 2 })
  cashBalance: number;

  @Column('decimal', { precision: 14, scale: 2 })
  positionsValue: number;

  @Column({ type: 'jsonb', nullable: true })
  positionDetails: PositionDetail[];

  // Track if this is a reconstructed snapshot (from historical orders)
  // vs a live snapshot captured at market close
  @Column({ default: false })
  isReconstructed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
