import { useAuthStore } from '../store/authStore';
import type {
  AuthResponse,
  Quote,
  Portfolio,
  Order,
  CreateOrderRequest,
  User,
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

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().token;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
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

    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.message || `Request failed with status ${response.status}`,
    );
  }

  return response.json();
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

  // Portfolio
  getPortfolio: () => request<Portfolio>('/portfolio'),

  // Orders
  placeOrder: (order: CreateOrderRequest) =>
    request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    }),

  getOrders: () => request<Order[]>('/orders'),
};
