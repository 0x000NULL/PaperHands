import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export const quoteKeys = {
  all: ['quotes'] as const,
  detail: (symbol: string) => [...quoteKeys.all, symbol] as const,
};

export function useQuote(symbol: string, enabled = true) {
  return useQuery({
    queryKey: quoteKeys.detail(symbol.toUpperCase()),
    queryFn: () => api.getQuote(symbol),
    enabled: enabled && symbol.length > 0,
    staleTime: 5000, // 5 seconds - matches backend cache
    retry: 1,
  });
}
