import { Injectable, HttpException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

export interface Quote {
  symbol: string;
  description: string;
  last: number;
  bid: number;
  ask: number;
  volume: number;
  change: number;
  change_percentage: number;
  open: number;
  high: number;
  low: number;
  close: number | null;
}

@Injectable()
export class TradierService {
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.baseUrl = this.configService.get<string>(
      'TRADIER_BASE_URL',
      'https://sandbox.tradier.com/v1',
    );
    this.apiToken = this.configService.get<string>('TRADIER_API_TOKEN', '');
  }

  async getQuote(symbol: string): Promise<Quote> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `quote:${upperSymbol}`;

    // Check cache first
    const cached = await this.cacheManager.get<Quote>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await fetch(
      `${this.baseUrl}/markets/quotes?symbols=${upperSymbol}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new HttpException(
        `Failed to fetch quote for ${upperSymbol}`,
        response.status,
      );
    }

    const data = await response.json();

    if (!data.quotes || !data.quotes.quote) {
      throw new HttpException(`Quote not found for ${upperSymbol}`, 404);
    }

    const quote = data.quotes.quote;

    // Cache for 5 seconds
    await this.cacheManager.set(cacheKey, quote, 5000);

    return quote;
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const upperSymbols = symbols.map((s) => s.toUpperCase());
    const symbolsParam = upperSymbols.join(',');

    const response = await fetch(
      `${this.baseUrl}/markets/quotes?symbols=${symbolsParam}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new HttpException('Failed to fetch quotes', response.status);
    }

    const data = await response.json();

    if (!data.quotes || !data.quotes.quote) {
      return [];
    }

    // Tradier returns single object if one symbol, array if multiple
    const quotes = Array.isArray(data.quotes.quote)
      ? data.quotes.quote
      : [data.quotes.quote];

    return quotes;
  }
}
