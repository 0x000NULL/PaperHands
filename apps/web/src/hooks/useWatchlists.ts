import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export const watchlistKeys = {
  all: ['watchlists'] as const,
  lists: () => [...watchlistKeys.all, 'list'] as const,
  detail: (id: string) => [...watchlistKeys.all, 'detail', id] as const,
  quotes: (symbols: string[]) =>
    [...watchlistKeys.all, 'quotes', symbols.sort().join(',')] as const,
};

export function useWatchlists() {
  return useQuery({
    queryKey: watchlistKeys.lists(),
    queryFn: api.getWatchlists,
    staleTime: 30000, // 30 seconds
  });
}

export function useWatchlist(id: string | null) {
  return useQuery({
    queryKey: watchlistKeys.detail(id ?? ''),
    queryFn: () => api.getWatchlist(id!),
    enabled: !!id,
    staleTime: 10000, // 10 seconds
  });
}

export function useWatchlistQuotes(symbols: string[]) {
  return useQuery({
    queryKey: watchlistKeys.quotes(symbols),
    queryFn: () => api.getQuotes(symbols),
    enabled: symbols.length > 0,
    staleTime: 5000, // 5 seconds - matches backend cache
    refetchInterval: 10000, // Refresh every 10 seconds for live prices
  });
}

export function useCreateWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => api.createWatchlist(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: watchlistKeys.lists() });
    },
  });
}

export function useUpdateWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.updateWatchlist(id, name),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: watchlistKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: watchlistKeys.detail(data.id),
      });
    },
  });
}

export function useDeleteWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteWatchlist(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: watchlistKeys.lists() });
    },
  });
}

export function useAddSymbol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      watchlistId,
      symbol,
    }: {
      watchlistId: string;
      symbol: string;
    }) => api.addSymbolToWatchlist(watchlistId, symbol),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: watchlistKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: watchlistKeys.detail(data.id),
      });
    },
  });
}

export function useRemoveSymbol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      watchlistId,
      symbol,
    }: {
      watchlistId: string;
      symbol: string;
    }) => api.removeSymbolFromWatchlist(watchlistId, symbol),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: watchlistKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: watchlistKeys.detail(data.id),
      });
    },
  });
}

export function useReorderItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      watchlistId,
      itemIds,
    }: {
      watchlistId: string;
      itemIds: string[];
    }) => api.reorderWatchlistItems(watchlistId, itemIds),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: watchlistKeys.detail(data.id),
      });
    },
  });
}
