import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export const portfolioKeys = {
  all: ['portfolio'] as const,
  detail: () => [...portfolioKeys.all] as const,
};

export function usePortfolio() {
  return useQuery({
    queryKey: portfolioKeys.detail(),
    queryFn: api.getPortfolio,
    staleTime: 5000, // 5 seconds - matches backend cache
    refetchOnWindowFocus: true,
  });
}
