export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderCategory {
  EQUITY = 'equity',
  OPTION = 'option',
}

export enum OptionType {
  CALL = 'call',
  PUT = 'put',
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP = 'stop',
  STOP_LIMIT = 'stop_limit',
  TRAILING_STOP = 'trailing_stop',
}

export enum TimeInForce {
  DAY = 'day',
  GTC = 'gtc',
}

export enum OrderStatus {
  PENDING = 'pending',
  QUEUED = 'queued', // Market orders waiting for market to open
  OPEN = 'open',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  REJECTED = 'rejected',
}

export enum AuditAction {
  CREATED = 'created',
  MODIFIED = 'modified',
  TRIGGERED = 'triggered',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}
