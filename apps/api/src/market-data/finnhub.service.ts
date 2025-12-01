import { Injectable, HttpException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { CandleResponseDto, CandleDto } from './dto/candle-response.dto';
import { Period } from './dto/candle-query.dto';

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
  // 52-week data (not available from Finnhub basic quote)
  week_52_high: number | null;
  week_52_low: number | null;
  average_volume: number | null;
  // Computed percentages (distance from 52-week extremes)
  pct_from_52_high: number | null;
  pct_from_52_low: number | null;
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
  finnhubIndustry: string;
  country: string;
  exchange: string;
  marketCapitalization: number;
  logo: string;
  weburl: string;
}

interface FinnhubMetricsResponse {
  metric: {
    dividendYieldIndicatedAnnual?: number;
    dividendPerShareAnnual?: number;
    dividendPayoutRatioTTM?: number;
    '52WeekHigh'?: number;
    '52WeekLow'?: number;
    peBasicExclExtraTTM?: number;
    pegRatioTTM?: number;
    epsBasicExclExtraItemsTTM?: number;
    beta?: number;
    roeTTM?: number;
    roaTTM?: number;
    profitMarginTTM?: number;
    operatingMarginTTM?: number;
    currentRatioQuarterly?: number;
    debtEquityQuarterly?: number;
    revenueGrowthTTMYoy?: number;
    epsGrowthTTMYoy?: number;
    [key: string]: number | undefined;
  };
}

