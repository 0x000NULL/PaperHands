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
};
