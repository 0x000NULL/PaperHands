import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../api/client';

export const optionsKeys = {
  all: ['options'] as const,
  expirations: (symbol: string) =>
    [...optionsKeys.all, 'expirations', symbol] as const,
  chain: (symbol: string, expiration: string) =>
    [...optionsKeys.all, 'chain', symbol, expiration] as const,
};

export function useOptionsExpirations(symbol: string | null, enabled = true) {
  return useQuery({
    queryKey: optionsKeys.expirations(symbol ?? ''),
    queryFn: () => api.getOptionsExpirations(symbol!),
    enabled: enabled && !!symbol && symbol.length > 0,
    staleTime: 300_000, // 5 minutes - expirations rarely change
    retry: 1,
  });
}

export function useOptionsChain(
  symbol: string | null,
  expiration: string | null,
  enabled = true,
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: optionsKeys.chain(symbol ?? '', expiration ?? ''),
    queryFn: () => api.getOptionsChain(symbol!, expiration!),
    enabled: enabled && !!symbol && !!expiration,
    staleTime: 30_000, // 30 seconds
    retry: 1,
  });

  // Pre-fetch adjacent expirations when selection changes
  useEffect(() => {
    if (!symbol || !expiration) return;

    // Get the expirations from cache
    const expirationsData = queryClient.getQueryData<string[]>(
      optionsKeys.expirations(symbol),
    );

    if (!expirationsData) return;

    const currentIndex = expirationsData.indexOf(expiration);
    if (currentIndex === -1) return;

    // Pre-fetch adjacent expirations
    const adjacentExpirations = [
      expirationsData[currentIndex - 1],
      expirationsData[currentIndex + 1],
    ].filter(Boolean);

    adjacentExpirations.forEach((exp) => {
      queryClient.prefetchQuery({
        queryKey: optionsKeys.chain(symbol, exp),
        queryFn: () => api.getOptionsChain(symbol, exp),
        staleTime: 30_000,
      });
    });
  }, [symbol, expiration, queryClient]);

  return query;
}