// Research API Response Types
interface FinnhubNewsItem {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface FinnhubEarningsCalendarResponse {
  earningsCalendar: Array<{
    date: string;
    epsActual: number | null;
    epsEstimate: number | null;
    hour: string;
    quarter: number;
    revenueActual: number | null;
    revenueEstimate: number | null;
    symbol: string;
    year: number;
  }>;
}

interface FinnhubEconomicCalendarResponse {
  economicCalendar: Array<{
    actual: number | null;
    country: string;
    estimate: number | null;
    event: string;
    impact: string;
    prev: number | null;
    time: string;
    unit: string;
  }>;
}

interface FinnhubRecommendationItem {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

interface FinnhubPriceTargetResponse {
  lastUpdated: string;
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
}

interface FinnhubFilingItem {
  acceptedDate: string;
  accessNumber: string;
  cik: string;
  filedDate: string;
  filingUrl: string;
  form: string;
  reportUrl: string;
  symbol: string;
}

interface FinnhubInsiderTransactionResponse {
  data: Array<{
    change: number;
    filingDate: string;
    name: string;
    share: number;
    symbol: string;
    transactionCode: string;
    transactionDate: string;
    transactionPrice: number;
  }>;
  symbol: string;
}

export interface CompanyProfile {
  sector: string;
  name: string;
  country: string;
  exchange: string;
  marketCap: number;
  logo: string;
  weburl: string;
}

export interface StockMetrics {
  dividendYield: number | null;
  dividendPerShare: number | null;
  dividendPayoutRatio: number | null;
}

// Research Data Types (exported for use by research module)
export interface NewsItem {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string | null;
  category: string;
  datetime: number;
  related: string[];
}

export interface EarningsRelease {
  symbol: string;
  date: string;
  hour: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  quarter: number;
  year: number;
}

export interface EconomicEvent {
  country: string;
  event: string;
  time: string;
  impact: string;
  actual: number | null;
  estimate: number | null;
  previous: number | null;
  unit: string;
}

export interface AnalystRecommendation {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface PriceTarget {
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
  lastUpdated: string;
}

export interface SecFiling {
  accessNumber: string;
  symbol: string;
  cik: string;
  form: string;
  filedDate: string;
  acceptedDate: string;
  reportUrl: string;
  filingUrl: string;
}

export interface InsiderTransaction {
  symbol: string;
  name: string;
  share: number;
  change: number;
  filingDate: string;
  transactionDate: string;
  transactionPrice: number | null;
  transactionCode: string;
}

export interface CompanyFundamentals {
  symbol: string;
  name: string;
  industry: string;
  country: string;
  exchange: string;
  marketCap: number;
  logo: string;
  weburl: string;
  peRatio: number | null;
  pegRatio: number | null;
  eps: number | null;
  beta: number | null;
  dividendYield: number | null;
  profitMargin: number | null;
  operatingMargin: number | null;
  returnOnEquity: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  week52High: number | null;
  week52Low: number | null;
}

interface FinnhubCandleResponse {
  c: number[]; // Close prices
  h: number[]; // High prices
  l: number[]; // Low prices
  o: number[]; // Open prices
  t: number[]; // Timestamps (Unix seconds)
  v: number[]; // Volumes
  s: string; // Status: 'ok' or 'no_data'
}

interface PeriodConfig {
  resolution: string; // Finnhub resolution
  lookbackDays: number; // How far back to fetch
  cacheTtlMs: number; // Cache duration in milliseconds
}

const PERIOD_CONFIG: Record<string, PeriodConfig> = {
  '1D': { resolution: '5', lookbackDays: 1, cacheTtlMs: 60_000 },
  '1W': { resolution: '15', lookbackDays: 7, cacheTtlMs: 300_000 },
  '1M': { resolution: '60', lookbackDays: 30, cacheTtlMs: 900_000 },
  '3M': { resolution: 'D', lookbackDays: 90, cacheTtlMs: 3_600_000 },
  '1Y': { resolution: 'D', lookbackDays: 365, cacheTtlMs: 3_600_000 },
  '5Y': { resolution: 'W', lookbackDays: 1825, cacheTtlMs: 3_600_000 },
};

export interface ApiUsageStats {
  totalCalls: number;
  callsToday: number;
  callsByEndpoint: Record<string, number>;
  lastResetDate: string;
  dailyQuota: number;
  quotaUsedPercent: number;
}

@Injectable()
export class FinnhubService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly requestTimeout = 10000; // 10 seconds
  private readonly maxRetries = 3;
  private readonly dailyQuota: number;

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
      'FINNHUB_BASE_URL',
      'https://finnhub.io/api/v1',
    );
    this.apiKey = this.configService.get<string>('FINNHUB_API_KEY', '');
    this.dailyQuota = this.configService.get<number>(
      'FINNHUB_DAILY_QUOTA',
      500,
    );
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
      dailyQuota: this.dailyQuota,
      quotaUsedPercent:
        this.dailyQuota > 0
          ? Math.min(100, (this.apiCallsToday / this.dailyQuota) * 100)
          : 0,
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
    // Extract endpoint for tracking (e.g., "/quote" from full URL)
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
      // 52-week data not available from Finnhub basic quote
      week_52_high: null,
      week_52_low: null,
      average_volume: null,
      pct_from_52_high: null,
      pct_from_52_low: null,
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

    // Calculate from/to timestamps
    const now = Math.floor(Date.now() / 1000);
    const from = now - config.lookbackDays * 24 * 60 * 60;

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/stock/candle?symbol=${upperSymbol}&resolution=${config.resolution}&from=${from}&to=${now}&token=${this.apiKey}`,
      {
        headers: { Accept: 'application/json' },
      },
    );

    if (!response.ok) {
      throw new HttpException(
        `Failed to fetch candles for ${upperSymbol}`,
        response.status,
      );
    }

    const data = (await response.json()) as FinnhubCandleResponse;

    // Finnhub returns { s: 'no_data' } for invalid symbols or no data
    if (data.s === 'no_data' || !data.t || data.t.length === 0) {
      throw new HttpException(`No candle data found for ${upperSymbol}`, 404);
    }

    // Transform parallel arrays to array of candle objects
    const candles: CandleDto[] = data.t.map((timestamp, i) => ({
      timestamp,
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
    }));

    const result: CandleResponseDto = {
      symbol: upperSymbol,
      period,
      resolution: config.resolution,
      candles,
    };

    // Cache with appropriate TTL
    await this.cacheManager.set(cacheKey, result, config.cacheTtlMs);

    return result;
  }

  /**
   * Get full company profile including sector/industry
   * Cache: 24 hours (sector rarely changes)
   */
  async getCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `company:profile:${upperSymbol}`;

    // Check cache first (24-hour TTL)
    const cached = await this.cacheManager.get<CompanyProfile>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/stock/profile2?symbol=${upperSymbol}&token=${this.apiKey}`,
        {
          headers: { Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as FinnhubProfileResponse;

      // Empty response means symbol not found
      if (!data.name && !data.finnhubIndustry) {
        return null;
      }

      const profile: CompanyProfile = {
        sector: data.finnhubIndustry || 'Unknown',
        name: data.name || upperSymbol,
        country: data.country || '',
        exchange: data.exchange || '',
        marketCap: data.marketCapitalization || 0,
        logo: data.logo || '',
        weburl: data.weburl || '',
      };

      // Cache for 24 hours
      await this.cacheManager.set(cacheKey, profile, 86_400_000);

      return profile;
    } catch {
      return null;
    }
  }

