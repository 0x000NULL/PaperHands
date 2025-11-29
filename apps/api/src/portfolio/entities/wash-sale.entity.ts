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
import { LotSale } from './lot-sale.entity';
import { TaxLot } from './tax-lot.entity';
import { OptionClosure } from './option-closure.entity';

export enum WashSaleType {
  STOCK_TO_STOCK = 'stock_to_stock',
  STOCK_TO_OPTION = 'stock_to_option',
  OPTION_TO_OPTION = 'option_to_option',
  OPTION_TO_STOCK = 'option_to_stock',
}

@Entity('wash_sales')
@Index(['userId', 'symbol', 'createdAt'])
@Index(['userId', 'taxYear'])
export class WashSale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column()
  userId: string;

  @Column()
  symbol: string;

  @Column({
    type: 'enum',
    enum: WashSaleType,
    default: WashSaleType.STOCK_TO_STOCK,
  })
  washSaleType: WashSaleType;

  // The sale that triggered the wash sale (loss disallowed)
  @ManyToOne(() => LotSale, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'triggeringSaleId' })
  triggeringSale: LotSale | null;

  @Column({ nullable: true })
  triggeringSaleId: string | null;

  // Option closure that triggered (if applicable)
  @ManyToOne(() => OptionClosure, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'triggeringOptionClosureId' })
  triggeringOptionClosure: OptionClosure | null;

  @Column({ nullable: true })
  triggeringOptionClosureId: string | null;

  // The replacement lot that received the disallowed loss
  @ManyToOne(() => TaxLot, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'replacementTaxLotId' })
  replacementTaxLot: TaxLot | null;

  @Column({ nullable: true })
  replacementTaxLotId: string | null;

  // Option details if replacement is an option
  @Column({ nullable: true })
  replacementOptionSymbol: string | null;

  // Disallowed loss amount
  @Column('decimal', { precision: 12, scale: 2 })
  disallowedLoss: number;

  // Original loss before wash sale adjustment
  @Column('decimal', { precision: 12, scale: 2 })
  originalLoss: number;

  // Quantity affected
  @Column('decimal', { precision: 12, scale: 4 })
  quantityAffected: number;

  // Cost basis adjustment added to replacement shares
  @Column('decimal', { precision: 12, scale: 2 })
  costBasisAdjustment: number;

  // Date of the loss sale
  @Column({ type: 'timestamp' })
  saleDate: Date;

  // Date of the replacement purchase
  @Column({ type: 'timestamp' })
  replacementDate: Date;

  // Days between sale and replacement (negative = bought before sale)
  @Column('int')
  daysBetween: number;

  // Tax year for reporting
  @Column('int')
  taxYear: number;

  // Notes about the wash sale
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
