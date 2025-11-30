import { Injectable, HttpException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { CandleResponseDto, CandleDto } from './dto/candle-response.dto';
import { Period } from './dto/candle-query.dto';
import {
  TradierExpirationsResponse,
  TradierOptionsChainResponse,
  OptionsChainResponse,
  OptionContract,
} from './dto/options.dto';

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
  // 52-week data
  week_52_high: number | null;
  week_52_low: number | null;
  average_volume: number | null;
  // Computed percentages (distance from 52-week extremes)
  pct_from_52_high: number | null;
  pct_from_52_low: number | null;
}

// Raw Tradier API response type
interface TradierRawQuote {
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
  week_52_high?: number;
  week_52_low?: number;
  average_volume?: number;
}

// Tradier API response types
interface TradierQuotesResponse {
  quotes: {
    quote: TradierRawQuote | TradierRawQuote[];
  } | null;
}

interface TradierHistoryDay {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradierHistoryResponse {
  history: {
    day: TradierHistoryDay | TradierHistoryDay[] | null;
  } | null;
}

interface TradierTimeSaleData {
  time: string;
  timestamp: number;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradierTimeSalesResponse {
  series: {
    data: TradierTimeSaleData | TradierTimeSaleData[] | null;
  } | null;
}

interface PeriodConfig {
  interval: string; // Tradier interval
  lookbackDays: number;
  cacheTtlMs: number;
  useTimesales: boolean; // true for intraday, false for daily/weekly/monthly
}

const PERIOD_CONFIG: Record<string, PeriodConfig> = {
  '1D': {
    interval: '5min',
    lookbackDays: 1,
    cacheTtlMs: 60_000,
    useTimesales: true,
  },
  '1W': {
    interval: '15min',
    lookbackDays: 7,
    cacheTtlMs: 300_000,
    useTimesales: true,
  },
  '1M': {
    interval: 'daily',
    lookbackDays: 30,
    cacheTtlMs: 900_000,
    useTimesales: false,
  },
  '3M': {
    interval: 'daily',
    lookbackDays: 90,
    cacheTtlMs: 3_600_000,
    useTimesales: false,
  },
  '1Y': {
    interval: 'daily',
    lookbackDays: 365,
    cacheTtlMs: 3_600_000,
    useTimesales: false,
  },
  '5Y': {
    interval: 'weekly',
    lookbackDays: 1825,
    cacheTtlMs: 3_600_000,
    useTimesales: false,
  },
};

export interface ApiUsageStats {
  totalCalls: number;
  callsToday: number;
  callsByEndpoint: Record<string, number>;
  lastResetDate: string;
  apiType: 'production' | 'sandbox';
}

@Injectable()
export class TradierService {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly requestTimeout = 10000; // 10 seconds
  private readonly maxRetries = 3;

  // API call tracking
  private apiCallCount = 0;
  private apiCallsToday = 0;
  private callsByEndpoint: Record<string, number> = {};
  private lastResetDate: string;

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.baseUrl = this.configService.get<string>(
      'TRADIER_BASE_URL',
      'https://api.tradier.com/v1',
    );
    this.apiToken = this.configService.get<string>('TRADIER_API_TOKEN', '');
    this.lastResetDate = new Date().toISOString().split('T')[0];
  }

  /**
   * Track an API call for quota monitoring
   */
  private trackApiCall(endpoint: string): void {
    const today = new Date().toISOString().split('T')[0];

    // Reset daily counter if new day
    if (today !== this.lastResetDate) {
      this.apiCallsToday = 0;
      this.lastResetDate = today;
    }

    this.apiCallCount++;
    this.apiCallsToday++;
    this.callsByEndpoint[endpoint] = (this.callsByEndpoint[endpoint] || 0) + 1;
  }

