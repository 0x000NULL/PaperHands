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

@Entity('refresh_tokens')
@Index(['userId', 'family'])
@Index(['expiresAt'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'token_hash', length: 64 })
  tokenHash: string;

  @Column({ length: 36 })
  family: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'revoked_reason', length: 255, nullable: true })
  revokedReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'device_info', type: 'jsonb', nullable: true })
  deviceInfo: { userAgent?: string; ip?: string } | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
