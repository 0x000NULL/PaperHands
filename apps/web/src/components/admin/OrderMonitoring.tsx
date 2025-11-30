import { useState, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useAuthStore } from '../../store/authStore';
import { useAdminOrders, useOrderStats, useCancelOrder } from '../../hooks/useAdmin';
import type { OrderStatus, AdminOrder } from '../../types';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    textAlign: 'center',
  },
  statValue: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  filters: {
    display: 'flex',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    gap: theme.spacing.xs,
  },
  filterButton: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.bgTertiary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    color: '#fff',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.typography.sm,
  },
  th: {
    padding: theme.spacing.sm,
    textAlign: 'left',
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.medium,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  td: {
    padding: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.border}`,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontMono,
  },
  statusBadge: {
    display: 'inline-block',
    padding: `2px ${theme.spacing.xs}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    textTransform: 'uppercase',
  },
  sideBuy: {
    color: theme.colors.positive,
  },
  sideSell: {
    color: theme.colors.negative,
  },
  actionButton: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: theme.colors.negative,
    color: '#fff',
    transition: theme.transitions.fast,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  paginationButtons: {
    display: 'flex',
    gap: theme.spacing.sm,
  },
  pageButton: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: theme.colors.accent,
    color: '#fff',
    transition: theme.transitions.fast,
  },
  loading: {
    textAlign: 'center',
    padding: theme.spacing.xl,
    color: theme.colors.textSecondary,
  },
  refreshInfo: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginBottom: theme.spacing.sm,
  },
};

const STATUS_COLORS: Record<string, CSSProperties> = {
  pending: { backgroundColor: 'rgba(255, 193, 7, 0.2)', color: '#ffc107' },
  queued: { backgroundColor: 'rgba(59, 130, 246, 0.2)', color: theme.colors.accent },
  filled: { backgroundColor: 'rgba(34, 197, 94, 0.2)', color: theme.colors.positive },
  cancelled: { backgroundColor: 'rgba(156, 163, 175, 0.2)', color: theme.colors.textSecondary },
  rejected: { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: theme.colors.negative },
};

const STATUSES: OrderStatus[] = ['pending', 'queued', 'filled', 'cancelled', 'rejected'];
const LIMIT = 20;

export function OrderMonitoring() {
  const { user: currentUser } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  const [offset, setOffset] = useState(0);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const { data: stats } = useOrderStats();
  const { data, isLoading, refetch, dataUpdatedAt } = useAdminOrders({
    status: statusFilter ? [statusFilter] : undefined,
    limit: LIMIT,
    offset,
  });

  const cancelMutation = useCancelOrder();

  const handleCancel = (order: AdminOrder) => {
    if (!isSuperAdmin) return;
    const reason = prompt('Reason for cancelling this order:');
    if (reason) {
      cancelMutation.mutate(
        { orderId: order.id, reason },
        { onSuccess: () => void refetch() },
      );
    }
  };

  const formatCurrency = (value: number | null) =>
    value !== null
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value)
      : '-';

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const canCancel = (status: OrderStatus) =>
    ['pending', 'queued'].includes(status);

  if (isLoading) {
    return <div style={styles.loading}>Loading orders...</div>;
  }

  const orders = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div style={styles.container}>
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats?.total ?? '-'}</div>
          <div style={styles.statLabel}>Total Orders</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats?.today ?? '-'}</div>
          <div style={styles.statLabel}>Today</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats?.thisWeek ?? '-'}</div>
          <div style={styles.statLabel}>This Week</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {stats?.byStatus?.pending ?? 0}
          </div>
          <div style={styles.statLabel}>Pending</div>
        </div>
      </div>

      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <button
            style={{
              ...styles.filterButton,
              ...(statusFilter === null ? styles.filterButtonActive : {}),
            }}
            onClick={() => {
              setStatusFilter(null);
              setOffset(0);
            }}
          >
            All
          </button>
          {STATUSES.map((status) => (
            <button
              key={status}
              style={{
                ...styles.filterButton,
                ...(statusFilter === status ? styles.filterButtonActive : {}),
              }}
              onClick={() => {
                setStatusFilter(status);
                setOffset(0);
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.refreshInfo}>
        Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()} (auto-refresh every 30s)
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>User</th>
            <th style={styles.th}>Symbol</th>
            <th style={styles.th}>Side</th>
            <th style={styles.th}>Qty</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Price</th>
            <th style={styles.th}>Created</th>
            {isSuperAdmin && <th style={styles.th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td style={styles.td}>{order.user?.email ?? 'Unknown'}</td>
              <td style={styles.td}>
                {order.optionSymbol ?? order.symbol}
              </td>
              <td
                style={{
                  ...styles.td,
                  ...(order.side === 'buy' ? styles.sideBuy : styles.sideSell),
                }}
              >
                {order.side.toUpperCase()}
              </td>
              <td style={styles.td}>{order.quantity}</td>
              <td style={styles.td}>{order.orderType}</td>
              <td style={styles.td}>
                <span
                  style={{
                    ...styles.statusBadge,
                    ...(STATUS_COLORS[order.status] ?? {}),
                  }}
                >
                  {order.status}
                </span>
              </td>
              <td style={styles.td}>
                {formatCurrency(order.filledPrice ?? order.limitPrice)}
              </td>
              <td style={styles.td}>{formatDate(order.createdAt)}</td>
              {isSuperAdmin && (
                <td style={styles.td}>
                  {canCancel(order.status) && (
                    <button
                      style={styles.actionButton}
                      onClick={() => handleCancel(order)}
                      disabled={cancelMutation.isPending}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={styles.pagination}>
        <span>
          Showing {offset + 1}-{Math.min(offset + LIMIT, total)} of {total} orders
        </span>
        <div style={styles.paginationButtons}>
          <button
            style={styles.pageButton}
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            disabled={offset === 0}
          >
            Previous
          </button>
          <button
            style={styles.pageButton}
            onClick={() => setOffset(offset + LIMIT)}
            disabled={offset + LIMIT >= total}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
