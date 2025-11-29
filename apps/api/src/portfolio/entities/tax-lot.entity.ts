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
import { Order } from '../../orders/entities/order.entity';
import { TaxLotStatus } from '../enums/cost-basis.enums';

@Entity('tax_lots')
@Index(['userId', 'symbol', 'status'])
@Index(['userId', 'status', 'acquiredAt'])
export class TaxLot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column()
  userId: string;

  @Index()
  @Column()
  symbol: string;

  @Column('decimal', { precision: 12, scale: 4 })
  originalQuantity: number;

  @Column('decimal', { precision: 12, scale: 4 })
  remainingQuantity: number;

  @Column('decimal', { precision: 12, scale: 4 })
  costBasisPerShare: number;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sourceOrderId' })
  sourceOrder: Order;

  @Column({ nullable: true })
  sourceOrderId: string;

  @Column({
    type: 'enum',
    enum: TaxLotStatus,
    default: TaxLotStatus.OPEN,
  })
  status: TaxLotStatus;

  @Index()
  @Column({ type: 'timestamp' })
  acquiredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;
}
