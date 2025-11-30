import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export const volatilityKeys = {
  all: ['volatility'] as const,
  metrics: (symbol: string) => [...volatilityKeys.all, 'metrics', symbol] as const,
};

export function useVolatilityMetrics(symbol: string, enabled = true) {
  return useQuery({
    queryKey: volatilityKeys.metrics(symbol.toUpperCase()),
    queryFn: () => api.getVolatilityMetrics(symbol),
    enabled: enabled && symbol.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - volatility data doesn't change rapidly
    retry: 1,
  });
}
