import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { UserPreferences } from './users/entities/user-preferences.entity';
import { Position } from './portfolio/entities/position.entity';
import { Order } from './orders/entities/order.entity';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
require('dotenv').config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, UserPreferences, Position, Order],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});
