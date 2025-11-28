import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FinnhubService } from './finnhub.service';
import { CandleQueryDto } from './dto/candle-query.dto';

@Controller('market-data')
@UseGuards(JwtAuthGuard)
export class MarketDataController {
  constructor(private readonly finnhubService: FinnhubService) {}

  @Get('quote/:symbol')
  async getQuote(@Param('symbol') symbol: string) {
    return this.finnhubService.getQuote(symbol);
  }

  @Get('candles/:symbol')
  async getCandles(
    @Param('symbol') symbol: string,
    @Query() query: CandleQueryDto,
  ) {
    return this.finnhubService.getCandles(symbol, query.period);
  }
}
