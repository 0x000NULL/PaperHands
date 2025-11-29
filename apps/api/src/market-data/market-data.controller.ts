import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FinnhubService } from './finnhub.service';
import { TradierService } from './tradier.service';
import { CandleQueryDto } from './dto/candle-query.dto';
import { MarketHoursService } from '../common/services/market-hours.service';

@Controller('market-data')
@UseGuards(JwtAuthGuard)
export class MarketDataController {
  constructor(
    private readonly finnhubService: FinnhubService,
    private readonly tradierService: TradierService,
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
}
