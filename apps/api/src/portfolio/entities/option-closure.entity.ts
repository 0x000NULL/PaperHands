import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OptionPosition } from './option-position.entity';
import { Order } from '../../orders/entities/order.entity';
import { OptionType } from '../../orders/enums/order.enums';
import { GainType, OptionClosureType } from '../enums/cost-basis.enums';

@Entity('option_closures')
@Index(['userId', 'underlyingSymbol', 'closedAt'])
@Index(['userId', 'gainType', 'closedAt'])
@Index(['closureType'])
export class OptionClosure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column()
  userId: string;

  // Nullable for historical/expired positions that may have been deleted
  @ManyToOne(() => OptionPosition, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'optionPositionId' })
  optionPosition: OptionPosition | null;

  @Column({ nullable: true })
  optionPositionId: string | null;

  // The order that closed this position (sell-to-close)
  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'closingOrderId' })
  closingOrder: Order | null;

  @Column({ nullable: true })
  closingOrderId: string | null;

  // Denormalized fields for efficient queries
  @Column({ type: 'varchar', length: 30 })
  optionSymbol: string;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  underlyingSymbol: string;

  @Column({ type: 'varchar', length: 4 })
  optionType: OptionType;

  @Column('decimal', { precision: 12, scale: 4 })
  strikePrice: number;

  @Column({ type: 'date' })
  expirationDate: Date;

  // Closure details
  @Column({
    type: 'enum',
    enum: OptionClosureType,
  })
  closureType: OptionClosureType;

  @Column('decimal', { precision: 12, scale: 4 })
  quantityClosed: number;

  @Column('decimal', { precision: 12, scale: 4 })
  openingPremium: number; // Cost basis per contract

  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  closingPremium: number | null; // Sale price per contract (null if expired/exercised)

  @Column('decimal', { precision: 12, scale: 2 })
  realizedGain: number;

  @Column('decimal', { precision: 12, scale: 2 })
  proceeds: number;

  @Column('decimal', { precision: 12, scale: 2 })
  costBasis: number;

  @Column({
    type: 'enum',
    enum: GainType,
    default: GainType.SHORT_TERM,
  })
  gainType: GainType;

  @Column('int')
  holdingDays: number;

  // For exercised options - link to resulting stock order
  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resultingStockOrderId' })
  resultingStockOrder: Order | null;

  @Column({ nullable: true })
  resultingStockOrderId: string | null;

  @Index()
  @Column({ type: 'timestamp' })
  closedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
