import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { OrderType, TimeInForce } from '../../orders/enums/order.enums';
import { CostBasisMethod } from '../../portfolio/enums/cost-basis.enums';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  userId: string;

  @Column({
    type: 'varchar',
    default: OrderType.MARKET,
  })
  defaultOrderType: OrderType;

  @Column({
    type: 'varchar',
    default: TimeInForce.DAY,
  })
  defaultTimeInForce: TimeInForce;

  @Column({
    type: 'varchar',
    default: CostBasisMethod.FIFO,
  })
  defaultCostBasisMethod: CostBasisMethod;

  @Column({ default: false })
  tourCompleted: boolean;

  @Column({
    type: 'varchar',
    default: 'dark',
  })
  theme: 'light' | 'dark';

  @Column({
    type: 'varchar',
    default: 'SPY',
  })
  defaultBenchmarkSymbol: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
