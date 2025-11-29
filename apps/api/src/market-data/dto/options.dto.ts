import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// Tradier API response types
export interface TradierExpirationsResponse {
  expirations: {
    date: string[] | string | null;
  } | null;
}

export interface TradierOptionQuote {
  symbol: string;
  description: string;
  exch: string;
  type: string;
  last: number | null;
  change: number | null;
  volume: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  bid: number;
  ask: number;
  underlying: string;
  strike: number;
  change_percentage: number | null;
  average_volume: number;
  last_volume: number;
  trade_date: number;
  prevclose: number | null;
  week_52_high: number;
  week_52_low: number;
  bidsize: number;
  bidexch: string;
  bid_date: number;
  asksize: number;
  askexch: string;
  ask_date: number;
  open_interest: number;
  contract_size: number;
  expiration_date: string;
  expiration_type: string;
  option_type: 'call' | 'put';
  root_symbol: string;
  greeks?: TradierGreeks;
}

export interface TradierGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  phi: number;
  bid_iv: number;
  mid_iv: number;
  ask_iv: number;
  smv_vol: number;
  updated_at: string;
}

export interface TradierOptionsChainResponse {
  options: {
    option: TradierOptionQuote[] | TradierOptionQuote | null;
  } | null;
}

// Application types
export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  iv: number; // implied volatility (mid_iv from Tradier)
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

// Query DTOs
export class OptionsQueryDto {
  @IsString()
  expiration: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  strikeRange?: number = 15; // +/- strikes from ATM, default 15
}
