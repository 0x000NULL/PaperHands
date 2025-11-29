export type StreamEventType =
  | 'quote'
  | 'trade'
  | 'timesale'
  | 'summary'
  | 'tradex';

export interface TradierQuoteEvent {
  type: 'quote';
  symbol: string;
  bid: number;
  bidsz: number;
  bidexch: string;
  biddate: string;
  ask: number;
  asksz: number;
  askexch: string;
  askdate: string;
}

export interface TradierTradeEvent {
  type: 'trade';
  symbol: string;
  exch: string;
  price: number;
  size: number;
  cvol: number;
  date: string;
  last: number;
}

export interface TradierTimesaleEvent {
  type: 'timesale';
  symbol: string;
  exch: string;
  bid: number;
  ask: number;
  last: number;
  size: number;
  date: string;
  seq: number;
  flag: string;
  cancel: boolean;
  correction: boolean;
  session: string;
}

export interface TradierSummaryEvent {
  type: 'summary';
  symbol: string;
  open: number;
  high: number;
  low: number;
  prevClose: number;
}

export type TradierStreamEvent =
  | TradierQuoteEvent
  | TradierTradeEvent
  | TradierTimesaleEvent
  | TradierSummaryEvent;

export interface StreamingQuote {
  symbol: string;
  bid: number;
  bidSize: number;
  ask: number;
  askSize: number;
  last: number;
  timestamp: Date;
}

export interface StreamingTrade {
  symbol: string;
  price: number;
  size: number;
  timestamp: Date;
  exchange: string;
  cumulativeVolume: number;
}

export interface StreamingTimesale {
  symbol: string;
  price: number;
  size: number;
  timestamp: Date;
  exchange: string;
  bid: number;
  ask: number;
  condition: 'at_bid' | 'at_ask' | 'between';
}

export interface NormalizedStreamEvent {
  type: StreamEventType;
  symbol: string;
  data: StreamingQuote | StreamingTrade | StreamingTimesale;
  rawEvent: TradierStreamEvent;
}

export interface TradierSessionResponse {
  stream: {
    sessionid: string;
    url: string;
  };
}
