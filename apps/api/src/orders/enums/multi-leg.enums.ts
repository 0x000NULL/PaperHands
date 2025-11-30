export enum MultiLegStrategyType {
  // Vertical Spreads
  BULL_CALL_SPREAD = 'bull_call_spread',
  BEAR_CALL_SPREAD = 'bear_call_spread',
  BULL_PUT_SPREAD = 'bull_put_spread',
  BEAR_PUT_SPREAD = 'bear_put_spread',

  // Straddles and Strangles
  LONG_STRADDLE = 'long_straddle',
  SHORT_STRADDLE = 'short_straddle',
  LONG_STRANGLE = 'long_strangle',
  SHORT_STRANGLE = 'short_strangle',

  // Iron Condors and Butterflies
  IRON_CONDOR = 'iron_condor',
  IRON_BUTTERFLY = 'iron_butterfly',
  LONG_CALL_BUTTERFLY = 'long_call_butterfly',
  LONG_PUT_BUTTERFLY = 'long_put_butterfly',

  // Calendar/Diagonal Spreads
  CALENDAR_SPREAD = 'calendar_spread',
  DIAGONAL_SPREAD = 'diagonal_spread',

  // Custom (user-defined legs)
  CUSTOM = 'custom',
}

export enum MultiLegStatus {
  PENDING = 'pending',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export enum RolloverType {
  ROLL_FORWARD = 'roll_forward', // Same strike, later expiration
  ROLL_UP = 'roll_up', // Higher strike
  ROLL_DOWN = 'roll_down', // Lower strike
  DIAGONAL = 'diagonal', // Different strike and expiration
}

export enum RolloverStatus {
  PENDING = 'pending',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}
