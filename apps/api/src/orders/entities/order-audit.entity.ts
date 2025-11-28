import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { AuditAction } from '../enums/order.enums';

export { AuditAction };

@Entity('order_audits')
@Index(['orderId', 'createdAt'])
export class OrderAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'jsonb', nullable: true })
  previousState: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  newState: Record<string, unknown> | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  triggerPrice: number | null;

  @Column('text', { nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
