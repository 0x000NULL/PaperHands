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
import { AdminAuditAction } from '../enums/admin-audit-action.enum';

@Entity('admin_audits')
@Index(['adminId', 'createdAt'])
@Index(['targetUserId', 'createdAt'])
@Index(['action', 'createdAt'])
export class AdminAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'admin_id' })
  adminId: string;

  @Column({ name: 'target_user_id', nullable: true })
  targetUserId: string | null;

  @Column({ type: 'enum', enum: AdminAuditAction })
  action: AdminAuditAction;

  @Column({ type: 'jsonb', nullable: true })
  previousState: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  newState: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'target_user_id' })
  targetUser: User | null;
}
