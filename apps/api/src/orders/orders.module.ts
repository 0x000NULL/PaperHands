import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderAuditService } from './services/order-audit.service';
import { OrderValidationService } from './services/order-validation.service';
import { OrderQueryService } from './services/order-query.service';
import { EquityPositionService } from './services/equity-position.service';
import { OrderExecutionService } from './services/order-execution.service';
import { OptionOrderService } from './services/option-order.service';
import { Order } from './entities/order.entity';
import { OrderAudit } from './entities/order-audit.entity';
import { User } from '../users/entities/user.entity';
import { Position } from '../portfolio/entities/position.entity';
import { OptionPosition } from '../portfolio/entities/option-position.entity';
import { OptionClosure } from '../portfolio/entities/option-closure.entity';
import { TaxLot } from '../portfolio/entities/tax-lot.entity';
import { LotSale } from '../portfolio/entities/lot-sale.entity';
import { UserCostBasisPreference } from '../users/entities/user-cost-basis-preference.entity';
import { MarketDataModule } from '../market-data/market-data.module';
import { MarketHoursService } from '../common/services/market-hours.service';
import { PriceMonitorService } from './processors/price-monitor.service';
import { OrderExpirationService } from './processors/order-expiration.service';
import { OptionExpirationProcessor } from './processors/option-expiration.processor';
import { QueuedOrderProcessor } from './processors/queued-order.processor';
import { TaxLotService } from '../portfolio/services/tax-lot.service';
import { OptionTaxService } from '../portfolio/services/option-tax.service';
// Execution Strategies
import {
  MarketOrderStrategy,
  LimitOrderStrategy,
  StopOrderStrategy,
  StopLimitOrderStrategy,
  TrailingStopStrategy,
  IOCOrderStrategy,
  FOKOrderStrategy,
  ExecutionStrategyFactory,
} from './strategies';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderAudit,
      User,
      Position,
      OptionPosition,
      OptionClosure,
      TaxLot,
      LotSale,
      UserCostBasisPreference,
    ]),
    MarketDataModule,
  ],
  controllers: [OrdersController],
  providers: [
    // Core Services
    OrdersService,
    OrderAuditService,
    OrderValidationService,
    OrderQueryService,
    EquityPositionService,
    OrderExecutionService,
    OptionOrderService,
    MarketHoursService,
    // Execution Strategies
    MarketOrderStrategy,
    LimitOrderStrategy,
    StopOrderStrategy,
    StopLimitOrderStrategy,
    TrailingStopStrategy,
    IOCOrderStrategy,
    FOKOrderStrategy,
    ExecutionStrategyFactory,
    // Processors
    PriceMonitorService,
    OrderExpirationService,
    OptionExpirationProcessor,
    QueuedOrderProcessor,
    // Portfolio Services
    TaxLotService,
    OptionTaxService,
  ],
  exports: [OrdersService, MarketHoursService],
})
export class OrdersModule {}
