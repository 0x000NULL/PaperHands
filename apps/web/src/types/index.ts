export type UserRole = 'user' | 'admin' | 'super_admin';

export interface User {
  id: string;
  email: string;
  cashBalance: number;
  createdAt?: string;
  onboardingCompleted: boolean;
  onboardingStep: number;
  role: UserRole;
  disabled?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
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
  // 52-week data
  week_52_high: number | null;
  week_52_low: number | null;
  average_volume: number | null;
  // Computed percentages (distance from 52-week extremes)
  pct_from_52_high: number | null;
  pct_from_52_low: number | null;
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

export interface OptionPosition {
  id: string;
  optionSymbol: string;
  underlyingSymbol: string;
  optionType: 'call' | 'put';
  strikePrice: number;
  expirationDate: string;
  quantity: number; // Positive = long, negative = short
  avgCostBasis: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  greeksSnapshot: OptionGreeks | null;
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
export type OrderCategory = 'equity' | 'option';
export type OptionType = 'call' | 'put';

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
  // Option-specific fields
  orderCategory?: OrderCategory;
  optionSymbol?: string | null;
  underlyingSymbol?: string | null;
  optionType?: OptionType | null;
  strikePrice?: number | null;
  expirationDate?: string | null;
  contractMultiplier?: number;
  greeksAtFill?: OptionGreeks | null;
}

export interface CreateOrderRequest {
  symbol: string;
  side: OrderSide;
  quantity: number;
  orderType?: OrderType;
  timeInForce?: TimeInForce;
  extendedHours?: boolean;
  limitPrice?: number;
  stopPrice?: number;
  trailAmount?: number;
  trailPercent?: number;
  // Option-specific fields
  orderCategory?: OrderCategory;
  optionSymbol?: string;
  underlyingSymbol?: string;
  optionType?: OptionType;
  strikePrice?: number;
  expirationDate?: string;
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

// Greeks Dashboard types
export interface PortfolioGreeksSummary {
  netDelta: number;
  netGamma: number;
  netTheta: number;
  netVega: number;
  netRho: number;
  longDelta: number;
  shortDelta: number;
  totalDailyDecay: number;
  weeklyDecayProjection: number;
  totalPositions: number;
  positionsByExpiration: ExpirationBucket[];
  notionalExposure: number;
}

export interface ExpirationBucket {
  expirationDate: string;
  daysToExpiration: number;
  positionCount: number;
  netDelta: number;
  netTheta: number;
}

export interface UnderlyingGreeks {
  underlyingSymbol: string;
  underlyingPrice: number;
  positions: PositionGreeks[];
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  stockPosition?: {
    quantity: number;
    marketValue: number;
  };
}

export interface PositionGreeks {
  optionSymbol: string;
  optionType: 'call' | 'put';
  strikePrice: number;
  expirationDate: string;
  quantity: number;
  marketValue: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  iv: number;
  daysToExpiration: number;
}

export interface ThetaProjection {
  date: string;
  cumulativeDecay: number;
  dailyDecay: number;
  remainingPositions: number;
}

export interface DeltaExposure {
  priceLevel: number;
  percentChange: number;
  portfolioPnL: number;
  deltaDollars: number;
}

export interface SensitivityResult {
  symbol: string;
  currentPrice: number;
  scenarios: SensitivityScenario[];
}

export interface SensitivityScenario {
  priceChange: number;
  ivChange: number;
  newPrice: number;
  newIV: number;
  pnlEstimate: number;
  newDelta: number;
  newTheta: number;
}

export interface ExpirationCalendarItem {
  expirationDate: string;
  daysToExpiration: number;
  totalContracts: number;
  positionCount: number;
  positions: OptionPosition[];
}

// Onboarding types
export type CostBasisMethod = 'fifo' | 'lifo' | 'hifo' | 'specific';

export interface UserPreferences {
  defaultOrderType: OrderType;
  defaultTimeInForce: TimeInForce;
  defaultCostBasisMethod: CostBasisMethod;
  tourCompleted: boolean;
}

export interface OnboardingStatus {
  completed: boolean;
  currentStep: number;
  completedAt: string | null;
  preferences: UserPreferences | null;
}

export interface OnboardingStepData {
  cashSetup?: { startingCash: number };
  watchlistSetup?: { watchlistName: string; symbols: string[] };
  preferences?: Partial<UserPreferences>;
  userIntent?: 'stocks' | 'options' | 'testing' | 'exploring';
}

// Admin types
export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  cashBalance: number;
  createdAt: string;
  disabled: boolean;
  disabledAt: string | null;
  onboardingCompleted: boolean;
}

export interface AdminUserDetails {
  user: AdminUser;
  positionCount: number;
  optionPositionCount: number;
  orderCount: number;
}

export interface AdminOrder {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
  };
  symbol: string;
  side: OrderSide;
  quantity: number;
  orderType: OrderType;
  status: OrderStatus;
  filledPrice: number | null;
  limitPrice: number | null;
  stopPrice: number | null;
  createdAt: string;
  orderCategory: OrderCategory;
  optionSymbol: string | null;
}

export interface OrderAudit {
  id: string;
  orderId: string;
  action: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  createdAt: string;
}

export interface OrderStatistics {
  total: number;
  byStatus: Record<string, number>;
  today: number;
  thisWeek: number;
}

export interface SystemHealth {
  database: {
    status: 'up' | 'down';
    message?: string;
  };
  redis: {
    status: 'up' | 'down';
    message?: string;
  };
  timestamp: string;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers24h: number;
  disabledUsers: number;
  totalOrders: number;
  pendingOrders: number;
  totalPositions: number;
  adminCount: number;
  superAdminCount: number;
}

export interface JobStatus {
  name: string;
  type: 'cron' | 'interval';
  nextRun?: string;
  isRunning: boolean;
}

export interface ApiUsageStats {
  totalCalls: number;
  callsToday: number;
  callsByEndpoint: Record<string, number>;
  lastResetDate: string;
  apiType?: 'production' | 'sandbox';
  dailyQuota: number;
  quotaUsedPercent: number;
}

export interface AllApiUsageStats {
  tradier: ApiUsageStats;
  finnhub: ApiUsageStats;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  admin: { email: string };
  targetUserId: string | null;
  targetUser: { email: string } | null;
  action: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  reason: string | null;
  ipAddress: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
