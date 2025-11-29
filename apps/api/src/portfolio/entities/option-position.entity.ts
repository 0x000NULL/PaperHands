import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OptionType } from '../../orders/enums/order.enums';

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  iv: number;
}

@Entity('option_positions')
@Unique(['userId', 'optionSymbol'])
export class OptionPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column()
  userId: string;

  @Column({ type: 'varchar', length: 30 })
  optionSymbol: string; // OCC symbol (e.g., AAPL240119C00190000)

  @Index()
  @Column({ type: 'varchar', length: 10 })
  underlyingSymbol: string;

  @Column({ type: 'varchar', length: 4 })
  optionType: OptionType;

  @Column('decimal', { precision: 12, scale: 4 })
  strikePrice: number;

  @Index()
  @Column({ type: 'date' })
  expirationDate: Date;

  @Column('decimal', { precision: 12, scale: 4 })
  quantity: number; // Number of contracts (positive = long, negative = short)

  @Column('decimal', { precision: 12, scale: 4 })
  avgCostBasis: number; // Premium per contract

  @Column({ type: 'jsonb', nullable: true })
  greeksSnapshot: OptionGreeks | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
