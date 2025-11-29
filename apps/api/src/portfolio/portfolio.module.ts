import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { Position } from './entities/position.entity';
import { TaxLot } from './entities/tax-lot.entity';
import { LotSale } from './entities/lot-sale.entity';
import { Dividend } from './entities/dividend.entity';
import { User } from '../users/entities/user.entity';
import { UserCostBasisPreference } from '../users/entities/user-cost-basis-preference.entity';
import { MarketDataModule } from '../market-data/market-data.module';
import { TaxLotService } from './services/tax-lot.service';
import { DividendService } from './services/dividend.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Position,
      TaxLot,
      LotSale,
      Dividend,
      User,
      UserCostBasisPreference,
    ]),
    MarketDataModule,
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService, TaxLotService, DividendService],
  exports: [PortfolioService, TaxLotService, DividendService],
})
export class PortfolioModule {}
