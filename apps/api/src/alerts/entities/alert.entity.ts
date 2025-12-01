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
import { AlertType } from '../enums/alert-type.enum';
import { AlertCondition } from '../enums/alert-condition.enum';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: AlertType,
  })
  type: AlertType;

  @Index()
  @Column({ nullable: true })
  symbol: string; // null for portfolio-level alerts

  @Column({
    type: 'enum',
    enum: AlertCondition,
  })
  condition: AlertCondition;

  @Column('decimal', { precision: 18, scale: 6 })
  targetValue: number;

  @Column({ nullable: true })
  greekType: string; // delta, gamma, theta, vega, rho (for GREEKS type)

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  triggeredAt: Date | null;

  @Column('decimal', { precision: 18, scale: 6, nullable: true })
  lastCheckedValue: number | null; // for CROSSES condition tracking

  @Column({ nullable: true })
  name: string; // optional user-friendly name

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
