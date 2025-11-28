import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { CreateOrderRequest } from '../types';
import { portfolioKeys } from './usePortfolio';

export const orderKeys = {
  all: ['orders'] as const,
  list: () => [...orderKeys.all, 'list'] as const,
};

export function useOrders() {
  return useQuery({
    queryKey: orderKeys.list(),
    queryFn: api.getOrders,
    staleTime: 10000, // 10 seconds
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (order: CreateOrderRequest) => api.placeOrder(order),
    onSuccess: () => {
      // Invalidate both orders and portfolio after placing an order
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      void queryClient.invalidateQueries({ queryKey: portfolioKeys.all });
    },
  });
}
