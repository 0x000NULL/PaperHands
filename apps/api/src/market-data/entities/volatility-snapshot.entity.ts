import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('volatility_snapshots')
@Index(['symbol', 'snapshotDate'])
@Unique(['symbol', 'snapshotDate'])
export class VolatilitySnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  symbol: string;

  @Index()
  @Column({ type: 'date' })
  snapshotDate: Date;

  // Implied Volatility from ATM options (as decimal, e.g., 0.25 = 25%)
  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  ivAtm: number | null;

  // Historical Volatility (annualized standard deviation of log returns)
  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  hv20: number | null; // 20-day HV

  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  hv30: number | null; // 30-day HV

  @Column('decimal', { precision: 8, scale: 4, nullable: true })
  hv60: number | null; // 60-day HV

  // Underlying price at snapshot time
  @Column('decimal', { precision: 12, scale: 4 })
  underlyingPrice: number;

  @CreateDateColumn()
  createdAt: Date;
}
