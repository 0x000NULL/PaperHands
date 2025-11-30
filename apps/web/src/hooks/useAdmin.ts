import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { UserRole, OrderStatus } from '../types';

// Query keys
export const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  usersList: (params?: {
    search?: string;
    role?: UserRole;
    disabled?: boolean;
    limit?: number;
    offset?: number;
  }) => [...adminKeys.users(), 'list', params] as const,
  user: (id: string) => [...adminKeys.users(), id] as const,
  orders: () => [...adminKeys.all, 'orders'] as const,
  ordersList: (params?: {
    userId?: string;
    status?: OrderStatus[];
    symbol?: string;
    limit?: number;
    offset?: number;
  }) => [...adminKeys.orders(), 'list', params] as const,
  order: (id: string) => [...adminKeys.orders(), id] as const,
  orderStats: () => [...adminKeys.orders(), 'stats'] as const,
  system: () => [...adminKeys.all, 'system'] as const,
  health: () => [...adminKeys.system(), 'health'] as const,
  stats: () => [...adminKeys.system(), 'stats'] as const,
  jobs: () => [...adminKeys.system(), 'jobs'] as const,
  apiUsage: () => [...adminKeys.system(), 'api-usage'] as const,
  auditLogs: (params?: {
    adminId?: string;
    targetUserId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) => [...adminKeys.system(), 'audit-logs', params] as const,
};

// User Management Hooks
export function useAdminUsers(params?: {
  search?: string;
  role?: UserRole;
  disabled?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}) {
  return useQuery({
    queryKey: adminKeys.usersList(params),
    queryFn: () => api.admin.getUsers(params),
    staleTime: 30000,
  });
}

export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: adminKeys.user(userId),
    queryFn: () => api.admin.getUser(userId),
    staleTime: 30000,
    enabled: !!userId,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
      reason,
    }: {
      userId: string;
      role: UserRole;
      reason?: string;
    }) => api.admin.updateRole(userId, role, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useAdjustBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      adjustment,
      reason,
    }: {
      userId: string;
      adjustment: number;
      reason: string;
    }) => api.admin.adjustBalance(userId, adjustment, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useDisableUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      api.admin.disableUser(userId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useEnableUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.admin.enableUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

// Order Monitoring Hooks
export function useAdminOrders(params?: {
  userId?: string;
  status?: OrderStatus[];
  symbol?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: adminKeys.ordersList(params),
    queryFn: () => api.admin.getOrders(params),
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

export function useAdminOrder(orderId: string) {
  return useQuery({
    queryKey: adminKeys.order(orderId),
    queryFn: () => api.admin.getOrder(orderId),
    staleTime: 10000,
    enabled: !!orderId,
  });
}

export function useOrderStats() {
  return useQuery({
    queryKey: adminKeys.orderStats(),
    queryFn: () => api.admin.getOrderStats(),
    staleTime: 30000,
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      api.admin.cancelOrder(orderId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.orders() });
    },
  });
}

// System Health Hooks
export function useSystemHealth() {
  return useQuery({
    queryKey: adminKeys.health(),
    queryFn: () => api.admin.getHealth(),
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

export function useSystemStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: () => api.admin.getStats(),
    staleTime: 30000,
  });
}

export function useScheduledJobs() {
  return useQuery({
    queryKey: adminKeys.jobs(),
    queryFn: () => api.admin.getJobs(),
    staleTime: 30000,
  });
}

export function useApiUsage() {
  return useQuery({
    queryKey: adminKeys.apiUsage(),
    queryFn: () => api.admin.getApiUsage(),
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

export function useAuditLogs(params?: {
  adminId?: string;
  targetUserId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: adminKeys.auditLogs(params),
    queryFn: () => api.admin.getAuditLogs(params),
    staleTime: 30000,
  });
}