  /**
   * Get API usage statistics
   */
  getApiUsageStats(): ApiUsageStats {
    const today = new Date().toISOString().split('T')[0];

    // Reset daily counter if new day
    if (today !== this.lastResetDate) {
      this.apiCallsToday = 0;
      this.lastResetDate = today;
    }

    return {
      totalCalls: this.apiCallCount,
      callsToday: this.apiCallsToday,
      callsByEndpoint: { ...this.callsByEndpoint },
      lastResetDate: this.lastResetDate,
      apiType: this.baseUrl.includes('sandbox') ? 'sandbox' : 'production',
    };
  }

  /**
   * Maps raw Tradier quote response to our Quote interface with computed fields
   */
  private mapRawQuoteToQuote(raw: TradierRawQuote): Quote {
    const week52High = raw.week_52_high ?? null;
    const week52Low = raw.week_52_low ?? null;
    const last = raw.last;

    return {
      symbol: raw.symbol,
      description: raw.description,
      last: raw.last,
      bid: raw.bid,
      ask: raw.ask,
      volume: raw.volume,
      change: raw.change,
      change_percentage: raw.change_percentage,
      open: raw.open,
      high: raw.high,
      low: raw.low,
      close: raw.close,
      week_52_high: week52High,
      week_52_low: week52Low,
      average_volume: raw.average_volume ?? null,
      // Compute percentage distance from 52-week extremes
      pct_from_52_high:
        week52High !== null && week52High > 0
          ? ((last - week52High) / week52High) * 100
          : null,
      pct_from_52_low:
        week52Low !== null && week52Low > 0
          ? ((last - week52Low) / week52Low) * 100
          : null,
    };
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
    // Extract endpoint for tracking (e.g., "/markets/quotes" from full URL)
    const endpoint = url.replace(this.baseUrl, '').split('?')[0];
    this.trackApiCall(endpoint);

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
    const rawQuote = Array.isArray(data.quotes.quote)
      ? data.quotes.quote[0]
      : data.quotes.quote;

    // Map raw quote to our Quote interface with computed fields
    const quote = this.mapRawQuoteToQuote(rawQuote);

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
    const rawQuotes = Array.isArray(data.quotes.quote)
      ? data.quotes.quote
      : [data.quotes.quote];

    // Map all raw quotes to our Quote interface with computed fields
    return rawQuotes.map((raw) => this.mapRawQuoteToQuote(raw));
  }

  async getCandles(symbol: string, period: Period): Promise<CandleResponseDto> {
    const upperSymbol = symbol.toUpperCase();
    const config = PERIOD_CONFIG[period];

    if (!config) {
      throw new HttpException(
        `Invalid period: ${period}. Must be one of: 1D, 1W, 1M, 3M, 1Y, 5Y`,
        400,
      );
    }

    const cacheKey = `candles:${upperSymbol}:${period}`;

    // Check cache first
    const cached = await this.cacheManager.get<CandleResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - config.lookbackDays);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    let candles: CandleDto[];

    if (config.useTimesales) {
      // Use timesales endpoint for intraday data
      candles = await this.fetchTimeSales(
        upperSymbol,
        config.interval,
        formatDate(startDate),
        formatDate(endDate),
      );
    } else {
      // Use history endpoint for daily/weekly/monthly
      candles = await this.fetchHistory(
        upperSymbol,
        config.interval,
        formatDate(startDate),
        formatDate(endDate),
      );
    }

    const result: CandleResponseDto = {
      symbol: upperSymbol,
      period,
      resolution: config.interval,
      candles,
    };

    // Cache with appropriate TTL
    await this.cacheManager.set(cacheKey, result, config.cacheTtlMs);

    return result;
  }

