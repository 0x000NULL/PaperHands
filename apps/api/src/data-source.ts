import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { UserPreferences } from './users/entities/user-preferences.entity';
import { UserCostBasisPreference } from './users/entities/user-cost-basis-preference.entity';
import { UserLayout } from './users/entities/user-layout.entity';
import { Position } from './portfolio/entities/position.entity';
import { OptionPosition } from './portfolio/entities/option-position.entity';
import { OptionClosure } from './portfolio/entities/option-closure.entity';
import { TaxLot } from './portfolio/entities/tax-lot.entity';
import { LotSale } from './portfolio/entities/lot-sale.entity';
import { WashSale } from './portfolio/entities/wash-sale.entity';
import { Dividend } from './portfolio/entities/dividend.entity';
import { Order } from './orders/entities/order.entity';
import { OrderAudit } from './orders/entities/order-audit.entity';
import { MultiLegOrder } from './orders/entities/multi-leg-order.entity';
import { MultiLegOrderLeg } from './orders/entities/multi-leg-order-leg.entity';
import { RolloverOrder } from './orders/entities/rollover-order.entity';
import { Watchlist } from './watchlists/entities/watchlist.entity';
import { WatchlistItem } from './watchlists/entities/watchlist-item.entity';
import { PortfolioSnapshot } from './analytics/entities/portfolio-snapshot.entity';
import { AdminAudit } from './admin/entities/admin-audit.entity';
import { Alert } from './alerts/entities/alert.entity';
import { Notification } from './alerts/entities/notification.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { VolatilitySnapshot } from './market-data/entities/volatility-snapshot.entity';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
require('dotenv').config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User,
    UserPreferences,
    UserCostBasisPreference,
    UserLayout,
    Position,
    OptionPosition,
    OptionClosure,
    TaxLot,
    LotSale,
    WashSale,
    Dividend,
    Order,
    OrderAudit,
    MultiLegOrder,
    MultiLegOrderLeg,
    RolloverOrder,
    Watchlist,
    WatchlistItem,
    PortfolioSnapshot,
    AdminAudit,
    Alert,
    Notification,
    RefreshToken,
    VolatilitySnapshot,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});
