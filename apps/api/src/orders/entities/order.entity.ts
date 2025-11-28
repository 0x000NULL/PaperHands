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

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderStatus {
  PENDING = 'pending',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
}

@Entity('orders')
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

  @Column('decimal', { precision: 12, scale: 4 })
  quantity: number;

  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  filledPrice: number | null;

  @Index()
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Index()
  @Column({ nullable: true })
  idempotencyKey?: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