  private async fetchHistory(
    symbol: string,
    interval: string,
    start: string,
    end: string,
  ): Promise<CandleDto[]> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/markets/history?symbol=${symbol}&interval=${interval}&start=${start}&end=${end}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      // Map external API errors to avoid triggering frontend logout on 401
      const status =
        response.status === 401 || response.status === 403
          ? 503
          : response.status;
      throw new HttpException(
        `Market data service temporarily unavailable for ${symbol}`,
        status,
      );
    }

    const data = (await response.json()) as TradierHistoryResponse;

    if (!data.history || !data.history.day) {
      return [];
    }

    const days = Array.isArray(data.history.day)
      ? data.history.day
      : [data.history.day];

    return days.map((day) => ({
      timestamp: Math.floor(new Date(day.date).getTime() / 1000),
      open: day.open,
      high: day.high,
      low: day.low,
      close: day.close,
      volume: day.volume,
    }));
  }

  private async fetchTimeSales(
    symbol: string,
    interval: string,
    start: string,
    end: string,
  ): Promise<CandleDto[]> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/markets/timesales?symbol=${symbol}&interval=${interval}&start=${start}&end=${end}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      // Map external API errors to avoid triggering frontend logout on 401
      const status =
        response.status === 401 || response.status === 403
          ? 503
          : response.status;
      throw new HttpException(
        `Market data service temporarily unavailable for ${symbol}`,
        status,
      );
    }

    const data = (await response.json()) as TradierTimeSalesResponse;

    if (!data.series || !data.series.data) {
      return [];
    }

    const items = Array.isArray(data.series.data)
      ? data.series.data
      : [data.series.data];

    return items.map((item) => ({
      timestamp: item.timestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }));
  }

  async getOptionsExpirations(symbol: string): Promise<string[]> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `options:expirations:${upperSymbol}`;

    // Check cache first (1 hour TTL - expirations change weekly)
    const cached = await this.cacheManager.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/markets/options/expirations?symbol=${upperSymbol}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      // Map external API errors to avoid triggering frontend logout on 401
      const status =
        response.status === 401 || response.status === 403
          ? 503
          : response.status;
      throw new HttpException(
        `Options not available for ${upperSymbol}`,
        status,
      );
    }

    const data = (await response.json()) as TradierExpirationsResponse;

    if (!data.expirations || !data.expirations.date) {
      return [];
    }

    const expirations = Array.isArray(data.expirations.date)
      ? data.expirations.date
      : [data.expirations.date];

    // Cache for 1 hour
    await this.cacheManager.set(cacheKey, expirations, 3_600_000);

    return expirations;
  }

  async getOptionsChain(
    symbol: string,
    expiration: string,
    strikeRange = 15,
  ): Promise<OptionsChainResponse> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `options:chain:${upperSymbol}:${expiration}`;

    // Check cache first (30 seconds TTL)
    const cached = await this.cacheManager.get<OptionsChainResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // First get the underlying price for ATM filtering
    const quote = await this.getQuote(upperSymbol);
    const underlyingPrice = quote.last;

    // Fetch options chain with Greeks
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/markets/options/chains?symbol=${upperSymbol}&expiration=${expiration}&greeks=true`,
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      // Map external API errors to avoid triggering frontend logout on 401
      const status =
        response.status === 401 || response.status === 403
          ? 503
          : response.status;
      throw new HttpException(
        `Options chain not available for ${upperSymbol}`,
        status,
      );
    }

    const data = (await response.json()) as TradierOptionsChainResponse;

    if (!data.options || !data.options.option) {
      return {
        symbol: upperSymbol,
        expiration,
        underlyingPrice,
        calls: [],
        puts: [],
      };
    }

    const options = Array.isArray(data.options.option)
      ? data.options.option
      : [data.options.option];

    // Get all unique strikes and find ATM
    const allStrikes = [...new Set(options.map((o) => o.strike))].sort(
      (a, b) => a - b,
    );

    // Find the ATM strike (closest to underlying price)
    const atmStrike = allStrikes.reduce((prev, curr) =>
      Math.abs(curr - underlyingPrice) < Math.abs(prev - underlyingPrice)
        ? curr
        : prev,
    );

    const atmIndex = allStrikes.indexOf(atmStrike);
    const minIndex = Math.max(0, atmIndex - strikeRange);
    const maxIndex = Math.min(allStrikes.length - 1, atmIndex + strikeRange);
    const filteredStrikes = new Set(allStrikes.slice(minIndex, maxIndex + 1));

    // Transform and filter options
    const calls: OptionContract[] = [];
    const puts: OptionContract[] = [];

    for (const opt of options) {
      if (!filteredStrikes.has(opt.strike)) continue;

      const contract: OptionContract = {
        symbol: opt.symbol,
        strike: opt.strike,
        optionType: opt.option_type,
        expiration: opt.expiration_date,
        bid: opt.bid,
        ask: opt.ask,
        last: opt.last,
        volume: opt.volume,
        openInterest: opt.open_interest,
        inTheMoney:
          opt.option_type === 'call'
            ? underlyingPrice > opt.strike
            : underlyingPrice < opt.strike,
        greeks: opt.greeks
          ? {
              delta: opt.greeks.delta,
              gamma: opt.greeks.gamma,
              theta: opt.greeks.theta,
              vega: opt.greeks.vega,
              rho: opt.greeks.rho,
              iv: opt.greeks.mid_iv,
            }
          : undefined,
      };

      if (opt.option_type === 'call') {
        calls.push(contract);
      } else {
        puts.push(contract);
      }
    }

    // Sort by strike
    calls.sort((a, b) => a.strike - b.strike);
    puts.sort((a, b) => a.strike - b.strike);

    const result: OptionsChainResponse = {
      symbol: upperSymbol,
      expiration,
      underlyingPrice,
      calls,
      puts,
    };

    // Cache for 30 seconds
    await this.cacheManager.set(cacheKey, result, 30_000);

    return result;
  }

  /**
   * Get quote for a specific option contract
   * @param optionSymbol OCC option symbol (e.g., AAPL240119C00190000)
   */
  async getOptionQuote(optionSymbol: string): Promise<{
    symbol: string;
    bid: number;
    ask: number;
    last: number | null;
    volume: number;
    openInterest: number;
    greeks: {
      delta: number;
      gamma: number;
      theta: number;
      vega: number;
      rho: number;
      iv: number;
    } | null;
  } | null> {
    const cacheKey = `option:quote:${optionSymbol}`;

    // Check cache first (15 seconds TTL - shorter for trading)
    const cached = await this.cacheManager.get<{
      symbol: string;
      bid: number;
      ask: number;
      last: number | null;
      volume: number;
      openInterest: number;
      greeks: {
        delta: number;
        gamma: number;
        theta: number;
        vega: number;
        rho: number;
        iv: number;
      } | null;
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch option quote with Greeks
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/markets/quotes?symbols=${optionSymbol}&greeks=true`,
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      // Map external API errors to avoid triggering frontend logout on 401
      const status =
        response.status === 401 || response.status === 403
          ? 503
          : response.status;
      throw new HttpException(
        `Option quote not available for ${optionSymbol}`,
        status,
      );
    }

    const data = (await response.json()) as {
      quotes: {
        quote: {
          symbol: string;
          bid: number;
          ask: number;
          last: number | null;
          volume: number;
          open_interest: number;
          greeks?: {
            delta: number;
            gamma: number;
            theta: number;
            vega: number;
            rho: number;
            mid_iv: number;
          };
        } | null;
      } | null;
    };

    if (!data.quotes || !data.quotes.quote) {
      return null;
    }

    const opt = data.quotes.quote;
    const result = {
      symbol: opt.symbol,
      bid: opt.bid,
      ask: opt.ask,
      last: opt.last,
      volume: opt.volume,
      openInterest: opt.open_interest,
      greeks: opt.greeks
        ? {
            delta: opt.greeks.delta,
            gamma: opt.greeks.gamma,
            theta: opt.greeks.theta,
            vega: opt.greeks.vega,
            rho: opt.greeks.rho,
            iv: opt.greeks.mid_iv,
          }
        : null,
    };

    // Cache for 15 seconds
    await this.cacheManager.set(cacheKey, result, 15_000);

    return result;
  }

  /**
   * Get quotes for multiple option contracts at once
   * Batches into chunks of 100 symbols (Tradier limit)
   * @param optionSymbols Array of OCC option symbols
   */
  async getOptionQuotes(optionSymbols: string[]): Promise<
    Map<
      string,
      {
        symbol: string;
        bid: number;
        ask: number;
        last: number | null;
        volume: number;
        openInterest: number;
        greeks: {
          delta: number;
          gamma: number;
          theta: number;
          vega: number;
          rho: number;
          iv: number;
        } | null;
      }
    >
  > {
    const results = new Map<
      string,
      {
        symbol: string;
        bid: number;
        ask: number;
        last: number | null;
        volume: number;
        openInterest: number;
        greeks: {
          delta: number;
          gamma: number;
          theta: number;
          vega: number;
          rho: number;
          iv: number;
        } | null;
      }
    >();

    if (optionSymbols.length === 0) {
      return results;
    }

    // Check cache for each symbol first
    const uncachedSymbols: string[] = [];
    for (const symbol of optionSymbols) {
      const cacheKey = `option:quote:${symbol}`;
      const cached = await this.cacheManager.get<{
        symbol: string;
        bid: number;
        ask: number;
        last: number | null;
        volume: number;
        openInterest: number;
        greeks: {
          delta: number;
          gamma: number;
          theta: number;
          vega: number;
          rho: number;
          iv: number;
        } | null;
      }>(cacheKey);

      if (cached) {
        results.set(symbol, cached);
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    // Batch fetch uncached symbols (max 100 per request)
    const BATCH_SIZE = 100;
    for (let i = 0; i < uncachedSymbols.length; i += BATCH_SIZE) {
      const batch = uncachedSymbols.slice(i, i + BATCH_SIZE);
      const symbolsParam = batch.join(',');

      try {
        const response = await this.fetchWithRetry(
          `${this.baseUrl}/markets/quotes?symbols=${symbolsParam}&greeks=true`,
          {
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
              Accept: 'application/json',
            },
          },
        );

        if (!response.ok) {
          continue; // Skip failed batches, continue with others
        }

        const data = (await response.json()) as {
          quotes: {
            quote:
              | {
                  symbol: string;
                  bid: number;
                  ask: number;
                  last: number | null;
                  volume: number;
                  open_interest: number;
                  greeks?: {
                    delta: number;
                    gamma: number;
                    theta: number;
                    vega: number;
                    rho: number;
                    mid_iv: number;
                  };
                }
              | Array<{
                  symbol: string;
                  bid: number;
                  ask: number;
                  last: number | null;
                  volume: number;
                  open_interest: number;
                  greeks?: {
                    delta: number;
                    gamma: number;
                    theta: number;
                    vega: number;
                    rho: number;
                    mid_iv: number;
                  };
                }>
              | null;
          } | null;
        };

        if (!data.quotes || !data.quotes.quote) {
          continue;
        }

        const quotes = Array.isArray(data.quotes.quote)
          ? data.quotes.quote
          : [data.quotes.quote];

        for (const opt of quotes) {
          const result = {
            symbol: opt.symbol,
            bid: opt.bid,
            ask: opt.ask,
            last: opt.last,
            volume: opt.volume,
            openInterest: opt.open_interest,
            greeks: opt.greeks
              ? {
                  delta: opt.greeks.delta,
                  gamma: opt.greeks.gamma,
                  theta: opt.greeks.theta,
                  vega: opt.greeks.vega,
                  rho: opt.greeks.rho,
                  iv: opt.greeks.mid_iv,
                }
              : null,
          };

          results.set(opt.symbol, result);

          // Cache each result individually
          const cacheKey = `option:quote:${opt.symbol}`;
          await this.cacheManager.set(cacheKey, result, 15_000);
        }
      } catch {
        // Log but continue with other batches
        continue;
      }
    }

    return results;
  }
}
