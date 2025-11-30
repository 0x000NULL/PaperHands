import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
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
// Services
import { TaxLotService } from './services/tax-lot.service';
import { DividendService } from './services/dividend.service';
import { OptionTaxService } from './services/option-tax.service';
import { PortfolioGreeksService } from './services/portfolio-greeks.service';
import { GreeksAggregatorService } from './services/greeks-aggregator.service';
import { SensitivityAnalysisService } from './services/sensitivity-analysis.service';
import { WashSaleService } from './services/wash-sale.service';
import { WashSaleDetectorService } from './services/wash-sale-detector.service';
import { WashSaleQueueService } from './services/wash-sale-queue.service';
import { OptionStrategyService } from './services/option-strategy.service';
import { OptionAnalyticsService } from './services/option-analytics.service';
// Processors
import {
  WashSaleDetectionProcessor,
  WASH_SALE_QUEUE,
} from './processors/wash-sale-detection.processor';

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
    // Register BullMQ queue for wash sale detection
    BullModule.registerQueue({
      name: WASH_SALE_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
  ],
  controllers: [PortfolioController],
  providers: [
    PortfolioService,
    TaxLotService,
    DividendService,
    OptionTaxService,
    // Greeks Services
    PortfolioGreeksService,
    GreeksAggregatorService,
    SensitivityAnalysisService,
    // Wash Sale Services
    WashSaleService,
    WashSaleDetectorService,
    WashSaleQueueService,
    WashSaleDetectionProcessor,
    // Option Services
    OptionStrategyService,
    OptionAnalyticsService,
  ],
  exports: [
    PortfolioService,
    TaxLotService,
    DividendService,
    OptionTaxService,
    // Greeks Services
    PortfolioGreeksService,
    GreeksAggregatorService,
    SensitivityAnalysisService,
    // Wash Sale Services
    WashSaleService,
    WashSaleDetectorService,
    WashSaleQueueService,
    // Option Services
    OptionStrategyService,
    OptionAnalyticsService,
  ],
})
export class PortfolioModule {}
