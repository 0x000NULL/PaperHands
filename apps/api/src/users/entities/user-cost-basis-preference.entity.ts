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
import { CostBasisMethod } from '../../portfolio/enums/cost-basis.enums';

@Entity('user_cost_basis_preferences')
export class UserCostBasisPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: CostBasisMethod,
    default: CostBasisMethod.FIFO,
  })
  defaultMethod: CostBasisMethod;

  // Per-symbol overrides for cost basis method
  @Column({ type: 'jsonb', default: {} })
  symbolOverrides: Record<string, CostBasisMethod>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
