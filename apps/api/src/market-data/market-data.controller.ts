import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FinnhubService } from './finnhub.service';
import { TradierService } from './tradier.service';
import { CandleQueryDto } from './dto/candle-query.dto';

@Controller('market-data')
@UseGuards(JwtAuthGuard)
export class MarketDataController {
  constructor(
    private readonly finnhubService: FinnhubService,
    private readonly tradierService: TradierService,
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
}
