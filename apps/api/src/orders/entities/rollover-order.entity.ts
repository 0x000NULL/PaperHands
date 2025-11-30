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
import { OptionType } from '../enums/order.enums';
import { RolloverStatus } from '../enums/multi-leg.enums';

@Entity('rollover_orders')
@Index(['userId', 'createdAt'])
@Index(['userId', 'status'])
export class RolloverOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column()
  userId: string;

  // Original position being rolled
  @Column({ type: 'uuid', nullable: true })
  originalPositionId: string | null;

  @Column({ type: 'varchar', length: 30 })
  originalOptionSymbol: string;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  underlyingSymbol: string;

  @Column({ type: 'varchar', length: 4 })
  originalOptionType: OptionType;

  @Column('decimal', { precision: 12, scale: 4 })
  originalStrikePrice: number;

  @Column({ type: 'date' })
  originalExpirationDate: Date;

  // Closing leg details
  @Column('decimal', { precision: 12, scale: 4 })
  closeQuantity: number;

  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  closePrice: number | null; // Premium at close

  @Column({ type: 'uuid', nullable: true })
  closingOrderId: string | null;

  // Opening leg details (new position)
  @Column({ type: 'varchar', length: 30 })
  newOptionSymbol: string;

  @Column({ type: 'varchar', length: 4 })
  newOptionType: OptionType;

  @Column('decimal', { precision: 12, scale: 4 })
  newStrikePrice: number;

  @Column({ type: 'date' })
  newExpirationDate: Date;

  @Column('decimal', { precision: 12, scale: 4 })
  openQuantity: number;

  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  openPrice: number | null; // Premium at open

  @Column({ type: 'uuid', nullable: true })
  openingOrderId: string | null;

  // Resulting position reference
  @Column({ type: 'uuid', nullable: true })
  newPositionId: string | null;

  // Order status and result
  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    default: RolloverStatus.PENDING,
  })
  status: RolloverStatus;

  // Net debit/credit for the rollover
  // Positive = net debit (paid more), Negative = net credit (received)
  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  netDebitCredit: number | null;

  @Column('text', { nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  executedAt: Date | null;
}
