import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PortfolioService } from './portfolio.service';
import { PortfolioGreeksService } from './services/portfolio-greeks.service';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly portfolioGreeksService: PortfolioGreeksService,
  ) {}

  @Get()
  async getPortfolio(@CurrentUser() user: User) {
    return this.portfolioService.getPortfolio(user.id);
  }

  @Get('options')
  async getOptionPositions(@CurrentUser() user: User) {
    return this.portfolioService.getOptionPositions(user.id);
  }

  // ============ Greeks Endpoints ============

  @Get('greeks')
  async getPortfolioGreeks(@CurrentUser() user: User) {
    return this.portfolioGreeksService.getPortfolioGreeks(user.id);
  }

  @Get('greeks/by-underlying')
  async getGreeksByUnderlying(@CurrentUser() user: User) {
    return this.portfolioGreeksService.getGreeksByUnderlying(user.id);
  }

  @Get('greeks/by-expiration')
  async getGreeksByExpiration(@CurrentUser() user: User) {
    const summary = await this.portfolioGreeksService.getPortfolioGreeks(
      user.id,
    );
    return summary.positionsByExpiration;
  }

  @Get('greeks/theta-projection')
  async getThetaDecayProjection(
    @CurrentUser() user: User,
    @Query('days') days?: string,
  ) {
    const dayCount = days ? parseInt(days, 10) : 30;
    return this.portfolioGreeksService.getThetaDecayProjection(
      user.id,
      dayCount,
    );
  }

  @Get('greeks/delta-exposure')
  async getDeltaExposureAnalysis(
    @CurrentUser() user: User,
    @Query('symbol') symbol?: string,
  ) {
    return this.portfolioGreeksService.getDeltaExposureAnalysis(
      user.id,
      symbol,
    );
  }

  @Get('greeks/sensitivity/:symbol')
  async getGreeksSensitivity(
    @CurrentUser() user: User,
    @Param('symbol') symbol: string,
  ) {
    return this.portfolioGreeksService.getGreeksSensitivity(
      user.id,
      symbol.toUpperCase(),
    );
  }

  // ============ Expirations Endpoint ============

  @Get('options/expirations')
  async getOptionExpirations(@CurrentUser() user: User) {
    const positions = await this.portfolioService.getOptionPositions(user.id);

    // Group positions by expiration date
    const expirationMap = new Map<
      string,
      {
        positions: typeof positions;
        totalContracts: number;
        daysToExpiration: number;
      }
    >();

    const now = new Date();

    for (const position of positions) {
      const expDateStr = new Date(position.expirationDate)
        .toISOString()
        .split('T')[0];

      if (!expirationMap.has(expDateStr)) {
        const expDate = new Date(position.expirationDate);
        const daysToExpiration = Math.ceil(
          (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        expirationMap.set(expDateStr, {
          positions: [],
          totalContracts: 0,
          daysToExpiration,
        });
      }

      const bucket = expirationMap.get(expDateStr)!;
      bucket.positions.push(position);
      bucket.totalContracts += Math.abs(position.quantity);
    }

    // Convert to array and sort by date
    return Array.from(expirationMap.entries())
      .map(([date, data]) => ({
        expirationDate: date,
        daysToExpiration: data.daysToExpiration,
        totalContracts: data.totalContracts,
        positionCount: data.positions.length,
        positions: data.positions,
      }))
      .sort(
        (a, b) =>
          new Date(a.expirationDate).getTime() -
          new Date(b.expirationDate).getTime(),
      );
  }
}
