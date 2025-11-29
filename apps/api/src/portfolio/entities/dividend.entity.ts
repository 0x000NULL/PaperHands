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
import { DividendStatus } from '../enums/cost-basis.enums';

@Entity('dividends')
@Index(['userId', 'status'])
@Index(['userId', 'payDate'])
@Index(['userId', 'symbol', 'exDate'])
export class Dividend {
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

  @Column({ type: 'date' })
  exDate: Date;

  @Column({ type: 'date' })
  payDate: Date;

  // Amount per share
  @Column('decimal', { precision: 10, scale: 4 })
  amount: number;

  // Shares held on ex-date
  @Column('decimal', { precision: 12, scale: 4 })
  quantity: number;

  // Total dividend amount (amount * quantity)
  @Column('decimal', { precision: 12, scale: 2 })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: DividendStatus,
    default: DividendStatus.PENDING,
  })
  status: DividendStatus;

  // Whether dividend was reinvested (DRIP)
  @Column({ default: false })
  reinvested: boolean;

  // If reinvested, link to the tax lot created
  @Column({ nullable: true })
  reinvestmentTaxLotId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
