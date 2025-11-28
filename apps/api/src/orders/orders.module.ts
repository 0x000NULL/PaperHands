import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderAudit } from './entities/order-audit.entity';
import { User } from '../users/entities/user.entity';
import { Position } from '../portfolio/entities/position.entity';
import { MarketDataModule } from '../market-data/market-data.module';
import { MarketHoursService } from '../common/services/market-hours.service';
import { PriceMonitorService } from './processors/price-monitor.service';
import { OrderExpirationService } from './processors/order-expiration.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderAudit, User, Position]),
    MarketDataModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    MarketHoursService,
    PriceMonitorService,
    OrderExpirationService,
  ],
  exports: [OrdersService, MarketHoursService],
})
export class OrdersModule {}
