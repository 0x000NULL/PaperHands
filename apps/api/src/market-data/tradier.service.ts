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

// Tradier API response types
interface TradierQuotesResponse {
  quotes: {
    quote: Quote | Quote[];
  } | null;
}

@Injectable()
export class TradierService {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly requestTimeout = 10000; // 10 seconds
  private readonly maxRetries = 3;

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

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options);
        // Don't retry on client errors (4xx), only on server errors (5xx)
        if (response.ok || response.status < 500) {
          return response;
        }
        lastError = new Error(`Server error: ${response.status}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Don't retry if the request was aborted (timeout)
        if (lastError.name === 'AbortError') {
          throw new HttpException('Request timeout', 408);
        }
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < this.maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt)),
        );
      }
    }

    throw new HttpException(lastError?.message || 'Max retries exceeded', 503);
  }

  async getQuote(symbol: string): Promise<Quote> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `quote:${upperSymbol}`;

    // Check cache first
    const cached = await this.cacheManager.get<Quote>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.fetchWithRetry(
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

    const data = (await response.json()) as TradierQuotesResponse;

    if (!data.quotes || !data.quotes.quote) {
      throw new HttpException(`Quote not found for ${upperSymbol}`, 404);
    }

    // Tradier returns single object for single symbol request
    const quote = Array.isArray(data.quotes.quote)
      ? data.quotes.quote[0]
      : data.quotes.quote;

    // Cache for 5 seconds
    await this.cacheManager.set(cacheKey, quote, 5000);

    return quote;
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const upperSymbols = symbols.map((s) => s.toUpperCase());
    const symbolsParam = upperSymbols.join(',');

    const response = await this.fetchWithRetry(
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

    const data = (await response.json()) as TradierQuotesResponse;

    if (!data.quotes || !data.quotes.quote) {
      return [];
    }

    // Tradier returns single object if one symbol, array if multiple
    const quotes: Quote[] = Array.isArray(data.quotes.quote)
      ? data.quotes.quote
      : [data.quotes.quote];

    return quotes;
  }
}
