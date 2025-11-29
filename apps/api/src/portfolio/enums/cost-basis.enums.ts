export enum CostBasisMethod {
  FIFO = 'fifo',
  LIFO = 'lifo',
  HIFO = 'hifo',
  SPECIFIC = 'specific',
}

export enum TaxLotStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum GainType {
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
}

export enum DividendStatus {
  PENDING = 'pending',
  PAID = 'paid',
}

export enum OptionClosureType {
  SOLD_TO_CLOSE = 'sold_to_close',
  BOUGHT_TO_CLOSE = 'bought_to_close',
  EXPIRED_WORTHLESS = 'expired_worthless',
  EXERCISED = 'exercised',
  ASSIGNED = 'assigned',
}

export enum OptionStrategyType {
  LONG_CALL = 'long_call',
  LONG_PUT = 'long_put',
  NAKED_CALL = 'naked_call',
  NAKED_PUT = 'naked_put',
  COVERED_CALL = 'covered_call',
  CASH_SECURED_PUT = 'cash_secured_put',
}
