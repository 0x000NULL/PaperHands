import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import {
  OrderSide,
  OrderType,
  OrderStatus,
  TimeInForce,
  OrderCategory,
  OptionType,
} from '../enums/order.enums';

// Re-export enums for backward compatibility
export {
  OrderSide,
  OrderType,
  OrderStatus,
  TimeInForce,
  OrderCategory,
  OptionType,
};

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  iv: number;
}

@Entity('orders')
@Index(['status', 'symbol']) // For price monitoring queries
@Index(['userId', 'status']) // For user's active orders
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column()
  userId: string;

  @Index()
  @Column()
  symbol: string;

  @Column({ type: 'enum', enum: OrderSide })
  side: OrderSide;

  @Column({ type: 'enum', enum: OrderType, default: OrderType.MARKET })
  orderType: OrderType;

  @Column({ type: 'enum', enum: TimeInForce, default: TimeInForce.DAY })
  timeInForce: TimeInForce;

  @Column({ default: false })
  extendedHours: boolean;

  @Column('decimal', { precision: 12, scale: 4 })
  quantity: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  filledQuantity: number;

  // Price fields for different order types
  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  limitPrice: number | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  stopPrice: number | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  trailAmount: number | null;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  trailPercent: number | null;

  // For trailing stops - tracks highest (sell) or lowest (buy) price
  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  trailingPeakPrice: number | null;

  // Current trigger price for trailing stops (displayed to user)
  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  currentTriggerPrice: number | null;

  // Execution details
  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  filledPrice: number | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  avgFillPrice: number | null;

  @Index()
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column('text', { nullable: true })
  rejectionReason: string | null;

  @Index()
  @Column('varchar', { nullable: true, unique: true })
  idempotencyKey: string | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Index()
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  triggeredAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  filledAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  // Option-specific fields
  @Column({ type: 'varchar', default: OrderCategory.EQUITY })
  orderCategory: OrderCategory;

  @Index()
  @Column({ type: 'varchar', length: 30, nullable: true })
  optionSymbol: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  underlyingSymbol: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  optionType: OptionType | null;

  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  strikePrice: number | null;

  @Column({ type: 'date', nullable: true })
  expirationDate: Date | null;

  @Column({ type: 'int', default: 100 })
  contractMultiplier: number;

  @Column({ type: 'jsonb', nullable: true })
  greeksAtFill: OptionGreeks | null;

  // Reference to multi-leg order (if this order is part of a spread)
  @Column({ type: 'uuid', nullable: true })
  multiLegOrderId: string | null;

  // Reference to rollover order (if this order is part of a rollover)
  @Column({ type: 'uuid', nullable: true })
  rolloverOrderId: string | null;
}
