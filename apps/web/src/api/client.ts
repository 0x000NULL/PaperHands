import { useAuthStore } from '../store/authStore';
import type {
  AuthResponse,
  Quote,
  Portfolio,
  Order,
  CreateOrderRequest,
  User,
  CandleResponse,
  Timeframe,
  WatchlistSummary,
  WatchlistDetail,
  MarketStatus,
  OptionsChainResponse,
  OptionPosition,
  PortfolioGreeksSummary,
  UnderlyingGreeks,
  ExpirationBucket,
  ThetaProjection,
  DeltaExposure,
  SensitivityResult,
  ExpirationCalendarItem,
} from '../types';

// API base URL from build-time environment variable
// Normalize URL to remove any double slashes that may occur from env variable concatenation
const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const API_BASE = rawApiUrl.replace(/([^:]\/)\/+/g, '$1');

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const REQUEST_TIMEOUT = 15000; // 15 seconds

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().token;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        useAuthStore.getState().logout();
      }

      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new ApiError(
        response.status,
        errorData.message || `Request failed with status ${response.status}`,
      );
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // User
  getMe: () => request<User>('/users/me'),

  // Market Data
  getQuote: (symbol: string) => request<Quote>(`/market-data/quote/${symbol}`),

  getHistoricalData: (symbol: string, period: Timeframe) =>
    request<CandleResponse>(`/market-data/candles/${symbol}?period=${period}`),

  getMarketStatus: () => request<MarketStatus>('/market-data/market-status'),

  // Portfolio
  getPortfolio: () => request<Portfolio>('/portfolio'),
  getOptionPositions: () => request<OptionPosition[]>('/portfolio/options'),

  // Greeks
  getPortfolioGreeks: () =>
    request<PortfolioGreeksSummary>('/portfolio/greeks'),

  getGreeksByUnderlying: () =>
    request<UnderlyingGreeks[]>('/portfolio/greeks/by-underlying'),

  getGreeksByExpiration: () =>
    request<ExpirationBucket[]>('/portfolio/greeks/by-expiration'),

  getThetaDecayProjection: (days: number = 30) =>
    request<ThetaProjection[]>(`/portfolio/greeks/theta-projection?days=${days}`),

  getDeltaExposure: (symbol?: string) =>
    request<DeltaExposure[]>(
      `/portfolio/greeks/delta-exposure${symbol ? `?symbol=${symbol}` : ''}`,
    ),

  getGreeksSensitivity: (symbol: string) =>
    request<SensitivityResult>(`/portfolio/greeks/sensitivity/${symbol}`),

  getOptionExpirations: () =>
    request<ExpirationCalendarItem[]>('/portfolio/options/expirations'),

  // Orders
  placeOrder: (order: CreateOrderRequest) =>
    request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    }),

  getOrders: () => request<Order[]>('/orders'),

  // Watchlists
  getWatchlists: () => request<WatchlistSummary[]>('/watchlists'),

  getWatchlist: (id: string) => request<WatchlistDetail>(`/watchlists/${id}`),

  createWatchlist: (name: string) =>
    request<WatchlistDetail>('/watchlists', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  updateWatchlist: (id: string, name: string) =>
    request<WatchlistDetail>(`/watchlists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  deleteWatchlist: (id: string) =>
    request<void>(`/watchlists/${id}`, {
      method: 'DELETE',
    }),

  addSymbolToWatchlist: (watchlistId: string, symbol: string) =>
    request<WatchlistDetail>(`/watchlists/${watchlistId}/symbols`, {
      method: 'POST',
      body: JSON.stringify({ symbol: symbol.toUpperCase() }),
    }),

  removeSymbolFromWatchlist: (watchlistId: string, symbol: string) =>
    request<WatchlistDetail>(
      `/watchlists/${watchlistId}/symbols/${symbol.toUpperCase()}`,
      {
        method: 'DELETE',
      },
    ),

  reorderWatchlistItems: (watchlistId: string, itemIds: string[]) =>
    request<WatchlistDetail>(`/watchlists/${watchlistId}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ itemIds }),
    }),

  // Batch quotes for watchlist
  getQuotes: (symbols: string[]) =>
    request<Quote[]>(`/market-data/quotes?symbols=${symbols.join(',')}`),

  // Options
  getOptionsExpirations: (symbol: string) =>
    request<string[]>(`/market-data/options/expirations/${symbol}`),

  getOptionsChain: (symbol: string, expiration: string) =>
    request<OptionsChainResponse>(
      `/market-data/options/chain/${symbol}?expiration=${expiration}`,
    ),

  // Analytics
  getPerformanceHistory: (period: string = '1M') =>
    request<PerformanceDataPoint[]>(`/analytics/performance?period=${period}`),

  getTradeStatistics: () =>
    request<TradeStatistics>('/analytics/statistics'),

  getAllocation: () =>
    request<AllocationItem[]>('/analytics/allocation'),

  getGainsSummary: () =>
    request<GainsSummary>('/analytics/gains'),

  getRealizedGains: (year?: number) =>
    request<RealizedGainsSummary>(
      `/analytics/realized-gains${year ? `?year=${year}` : ''}`,
    ),

  getBenchmarkComparison: (symbol: string = 'SPY', period: string = '1M') =>
    request<BenchmarkComparison>(
      `/analytics/benchmark?symbol=${symbol}&period=${period}`,
    ),

  getTaxLots: (symbol?: string) =>
    request<TaxLot[]>(`/analytics/tax-lots${symbol ? `?symbol=${symbol}` : ''}`),

  getOpenTaxLots: (symbol?: string) =>
    request<OpenTaxLot[]>(
      `/analytics/tax-lots/open${symbol ? `?symbol=${symbol}` : ''}`,
    ),

  getLotSales: (options?: { symbol?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.symbol) params.set('symbol', options.symbol);
    if (options?.limit) params.set('limit', options.limit.toString());
    return request<LotSale[]>(`/analytics/lot-sales?${params.toString()}`);
  },

  getDividends: (options?: { symbol?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.symbol) params.set('symbol', options.symbol);
    if (options?.limit) params.set('limit', options.limit.toString());
    return request<Dividend[]>(`/analytics/dividends?${params.toString()}`);
  },

  getDividendSummary: () =>
    request<DividendSummary>('/analytics/dividends/summary'),

  getCostBasisSettings: () =>
    request<CostBasisSettings>('/analytics/settings/cost-basis'),

  // Option Closures
  getOptionClosures: (options?: {
    symbol?: string;
    closureType?: OptionClosureType;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.symbol) params.set('symbol', options.symbol);
    if (options?.closureType) params.set('closureType', options.closureType);
    if (options?.limit) params.set('limit', options.limit.toString());
    return request<OptionClosure[]>(
      `/analytics/option-closures?${params.toString()}`,
    );
  },

  getOptionRealizedGains: (year?: number) =>
    request<OptionRealizedGainsSummary>(
      `/analytics/option-realized-gains${year ? `?year=${year}` : ''}`,
    ),

  getCombinedRealizedGains: (year?: number) =>
    request<CombinedRealizedGainsSummary>(
      `/analytics/combined-realized-gains${year ? `?year=${year}` : ''}`,
    ),
};

