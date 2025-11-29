import {
  Controller,
  Get,
  Query,
  UseGuards,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AnalyticsService } from './analytics.service';
import type { AnalyticsPeriod } from './analytics.service';
import { TaxLotService } from '../portfolio/services/tax-lot.service';
import { DividendService } from '../portfolio/services/dividend.service';
import { DividendStatus } from '../portfolio/enums/cost-basis.enums';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly taxLotService: TaxLotService,
    private readonly dividendService: DividendService,
  ) {}

  @Get('performance')
  async getPerformanceHistory(
    @CurrentUser() user: User,
    @Query('period', new DefaultValuePipe('1M')) period: AnalyticsPeriod,
  ) {
    return this.analyticsService.getPerformanceHistory(user.id, period);
  }

  @Get('statistics')
  async getTradeStatistics(@CurrentUser() user: User) {
    return this.analyticsService.getTradeStatistics(user.id);
  }

  @Get('allocation')
  async getAllocationBreakdown(@CurrentUser() user: User) {
    return this.analyticsService.getAllocationBreakdown(user.id);
  }

  @Get('gains')
  async getGainsSummary(@CurrentUser() user: User) {
    return this.analyticsService.getGainsSummary(user.id);
  }

  @Get('realized-gains')
  async getRealizedGains(
    @CurrentUser() user: User,
    @Query('year') year?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let start: Date;
    let end: Date;

    if (year) {
      start = new Date(`${year}-01-01`);
      end = new Date(`${year}-12-31`);
    } else {
      start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
      end = endDate ? new Date(endDate) : new Date();
    }

    return this.taxLotService.getRealizedGainsSummary(user.id, start, end);
  }

  @Get('benchmark')
  async getBenchmarkComparison(
    @CurrentUser() user: User,
    @Query('symbol', new DefaultValuePipe('SPY')) symbol: string,
    @Query('period', new DefaultValuePipe('1M')) period: AnalyticsPeriod,
  ) {
    return this.analyticsService.getBenchmarkComparison(
      user.id,
      symbol.toUpperCase(),
      period,
    );
  }

  @Get('tax-lots')
  async getTaxLots(
    @CurrentUser() user: User,
    @Query('symbol') symbol?: string,
  ) {
    const lots = await this.taxLotService.getTaxLots(
      user.id,
      symbol?.toUpperCase(),
    );

    return lots.map((lot) => ({
      id: lot.id,
      symbol: lot.symbol,
      originalQuantity: Number(lot.originalQuantity),
      remainingQuantity: Number(lot.remainingQuantity),
      costBasisPerShare: Number(lot.costBasisPerShare),
      totalCostBasis: Number(lot.originalQuantity) * Number(lot.costBasisPerShare),
      acquiredAt: lot.acquiredAt,
      status: lot.status,
      closedAt: lot.closedAt,
    }));
  }

  @Get('tax-lots/open')
  async getOpenTaxLots(
    @CurrentUser() user: User,
    @Query('symbol') symbol?: string,
  ) {
    const lots = await this.taxLotService.getOpenLots(
      user.id,
      symbol?.toUpperCase(),
    );

    return lots.map((lot) => ({
      id: lot.id,
      symbol: lot.symbol,
      remainingQuantity: Number(lot.remainingQuantity),
      costBasisPerShare: Number(lot.costBasisPerShare),
      totalCostBasis: Number(lot.remainingQuantity) * Number(lot.costBasisPerShare),
      acquiredAt: lot.acquiredAt,
      holdingDays: Math.floor(
        (Date.now() - lot.acquiredAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
      isLongTerm: Math.floor(
        (Date.now() - lot.acquiredAt.getTime()) / (1000 * 60 * 60 * 24),
      ) > 365,
    }));
  }

  @Get('lot-sales')
  async getLotSales(
    @CurrentUser() user: User,
    @Query('symbol') symbol?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const sales = await this.taxLotService.getLotSales(user.id, {
      symbol: symbol?.toUpperCase(),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return sales.map((sale) => ({
      id: sale.id,
      symbol: sale.symbol,
      quantitySold: Number(sale.quantitySold),
      costBasisPerShare: Number(sale.costBasisPerShare),
      salePrice: Number(sale.salePrice),
      realizedGain: Number(sale.realizedGain),
      proceeds: Number(sale.proceeds),
      costBasis: Number(sale.costBasis),
      gainType: sale.gainType,
      holdingDays: sale.holdingDays,
      soldAt: sale.soldAt,
    }));
  }

  @Get('cost-basis-preview')
  async getCostBasisPreview(
    @CurrentUser() user: User,
    @Query('symbol') symbol: string,
    @Query('quantity') quantity: string,
    @Query('price') price: string,
    @Query('method') method?: string,
  ) {
    return this.taxLotService.getCostBasisPreview(
      user.id,
      symbol.toUpperCase(),
      parseFloat(quantity),
      parseFloat(price),
      method as any,
    );
  }

  @Get('settings/cost-basis')
  async getCostBasisSettings(@CurrentUser() user: User) {
    const pref = await this.taxLotService.getUserPreference(user.id);
    return (
      pref || {
        defaultMethod: 'fifo',
        symbolOverrides: {},
      }
    );
  }

  @Get('dividends')
  async getDividends(
    @CurrentUser() user: User,
    @Query('symbol') symbol?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const dividends = await this.dividendService.getDividends(user.id, {
      symbol: symbol?.toUpperCase(),
      status: status as DividendStatus,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return dividends.map((d) => ({
      id: d.id,
      symbol: d.symbol,
      exDate: d.exDate,
      payDate: d.payDate,
      amount: Number(d.amount),
      quantity: Number(d.quantity),
      totalAmount: Number(d.totalAmount),
      status: d.status,
      reinvested: d.reinvested,
    }));
  }

  @Get('dividends/upcoming')
  async getUpcomingDividends(@CurrentUser() user: User) {
    const dividends = await this.dividendService.getUpcomingDividends(user.id);

    return dividends.map((d) => ({
      id: d.id,
      symbol: d.symbol,
      exDate: d.exDate,
      payDate: d.payDate,
      amount: Number(d.amount),
      quantity: Number(d.quantity),
      totalAmount: Number(d.totalAmount),
    }));
  }

  @Get('dividends/summary')
  async getDividendSummary(@CurrentUser() user: User) {
    return this.dividendService.getDividendSummary(user.id);
  }

  @Get('dividends/by-symbol')
  async getDividendsBySymbol(
    @CurrentUser() user: User,
    @Query('year') year?: string,
  ) {
    const targetYear = year
      ? parseInt(year, 10)
      : new Date().getFullYear();
    return this.dividendService.getAnnualDividendsBySymbol(user.id, targetYear);
  }
}
