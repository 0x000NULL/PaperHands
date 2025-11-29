import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderAudit } from './entities/order-audit.entity';
import { User } from '../users/entities/user.entity';
import { Position } from '../portfolio/entities/position.entity';
import { TaxLot } from '../portfolio/entities/tax-lot.entity';
import { LotSale } from '../portfolio/entities/lot-sale.entity';
import { UserCostBasisPreference } from '../users/entities/user-cost-basis-preference.entity';
import { MarketDataModule } from '../market-data/market-data.module';
import { MarketHoursService } from '../common/services/market-hours.service';
import { PriceMonitorService } from './processors/price-monitor.service';
import { OrderExpirationService } from './processors/order-expiration.service';
import { QueuedOrderProcessor } from './processors/queued-order.processor';
import { TaxLotService } from '../portfolio/services/tax-lot.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderAudit,
      User,
      Position,
      TaxLot,
      LotSale,
      UserCostBasisPreference,
    ]),
    MarketDataModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    MarketHoursService,
    PriceMonitorService,
    OrderExpirationService,
    QueuedOrderProcessor,
    TaxLotService,
  ],
  exports: [OrdersService, MarketHoursService],
})
export class OrdersModule {}
