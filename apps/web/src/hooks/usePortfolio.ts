import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export const portfolioKeys = {
  all: ['portfolio'] as const,
  detail: () => [...portfolioKeys.all] as const,
  options: () => [...portfolioKeys.all, 'options'] as const,
};

export function usePortfolio() {
  return useQuery({
    queryKey: portfolioKeys.detail(),
    queryFn: api.getPortfolio,
    staleTime: 5000, // 5 seconds - matches backend cache
    refetchOnWindowFocus: true,
  });
}

export function useOptionPositions() {
  return useQuery({
    queryKey: portfolioKeys.options(),
    queryFn: api.getOptionPositions,
    staleTime: 5000, // 5 seconds - matches backend cache
    refetchOnWindowFocus: true,
  });
}
