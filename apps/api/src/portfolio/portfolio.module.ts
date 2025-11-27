import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { Position } from './entities/position.entity';
import { User } from '../users/entities/user.entity';
import { MarketDataModule } from '../market-data/market-data.module';

@Module({
  imports: [TypeOrmModule.forFeature([Position, User]), MarketDataModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
