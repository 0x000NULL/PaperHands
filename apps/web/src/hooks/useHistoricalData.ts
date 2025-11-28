import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Timeframe } from '../types';

export const historicalDataKeys = {
  all: ['historicalData'] as const,
  detail: (symbol: string, timeframe: Timeframe) =>
    [...historicalDataKeys.all, symbol, timeframe] as const,
};

function getStaleTime(timeframe: Timeframe): number {
  switch (timeframe) {
    case '1D':
      return 60_000; // 1 minute for intraday
    case '1W':
      return 300_000; // 5 minutes
    case '1M':
      return 900_000; // 15 minutes
    default:
      return 3_600_000; // 1 hour for longer timeframes
  }
}

export function useHistoricalData(
  symbol: string,
  timeframe: Timeframe,
  enabled = true,
) {
  return useQuery({
    queryKey: historicalDataKeys.detail(symbol.toUpperCase(), timeframe),
    queryFn: () => api.getHistoricalData(symbol, timeframe),
    enabled: enabled && symbol.length > 0,
    staleTime: getStaleTime(timeframe),
    retry: 1,
  });
}
