import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FinnhubService } from './finnhub.service';
import { TradierService } from './tradier.service';
import { VolatilityService } from './services/volatility.service';
import { CandleQueryDto } from './dto/candle-query.dto';
import { OptionsQueryDto } from './dto/options.dto';
import { MarketHoursService } from '../common/services/market-hours.service';

@Controller('market-data')
@UseGuards(JwtAuthGuard)
export class MarketDataController {
  constructor(
    private readonly finnhubService: FinnhubService,
    private readonly tradierService: TradierService,
    private readonly volatilityService: VolatilityService,
    private readonly marketHoursService: MarketHoursService,
  ) {}

  @Get('quote/:symbol')
  async getQuote(@Param('symbol') symbol: string) {
    return this.finnhubService.getQuote(symbol);
  }

  @Get('candles/:symbol')
  async getCandles(
    @Param('symbol') symbol: string,
    @Query() query: CandleQueryDto,
  ) {
    // Use Tradier for historical data (better sandbox support)
    return this.tradierService.getCandles(symbol, query.period);
  }

  @Get('quotes')
  async getQuotes(@Query('symbols') symbols: string) {
    if (!symbols) {
      return [];
    }
    const symbolList = symbols.split(',').map((s) => s.trim().toUpperCase());
    return this.finnhubService.getQuotes(symbolList);
  }

  @Get('market-status')
  getMarketStatus() {
    return this.marketHoursService.getMarketHoursInfo();
  }

  @Get('options/expirations/:symbol')
  async getOptionsExpirations(@Param('symbol') symbol: string) {
    return this.tradierService.getOptionsExpirations(symbol);
  }

  @Get('options/chain/:symbol')
  async getOptionsChain(
    @Param('symbol') symbol: string,
    @Query() query: OptionsQueryDto,
  ) {
    return this.tradierService.getOptionsChain(
      symbol,
      query.expiration,
      query.strikeRange,
    );
  }

  // Volatility endpoints

  @Get('volatility/:symbol')
  async getVolatilityMetrics(@Param('symbol') symbol: string) {
    return this.volatilityService.getVolatilityMetrics(symbol);
  }

  @Get('volatility/:symbol/rank')
  async getIVRank(@Param('symbol') symbol: string) {
    return this.volatilityService.getIVRank(symbol);
  }

  @Get('volatility/:symbol/comparison')
  async getVolatilityComparison(@Param('symbol') symbol: string) {
    return this.volatilityService.getVolatilityComparison(symbol);
  }

  @Get('volatility/:symbol/history')
  async getVolatilityHistory(
    @Param('symbol') symbol: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.volatilityService.getVolatilityHistory(symbol, start, end);
  }
}
