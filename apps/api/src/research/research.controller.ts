import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  NewsService,
  EarningsService,
  EconomicCalendarService,
  AnalystRatingsService,
  SecFilingsService,
  InsiderTradingService,
  FundamentalsService,
} from './services';
import {
  MarketNewsQueryDto,
  CompanyNewsQueryDto,
  EarningsCalendarQueryDto,
  EconomicCalendarQueryDto,
  SecFilingsQueryDto,
} from './dto';

@Controller('research')
@UseGuards(JwtAuthGuard)
export class ResearchController {
  constructor(
    private readonly newsService: NewsService,
    private readonly earningsService: EarningsService,
    private readonly economicCalendarService: EconomicCalendarService,
    private readonly analystRatingsService: AnalystRatingsService,
    private readonly secFilingsService: SecFilingsService,
    private readonly insiderTradingService: InsiderTradingService,
    private readonly fundamentalsService: FundamentalsService,
  ) {}

  // ===== NEWS =====

  @Get('news/market')
  async getMarketNews(@Query() query: MarketNewsQueryDto) {
    return this.newsService.getMarketNews(query);
  }

  @Get('news/:symbol')
  async getCompanyNews(
    @Param('symbol') symbol: string,
    @Query() query: CompanyNewsQueryDto,
  ) {
    return this.newsService.getCompanyNews(symbol, query);
  }

  // ===== EARNINGS =====

  @Get('earnings')
  async getEarningsCalendar(@Query() query: EarningsCalendarQueryDto) {
    return this.earningsService.getEarningsCalendar(query);
  }

  // ===== ECONOMIC CALENDAR =====

  @Get('economic-calendar')
  async getEconomicCalendar(@Query() query: EconomicCalendarQueryDto) {
    return this.economicCalendarService.getEconomicCalendar(query);
  }

  @Get('economic-calendar/high-impact')
  async getHighImpactEvents(@Query() query: EconomicCalendarQueryDto) {
    return this.economicCalendarService.getHighImpactEvents(query);
  }

  // ===== ANALYST RATINGS =====

  @Get('analyst/:symbol')
  async getAnalystRatings(@Param('symbol') symbol: string) {
    return this.analystRatingsService.getAnalystRatings(symbol);
  }

  // ===== SEC FILINGS =====

  @Get('filings/:symbol')
  async getSecFilings(
    @Param('symbol') symbol: string,
    @Query() query: SecFilingsQueryDto,
  ) {
    return this.secFilingsService.getFilings(symbol, query);
  }

  // ===== INSIDER TRADING =====

  @Get('insider/:symbol')
  async getInsiderTransactions(@Param('symbol') symbol: string) {
    return this.insiderTradingService.getInsiderTransactions(symbol);
  }

  // ===== FUNDAMENTALS =====

  @Get('fundamentals/:symbol')
  async getFundamentals(@Param('symbol') symbol: string) {
    return this.fundamentalsService.getCompanyFundamentals(symbol);
  }
}