  /**
   * Batch fetch company profiles for multiple symbols
   */
  async getCompanyProfiles(
    symbols: string[],
  ): Promise<Map<string, CompanyProfile>> {
    const results = new Map<string, CompanyProfile>();

    // Fetch in parallel
    const profiles = await Promise.all(
      symbols.map(async (symbol) => {
        const profile = await this.getCompanyProfile(symbol);
        return { symbol: symbol.toUpperCase(), profile };
      }),
    );

    for (const { symbol, profile } of profiles) {
      if (profile) {
        results.set(symbol, profile);
      }
    }

    return results;
  }

  /**
   * Get stock metrics including dividend yield
   * Cache: 1 hour (dividend data updates quarterly)
   */
  async getStockMetrics(symbol: string): Promise<StockMetrics> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `metrics:${upperSymbol}`;

    // Check cache first (1-hour TTL)
    const cached = await this.cacheManager.get<StockMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/stock/metric?symbol=${upperSymbol}&metric=all&token=${this.apiKey}`,
        {
          headers: { Accept: 'application/json' },
        },
      );

      if (!response.ok) {
        const emptyMetrics: StockMetrics = {
          dividendYield: null,
          dividendPerShare: null,
          dividendPayoutRatio: null,
        };
        return emptyMetrics;
      }

      const data = (await response.json()) as FinnhubMetricsResponse;

      const metrics: StockMetrics = {
        dividendYield: data.metric?.dividendYieldIndicatedAnnual ?? null,
        dividendPerShare: data.metric?.dividendPerShareAnnual ?? null,
        dividendPayoutRatio: data.metric?.dividendPayoutRatioTTM ?? null,
      };

      // Cache for 1 hour
      await this.cacheManager.set(cacheKey, metrics, 3_600_000);

      return metrics;
    } catch {
      return {
        dividendYield: null,
        dividendPerShare: null,
        dividendPayoutRatio: null,
      };
    }
  }

  /**
   * Batch fetch stock metrics for multiple symbols
   */
  async getStockMetricsBatch(
    symbols: string[],
  ): Promise<Map<string, StockMetrics>> {
    const results = new Map<string, StockMetrics>();

    // Fetch in parallel
    const metricsResults = await Promise.all(
      symbols.map(async (symbol) => {
        const metrics = await this.getStockMetrics(symbol);
        return { symbol: symbol.toUpperCase(), metrics };
      }),
    );

    for (const { symbol, metrics } of metricsResults) {
      results.set(symbol, metrics);
    }

    return results;
  }

  // ==================== RESEARCH API METHODS ====================

  /**
   * Get market news
   * Cache: 5 minutes
   */
  async getMarketNews(
    category: string = 'general',
    minId?: number,
  ): Promise<NewsItem[]> {
    const cacheKey = `market-news:${category}:${minId || 0}`;

    const cached = await this.cacheManager.get<NewsItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams({
      category,
      token: this.apiKey,
    });
    if (minId) {
      params.set('minId', minId.toString());
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/news?${params.toString()}`,
      { headers: { Accept: 'application/json' } },
    );

    if (!response.ok) {
      throw new HttpException('Failed to fetch market news', response.status);
    }

    const data = (await response.json()) as FinnhubNewsItem[];

