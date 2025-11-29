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
export type OrderStatus = 'pending' | 'queued' | 'filled' | 'cancelled' | 'rejected';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok';

// Market Status
export type TradingSession = 'pre_market' | 'regular' | 'after_hours' | 'closed';

export interface MarketStatus {
  session: TradingSession;
  isOpen: boolean;
  nextOpen: string | null;
  nextClose: string | null;
}

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  filledPrice: number | null;
  status: OrderStatus;
  orderType?: OrderType;
  limitPrice?: number | null;
  stopPrice?: number | null;
  totalValue?: number;
  createdAt: string;
}

export interface CreateOrderRequest {
  symbol: string;
  side: OrderSide;
  quantity: number;
  orderType?: OrderType;
  timeInForce?: TimeInForce;
  limitPrice?: number;
  stopPrice?: number;
  trailAmount?: number;
  trailPercent?: number;
}

// Chart types
export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleResponse {
  symbol: string;
  period: Timeframe;
  resolution: string;
  candles: Candle[];
}

// Watchlist types
export interface WatchlistItem {
  id: string;
  symbol: string;
  sortOrder: number;
  addedAt: string;
}

export interface WatchlistSummary {
  id: string;
  name: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistDetail {
  id: string;
  name: string;
  items: WatchlistItem[];
  createdAt: string;
  updatedAt: string;
}

// Options types
export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  iv: number; // implied volatility
}

export interface OptionContract {
  symbol: string; // OCC symbol (e.g., "AAPL240119C00190000")
  strike: number;
  optionType: 'call' | 'put';
  expiration: string;
  bid: number;
  ask: number;
  last: number | null;
  volume: number;
  openInterest: number;
  greeks?: OptionGreeks;
  inTheMoney: boolean;
}

export interface OptionsChainResponse {
  symbol: string;
  expiration: string;
  underlyingPrice: number;
  calls: OptionContract[];
  puts: OptionContract[];
}
