export class CandleDto {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class CandleResponseDto {
  symbol: string;
  period: string;
  resolution: string;
  candles: CandleDto[];
}