    const news: NewsItem[] = data.map((item) => ({
      id: item.id,
      headline: item.headline,
      summary: item.summary,
      source: item.source,
      url: item.url,
      image: item.image || null,
      category: item.category,
      datetime: item.datetime,
      related: item.related ? item.related.split(',').map((s) => s.trim()) : [],
    }));

    await this.cacheManager.set(cacheKey, news, 300_000); // 5 minutes
    return news;
  }

  /**
   * Get company-specific news
   * Cache: 5 minutes
   */
  async getCompanyNews(
    symbol: string,
    from?: string,
    to?: string,
  ): Promise<NewsItem[]> {
    const upperSymbol = symbol.toUpperCase();
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const fromDate = from || weekAgo;
    const toDate = to || today;
    const cacheKey = `company-news:${upperSymbol}:${fromDate}:${toDate}`;

    const cached = await this.cacheManager.get<NewsItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams({
      symbol: upperSymbol,
      from: fromDate,
      to: toDate,
      token: this.apiKey,
    });

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/company-news?${params.toString()}`,
      { headers: { Accept: 'application/json' } },
    );

    if (!response.ok) {
      throw new HttpException(
        `Failed to fetch news for ${upperSymbol}`,
        response.status,
      );
    }

    const data = (await response.json()) as FinnhubNewsItem[];

    const news: NewsItem[] = data.map((item) => ({
      id: item.id,
      headline: item.headline,
      summary: item.summary,
      source: item.source,
      url: item.url,
      image: item.image || null,
      category: item.category,
      datetime: item.datetime,
      related: item.related ? item.related.split(',').map((s) => s.trim()) : [],
    }));

    await this.cacheManager.set(cacheKey, news, 300_000); // 5 minutes
    return news;
  }

  /**
   * Get earnings calendar
   * Cache: 1 hour
   */
  async getEarningsCalendar(
    from?: string,
    to?: string,
    symbol?: string,
  ): Promise<EarningsRelease[]> {
    const today = new Date().toISOString().split('T')[0];
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const fromDate = from || today;
    const toDate = to || weekLater;
    const cacheKey = `earnings-calendar:${fromDate}:${toDate}:${symbol || 'all'}`;

    const cached = await this.cacheManager.get<EarningsRelease[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams({
      from: fromDate,
      to: toDate,
      token: this.apiKey,
    });
    if (symbol) {
      params.set('symbol', symbol.toUpperCase());
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendar/earnings?${params.toString()}`,
      { headers: { Accept: 'application/json' } },
    );

    if (!response.ok) {
      throw new HttpException(
        'Failed to fetch earnings calendar',
        response.status,
      );
    }

    const data = (await response.json()) as FinnhubEarningsCalendarResponse;

    const earnings: EarningsRelease[] = (data.earningsCalendar || []).map(
      (item) => ({
        symbol: item.symbol,
        date: item.date,
        hour: item.hour,
        epsActual: item.epsActual,
        epsEstimate: item.epsEstimate,
        revenueActual: item.revenueActual,
        revenueEstimate: item.revenueEstimate,
        quarter: item.quarter,
        year: item.year,
      }),
    );

    await this.cacheManager.set(cacheKey, earnings, 3_600_000); // 1 hour
    return earnings;
  }

  /**
   * Get economic calendar
   * Cache: 1 hour
   */
  async getEconomicCalendar(
    from?: string,
    to?: string,
  ): Promise<EconomicEvent[]> {
    const today = new Date().toISOString().split('T')[0];
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const fromDate = from || today;
    const toDate = to || weekLater;
    const cacheKey = `economic-calendar:${fromDate}:${toDate}`;

    const cached = await this.cacheManager.get<EconomicEvent[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams({
      from: fromDate,
      to: toDate,
      token: this.apiKey,
    });

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/calendar/economic?${params.toString()}`,
      { headers: { Accept: 'application/json' } },
    );

    if (!response.ok) {
      throw new HttpException(
        'Failed to fetch economic calendar',
        response.status,
      );
    }

    const data = (await response.json()) as FinnhubEconomicCalendarResponse;

    const events: EconomicEvent[] = (data.economicCalendar || []).map(
      (item) => ({
        country: item.country,
        event: item.event,
        time: item.time,
        impact: item.impact,
        actual: item.actual,
        estimate: item.estimate,
        previous: item.prev,
        unit: item.unit,
      }),
    );

    await this.cacheManager.set(cacheKey, events, 3_600_000); // 1 hour
    return events;
  }

  /**
   * Get analyst recommendation trends
   * Cache: 1 hour
   */
  async getRecommendationTrends(
    symbol: string,
  ): Promise<AnalystRecommendation[]> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `recommendations:${upperSymbol}`;

    const cached =
      await this.cacheManager.get<AnalystRecommendation[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/stock/recommendation?symbol=${upperSymbol}&token=${this.apiKey}`,
      { headers: { Accept: 'application/json' } },
    );

    if (!response.ok) {
      throw new HttpException(
        `Failed to fetch recommendations for ${upperSymbol}`,
        response.status,
      );
    }

    const data = (await response.json()) as FinnhubRecommendationItem[];

    const recommendations: AnalystRecommendation[] = data.map((item) => ({
      period: item.period,
      strongBuy: item.strongBuy,
      buy: item.buy,
      hold: item.hold,
      sell: item.sell,
      strongSell: item.strongSell,
    }));

    await this.cacheManager.set(cacheKey, recommendations, 3_600_000); // 1 hour
    return recommendations;
  }

  /**
   * Get price target consensus
   * Cache: 1 hour
   */
  async getPriceTarget(symbol: string): Promise<PriceTarget | null> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `price-target:${upperSymbol}`;

    const cached = await this.cacheManager.get<PriceTarget | null>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/stock/price-target?symbol=${upperSymbol}&token=${this.apiKey}`,
        { headers: { Accept: 'application/json' } },
      );

      if (!response.ok) {
        await this.cacheManager.set(cacheKey, null, 3_600_000);
        return null;
      }

      const data = (await response.json()) as FinnhubPriceTargetResponse;

      if (!data.symbol) {
        await this.cacheManager.set(cacheKey, null, 3_600_000);
        return null;
      }

      const priceTarget: PriceTarget = {
        symbol: data.symbol,
        targetHigh: data.targetHigh,
        targetLow: data.targetLow,
        targetMean: data.targetMean,
        targetMedian: data.targetMedian,
        lastUpdated: data.lastUpdated,
      };

      await this.cacheManager.set(cacheKey, priceTarget, 3_600_000); // 1 hour
      return priceTarget;
    } catch {
      await this.cacheManager.set(cacheKey, null, 3_600_000);
      return null;
    }
  }

  /**
   * Get SEC filings
   * Cache: 1 hour
   */
  async getSecFilings(
    symbol: string,
    from?: string,
    to?: string,
  ): Promise<SecFiling[]> {
    const upperSymbol = symbol.toUpperCase();
    const today = new Date().toISOString().split('T')[0];
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const fromDate = from || yearAgo;
    const toDate = to || today;
    const cacheKey = `filings:${upperSymbol}:${fromDate}:${toDate}`;

    const cached = await this.cacheManager.get<SecFiling[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams({
      symbol: upperSymbol,
      from: fromDate,
      to: toDate,
      token: this.apiKey,
    });

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/stock/filings?${params.toString()}`,
      { headers: { Accept: 'application/json' } },
    );

    if (!response.ok) {
      throw new HttpException(
        `Failed to fetch filings for ${upperSymbol}`,
        response.status,
      );
    }

    const data = (await response.json()) as FinnhubFilingItem[];

    const filings: SecFiling[] = data.map((item) => ({
      accessNumber: item.accessNumber,
      symbol: item.symbol,
      cik: item.cik,
      form: item.form,
      filedDate: item.filedDate,
      acceptedDate: item.acceptedDate,
      reportUrl: item.reportUrl,
      filingUrl: item.filingUrl,
    }));

    await this.cacheManager.set(cacheKey, filings, 3_600_000); // 1 hour
    return filings;
  }

  /**
   * Get insider transactions
   * Cache: 1 hour
   */
  async getInsiderTransactions(symbol: string): Promise<InsiderTransaction[]> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `insider:${upperSymbol}`;

    const cached = await this.cacheManager.get<InsiderTransaction[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.fetchWithRetry(
      `${this.baseUrl}/stock/insider-transactions?symbol=${upperSymbol}&token=${this.apiKey}`,
      { headers: { Accept: 'application/json' } },
    );

    if (!response.ok) {
      throw new HttpException(
        `Failed to fetch insider transactions for ${upperSymbol}`,
        response.status,
      );
    }

    const data = (await response.json()) as FinnhubInsiderTransactionResponse;

    const transactions: InsiderTransaction[] = (data.data || []).map(
      (item) => ({
        symbol: item.symbol,
        name: item.name,
        share: item.share,
        change: item.change,
        filingDate: item.filingDate,
        transactionDate: item.transactionDate,
        transactionPrice: item.transactionPrice || null,
        transactionCode: item.transactionCode,
      }),
    );

    await this.cacheManager.set(cacheKey, transactions, 3_600_000); // 1 hour
    return transactions;
  }

  /**
   * Get comprehensive company fundamentals
   * Combines profile and metrics data
   * Cache: 1 hour
   */
  async getBasicFinancials(
    symbol: string,
  ): Promise<CompanyFundamentals | null> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = `fundamentals:${upperSymbol}`;

    const cached = await this.cacheManager.get<CompanyFundamentals | null>(
      cacheKey,
    );
    if (cached !== undefined) {
      return cached;
    }

    try {
      // Fetch profile and metrics in parallel
      const [profileResponse, metricsResponse] = await Promise.all([
        this.fetchWithRetry(
          `${this.baseUrl}/stock/profile2?symbol=${upperSymbol}&token=${this.apiKey}`,
          { headers: { Accept: 'application/json' } },
        ),
        this.fetchWithRetry(
          `${this.baseUrl}/stock/metric?symbol=${upperSymbol}&metric=all&token=${this.apiKey}`,
          { headers: { Accept: 'application/json' } },
        ),
      ]);

      if (!profileResponse.ok) {
        await this.cacheManager.set(cacheKey, null, 3_600_000);
        return null;
      }

      const profile = (await profileResponse.json()) as FinnhubProfileResponse;
      const metricsData = metricsResponse.ok
        ? ((await metricsResponse.json()) as FinnhubMetricsResponse)
        : { metric: {} };

      if (!profile.name) {
        await this.cacheManager.set(cacheKey, null, 3_600_000);
        return null;
      }

      const m = metricsData.metric || {};

      const fundamentals: CompanyFundamentals = {
        symbol: upperSymbol,
        name: profile.name,
        industry: profile.finnhubIndustry || '',
        country: profile.country || '',
        exchange: profile.exchange || '',
        marketCap: profile.marketCapitalization || 0,
        logo: profile.logo || '',
        weburl: profile.weburl || '',
        peRatio: m.peBasicExclExtraTTM ?? null,
        pegRatio: m.pegRatioTTM ?? null,
        eps: m.epsBasicExclExtraItemsTTM ?? null,
        beta: m.beta ?? null,
        dividendYield: m.dividendYieldIndicatedAnnual ?? null,
        profitMargin: m.profitMarginTTM ?? null,
        operatingMargin: m.operatingMarginTTM ?? null,
        returnOnEquity: m.roeTTM ?? null,
        revenueGrowth: m.revenueGrowthTTMYoy ?? null,
        earningsGrowth: m.epsGrowthTTMYoy ?? null,
        currentRatio: m.currentRatioQuarterly ?? null,
        debtToEquity: m.debtEquityQuarterly ?? null,
        week52High: m['52WeekHigh'] ?? null,
        week52Low: m['52WeekLow'] ?? null,
      };

      await this.cacheManager.set(cacheKey, fundamentals, 3_600_000); // 1 hour
      return fundamentals;
    } catch {
      await this.cacheManager.set(cacheKey, null, 3_600_000);
      return null;
    }
  }
}
