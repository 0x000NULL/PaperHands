import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrderSide, OptionType } from '../enums/order.enums';
import { MultiLegOrder } from './multi-leg-order.entity';

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  iv: number;
}

@Entity('multi_leg_order_legs')
@Index(['multiLegOrderId'])
export class MultiLegOrderLeg {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MultiLegOrder, (order) => order.legs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'multiLegOrderId' })
  multiLegOrder: MultiLegOrder;

  @Column()
  multiLegOrderId: string;

  // Leg order within the strategy (0-indexed)
  @Column({ type: 'int' })
  legIndex: number;

  // Option details
  @Column({ type: 'varchar', length: 30 })
  optionSymbol: string; // OCC symbol (e.g., AAPL240119C00190000)

  @Column({ type: 'varchar', length: 4 })
  optionType: OptionType;

  @Column('decimal', { precision: 12, scale: 4 })
  strikePrice: number;

  @Column({ type: 'date' })
  expirationDate: Date;

  // Order details
  @Column({ type: 'varchar', length: 4 })
  side: OrderSide;

  @Column('decimal', { precision: 12, scale: 4 })
  quantity: number; // Number of contracts

  // Execution details (filled after order executes)
  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  filledPrice: number | null; // Premium per contract at fill

  @Column({ type: 'jsonb', nullable: true })
  greeksAtFill: OptionGreeks | null;

  // Reference to the resulting option position (if any)
  @Column({ type: 'uuid', nullable: true })
  resultingPositionId: string | null;

  // Reference to the individual order created for this leg
  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;
}
