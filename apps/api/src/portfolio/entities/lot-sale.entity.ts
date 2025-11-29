import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TaxLot } from './tax-lot.entity';
import { Order } from '../../orders/entities/order.entity';
import { GainType } from '../enums/cost-basis.enums';

@Entity('lot_sales')
@Index(['taxLotId', 'createdAt'])
@Index(['sellOrderId'])
@Index(['userId', 'symbol', 'soldAt'])
@Index(['userId', 'gainType', 'soldAt'])
export class LotSale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TaxLot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taxLotId' })
  taxLot: TaxLot;

  @Index()
  @Column()
  taxLotId: string;

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'sellOrderId' })
  sellOrder: Order;

  @Column({ nullable: true })
  sellOrderId: string;

  // Denormalized for efficient queries
  @Column()
  userId: string;

  @Column()
  symbol: string;

  @Column('decimal', { precision: 12, scale: 4 })
  quantitySold: number;

  @Column('decimal', { precision: 12, scale: 4 })
  costBasisPerShare: number;

  @Column('decimal', { precision: 12, scale: 4 })
  salePrice: number;

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

  @Index()
  @Column({ type: 'timestamp' })
  soldAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
