import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderType } from '../enums/order.enums';
import { MultiLegStrategyType, MultiLegStatus } from '../enums/multi-leg.enums';
import { MultiLegOrderLeg } from './multi-leg-order-leg.entity';

@Entity('multi_leg_orders')
@Index(['userId', 'status'])
@Index(['userId', 'createdAt'])
export class MultiLegOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column()
  userId: string;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  underlyingSymbol: string;

  @Column({
    type: 'varchar',
    length: 30,
  })
  strategyType: MultiLegStrategyType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  strategyDescription: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: OrderType.MARKET,
  })
  orderType: OrderType;

  // Net limit price for the entire spread (debit/credit)
  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  netLimitPrice: number | null;

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    default: MultiLegStatus.PENDING,
  })
  status: MultiLegStatus;

  @Column({ type: 'int' })
  legCount: number;

  // Strategy metrics
  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  maxProfit: number | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  maxLoss: number | null;

  @Column({ type: 'jsonb', nullable: true })
  breakevens: number[] | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  marginRequirement: number | null;

  // Execution details
  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  netDebitCredit: number | null; // Positive = debit (paid), Negative = credit (received)

  @Column('text', { nullable: true })
  rejectionReason: string | null;

  @Column('varchar', { nullable: true, unique: true })
  idempotencyKey: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  filledAt: Date | null;

  @OneToMany(() => MultiLegOrderLeg, (leg) => leg.multiLegOrder, {
    cascade: true,
    eager: true,
  })
  legs: MultiLegOrderLeg[];
}
