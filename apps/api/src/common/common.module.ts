import { Module, Global } from '@nestjs/common';
import { MarketHoursService } from './services/market-hours.service';
import { TransactionManagerService } from './services/transaction-manager.service';

@Global()
@Module({
  providers: [MarketHoursService, TransactionManagerService],
  exports: [MarketHoursService, TransactionManagerService],
})
export class CommonModule {}
