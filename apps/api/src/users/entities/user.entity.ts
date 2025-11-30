import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Position } from '../../portfolio/entities/position.entity';
import { Order } from '../../orders/entities/order.entity';
import { Watchlist } from '../../watchlists/entities/watchlist.entity';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  passwordHash: string;

  @Column('decimal', { precision: 12, scale: 2, default: 100000 })
  cashBalance: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: false })
  onboardingCompleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  onboardingCompletedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  onboardingStep: number;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: false })
  disabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  disabledAt: Date | null;

  @OneToMany(() => Position, (position) => position.user)
  positions: Position[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Watchlist, (watchlist: Watchlist) => watchlist.user)
  watchlists: Watchlist[];
}
