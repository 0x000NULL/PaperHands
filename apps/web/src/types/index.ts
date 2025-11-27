export interface User {
  id: string;
  email: string;
  cashBalance: number;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

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

export interface Position {
  symbol: string;
  quantity: number;
  avgCostBasis: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface Portfolio {
  cashBalance: number;
  positions: Position[];
  totalValue: number;
}

export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'filled' | 'cancelled';

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  filledPrice: number | null;
  status: OrderStatus;
  totalValue?: number;
  createdAt: string;
}

export interface CreateOrderRequest {
  symbol: string;
  side: OrderSide;
  quantity: number;
}