// Analytics types
export interface PerformanceDataPoint {
  date: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface TradeStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  totalRealized: number;
  maxDrawdown: number;
  sharpeRatio: number | null;
}

export interface AllocationItem {
  symbol: string;
  quantity: number;
  marketValue: number;
  costBasis: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  allocation: number;
  sector?: string;
}

export interface GainsSummary {
  realizedGain: number;
  unrealizedGain: number;
  totalGain: number;
  shortTermRealized: number;
  longTermRealized: number;
}

export interface RealizedGainsSummary {
  shortTermGains: number;
  shortTermLosses: number;
  longTermGains: number;
  longTermLosses: number;
  totalShortTerm: number;
  totalLongTerm: number;
  totalRealized: number;
  transactionCount: number;
}

export interface BenchmarkComparison {
  portfolio: PerformanceDataPoint[];
  benchmark: PerformanceDataPoint[];
}

export interface TaxLot {
  id: string;
  symbol: string;
  originalQuantity: number;
  remainingQuantity: number;
  costBasisPerShare: number;
  totalCostBasis: number;
  acquiredAt: string;
  status: 'open' | 'closed';
  closedAt: string | null;
}

export interface OpenTaxLot {
  id: string;
  symbol: string;
  remainingQuantity: number;
  costBasisPerShare: number;
  totalCostBasis: number;
  acquiredAt: string;
  holdingDays: number;
  isLongTerm: boolean;
}

export interface LotSale {
  id: string;
  symbol: string;
  quantitySold: number;
  costBasisPerShare: number;
  salePrice: number;
  realizedGain: number;
  proceeds: number;
  costBasis: number;
  gainType: 'short_term' | 'long_term';
  holdingDays: number;
  soldAt: string;
}

export interface Dividend {
  id: string;
  symbol: string;
  exDate: string;
  payDate: string;
  amount: number;
  quantity: number;
  totalAmount: number;
  status: 'pending' | 'paid';
  reinvested: boolean;
}

export interface DividendSummary {
  totalPending: number;
  totalPaid: number;
  annualYield: number;
  upcomingDividends: Dividend[];
  recentDividends: Dividend[];
}

export interface CostBasisSettings {
  defaultMethod: 'fifo' | 'lifo' | 'hifo' | 'specific';
  symbolOverrides: Record<string, string>;
}

// Option Closure types
export type OptionClosureType =
  | 'sold_to_close'
  | 'expired_worthless'
  | 'exercised'
  | 'assigned';

export interface OptionClosure {
  id: string;
  optionSymbol: string;
  underlyingSymbol: string;
  optionType: 'call' | 'put';
  strikePrice: number;
  expirationDate: string;
  closureType: OptionClosureType;
  quantityClosed: number;
  openingPremium: number;
  closingPremium: number | null;
  realizedGain: number;
  proceeds: number;
  costBasis: number;
  gainType: 'short_term' | 'long_term';
  holdingDays: number;
  closedAt: string;
}

export interface OptionRealizedGainsSummary {
  shortTermGains: number;
  shortTermLosses: number;
  longTermGains: number;
  longTermLosses: number;
  totalShortTerm: number;
  totalLongTerm: number;
  totalRealized: number;
  transactionCount: number;
}

export interface CombinedRealizedGainsSummary {
  stocks: RealizedGainsSummary;
  options: OptionRealizedGainsSummary;
  combined: OptionRealizedGainsSummary;
}
