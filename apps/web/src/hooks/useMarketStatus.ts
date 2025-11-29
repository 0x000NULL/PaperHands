import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export const marketStatusKeys = {
  all: ['marketStatus'] as const,
};

export function useMarketStatus() {
  return useQuery({
    queryKey: marketStatusKeys.all,
    queryFn: () => api.getMarketStatus(),
    staleTime: 30000, // 30 seconds - market status doesn't change frequently
    refetchInterval: 60000, // Refetch every minute
    retry: 1,
  });
}
