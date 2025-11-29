import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { Position } from './entities/position.entity';
import { OptionPosition } from './entities/option-position.entity';
import { OptionClosure } from './entities/option-closure.entity';
import { TaxLot } from './entities/tax-lot.entity';
import { LotSale } from './entities/lot-sale.entity';
import { Dividend } from './entities/dividend.entity';
import { WashSale } from './entities/wash-sale.entity';
import { User } from '../users/entities/user.entity';
import { UserCostBasisPreference } from '../users/entities/user-cost-basis-preference.entity';
import { MarketDataModule } from '../market-data/market-data.module';
import { TaxLotService } from './services/tax-lot.service';
import { DividendService } from './services/dividend.service';
import { OptionTaxService } from './services/option-tax.service';
import { PortfolioGreeksService } from './services/portfolio-greeks.service';
import { WashSaleService } from './services/wash-sale.service';
import { OptionStrategyService } from './services/option-strategy.service';
import { OptionAnalyticsService } from './services/option-analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Position,
      OptionPosition,
      OptionClosure,
      TaxLot,
      LotSale,
      Dividend,
      WashSale,
      User,
      UserCostBasisPreference,
    ]),
    MarketDataModule,
  ],
  controllers: [PortfolioController],
  providers: [
    PortfolioService,
    TaxLotService,
    DividendService,
    OptionTaxService,
    PortfolioGreeksService,
    WashSaleService,
    OptionStrategyService,
    OptionAnalyticsService,
  ],
  exports: [
    PortfolioService,
    TaxLotService,
    DividendService,
    OptionTaxService,
    PortfolioGreeksService,
    WashSaleService,
    OptionStrategyService,
    OptionAnalyticsService,
  ],
})
export class PortfolioModule {}
