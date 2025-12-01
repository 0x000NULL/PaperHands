import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type Alert,
  type CreateAlertRequest,
  type UpdateAlertRequest,
  type QueryAlertsParams,
} from '../api/client';

// Query keys
export const alertKeys = {
  all: ['alerts'] as const,
  lists: () => [...alertKeys.all, 'list'] as const,
  list: (params?: QueryAlertsParams) => [...alertKeys.lists(), params] as const,
  details: () => [...alertKeys.all, 'detail'] as const,
  detail: (id: string) => [...alertKeys.details(), id] as const,
};

// Fetch all alerts
export function useAlerts(params?: QueryAlertsParams) {
  return useQuery({
    queryKey: alertKeys.list(params),
    queryFn: () => api.getAlerts(params),
    staleTime: 30000, // 30 seconds
  });
}

// Fetch single alert
export function useAlert(id: string) {
  return useQuery({
    queryKey: alertKeys.detail(id),
    queryFn: () => api.getAlert(id),
    enabled: !!id,
  });
}

// Create alert mutation
export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAlertRequest) => api.createAlert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}

// Update alert mutation
export function useUpdateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAlertRequest }) =>
      api.updateAlert(id, data),
    onSuccess: (alert) => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
      queryClient.setQueryData(alertKeys.detail(alert.id), alert);
    },
  });
}

// Delete alert mutation
export function useDeleteAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}

// Reactivate alert mutation
export function useReactivateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.reactivateAlert(id),
    onSuccess: (alert) => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
      queryClient.setQueryData(alertKeys.detail(alert.id), alert);
    },
  });
}

// Helper to format alert display
export function formatAlertDescription(alert: Alert): string {
  const typeLabels: Record<string, string> = {
    PRICE: 'Price',
    PERCENT_CHANGE: '% Change',
    VOLUME: 'Volume',
    GREEKS: alert.greekType?.toUpperCase() || 'Greek',
    PORTFOLIO_VALUE: 'Portfolio Value',
    EARNINGS: 'Earnings',
  };

  const conditionLabels: Record<string, string> = {
    ABOVE: 'above',
    BELOW: 'below',
    CROSSES: 'crosses',
  };

  const type = typeLabels[alert.type] || alert.type;
  const condition = conditionLabels[alert.condition] || alert.condition;
  const symbol = alert.symbol || 'Portfolio';

  let valueDisplay: string;
  if (alert.type === 'PERCENT_CHANGE') {
    valueDisplay = `${alert.targetValue >= 0 ? '+' : ''}${alert.targetValue}%`;
  } else if (alert.type === 'VOLUME') {
    valueDisplay = formatVolume(Number(alert.targetValue));
  } else {
    valueDisplay = `$${Number(alert.targetValue).toFixed(2)}`;
  }

  return `${symbol} ${type} ${condition} ${valueDisplay}`;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(2)}B`;
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(2)}K`;
  }
  return volume.toString();
}
