import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketDataModule } from '../market-data/market-data.module';

// Entities
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderAudit } from '../orders/entities/order-audit.entity';
import { Position } from '../portfolio/entities/position.entity';
import { OptionPosition } from '../portfolio/entities/option-position.entity';
import { AdminAudit } from './entities/admin-audit.entity';

// Services
import { AdminAuditService } from './services/admin-audit.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminOrdersService } from './services/admin-orders.service';
import { AdminSystemService } from './services/admin-system.service';

// Controllers
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminOrdersController } from './controllers/admin-orders.controller';
import { AdminSystemController } from './controllers/admin-system.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Order,
      OrderAudit,
      Position,
      OptionPosition,
      AdminAudit,
    ]),
    TerminusModule,
    ScheduleModule.forRoot(),
    MarketDataModule,
  ],
  controllers: [
    AdminUsersController,
    AdminOrdersController,
    AdminSystemController,
  ],
  providers: [
    AdminAuditService,
    AdminUsersService,
    AdminOrdersService,
    AdminSystemService,
  ],
  exports: [AdminAuditService],
})
export class AdminModule {}
