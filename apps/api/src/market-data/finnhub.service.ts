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

// Finnhub API response types
interface FinnhubQuoteResponse {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

interface FinnhubProfileResponse {
  name: string;
  ticker: string;
  // ... other fields we don't need
}

@Injectable()
export class FinnhubService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly requestTimeout = 10000; // 10 seconds
  private readonly maxRetries = 3;

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.baseUrl = this.configService.get<string>(
      'FINNHUB_BASE_URL',
      'https://finnhub.io/api/v1',
    );
    this.apiKey = this.configService.get<string>('FINNHUB_API_KEY', '');
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

  private async getCompanyName(symbol: string): Promise<string> {
    const cacheKey = `profile:${symbol}`;

    // Check cache first (cache for 24 hours since company names rarely change)
    const cached = await this.cacheManager.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/stock/profile2?symbol=${symbol}&token=${this.apiKey}`,
        {
          headers: { Accept: 'application/json' },
        },
      );

      if (response.ok) {
        const data = (await response.json()) as FinnhubProfileResponse;
        const name = data.name || symbol;
        // Cache for 24 hours
        await this.cacheManager.set(cacheKey, name, 86400000);
        return name;
      }
    } catch {
      // If profile fetch fails, just use symbol
    }

    return symbol;
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
      `${this.baseUrl}/quote?symbol=${upperSymbol}&token=${this.apiKey}`,
      {
        headers: { Accept: 'application/json' },
      },
    );

    if (!response.ok) {
      throw new HttpException(
        `Failed to fetch quote for ${upperSymbol}`,
        response.status,
      );
    }

    const data = (await response.json()) as FinnhubQuoteResponse;

    // Finnhub returns all zeros for invalid symbols
    if (data.c === 0 && data.o === 0 && data.h === 0 && data.l === 0) {
      throw new HttpException(`Quote not found for ${upperSymbol}`, 404);
    }

    // Get company name for description
    const description = await this.getCompanyName(upperSymbol);

    // Map Finnhub response to our Quote interface
    // Note: Finnhub doesn't provide bid/ask in basic quote, so we simulate a tight spread
    const currentPrice = data.c;
    const spreadPercent = 0.001; // 0.1% spread for simulation

    const quote: Quote = {
      symbol: upperSymbol,
      description,
      last: currentPrice,
      bid: currentPrice * (1 - spreadPercent),
      ask: currentPrice * (1 + spreadPercent),
      volume: 0, // Finnhub basic quote doesn't include volume
      change: data.d,
      change_percentage: data.dp,
      open: data.o,
      high: data.h,
      low: data.l,
      close: data.pc,
    };

    // Cache for 5 seconds
    await this.cacheManager.set(cacheKey, quote, 5000);

    return quote;
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    // Finnhub doesn't have a batch endpoint on free tier, so we need to fetch individually
    // Use Promise.all for parallel fetching
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          return await this.getQuote(symbol);
        } catch {
          // Return null for failed quotes and filter them out
          return null;
        }
      }),
    );

    return quotes.filter((q): q is Quote => q !== null);
  }
}
