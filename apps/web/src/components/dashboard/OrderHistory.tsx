import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useOrders } from '../../hooks';
import { useDashboardStore } from '../../store/dashboardStore';
import { Widget } from './Widget';

const styles: Record<string, CSSProperties> = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    textAlign: 'left',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.medium,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  thRight: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    textAlign: 'right',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.medium,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  thCenter: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.medium,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  td: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  tdRight: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    borderBottom: `1px solid ${theme.colors.border}`,
    textAlign: 'right',
    fontFamily: theme.typography.fontMono,
  },
  tdCenter: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.border}`,
    textAlign: 'center',
  },
  symbolLink: {
    color: theme.colors.accent,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  badge: {
    display: 'inline-block',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase',
  },
  empty: {
    padding: theme.spacing.xl,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  loading: {
    padding: theme.spacing.xl,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  error: {
    padding: theme.spacing.lg,
    textAlign: 'center',
    color: theme.colors.negative,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: theme.radius.md,
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getSideBadgeStyle = (side: string): CSSProperties => ({
  ...styles.badge,
  backgroundColor: side === 'buy' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 71, 87, 0.15)',
  color: side === 'buy' ? theme.colors.positive : theme.colors.negative,
});

const getStatusBadgeStyle = (status: string): CSSProperties => {
  const colors: Record<string, { bg: string; text: string }> = {
    filled: { bg: 'rgba(0, 255, 136, 0.15)', text: theme.colors.positive },
    pending: { bg: 'rgba(255, 165, 2, 0.15)', text: theme.colors.warning },
    cancelled: { bg: 'rgba(160, 160, 176, 0.15)', text: theme.colors.textSecondary },
    rejected: { bg: 'rgba(255, 71, 87, 0.15)', text: theme.colors.negative },
  };
  const { bg, text } = colors[status] || colors.pending;
  return {
    ...styles.badge,
    backgroundColor: bg,
    color: text,
  };
};

export function OrderHistory() {
  const { data: orders, isLoading, error } = useOrders();
  const setSelectedSymbol = useDashboardStore((state) => state.setSelectedSymbol);

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  if (isLoading) {
    return (
      <Widget title="Order History" noPadding>
        <div style={styles.loading}>Loading orders...</div>
      </Widget>
    );
  }

  if (error) {
    return (
      <Widget title="Order History" noPadding>
        <div style={styles.error}>
          {error instanceof Error ? error.message : 'Failed to load orders'}
        </div>
      </Widget>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Widget title="Order History" noPadding>
        <div style={styles.empty}>No orders yet. Place your first trade!</div>
      </Widget>
    );
  }

  return (
    <Widget title="Order History" noPadding>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Symbol</th>
            <th style={styles.thCenter}>Side</th>
            <th style={styles.thRight}>Qty</th>
            <th style={styles.thRight}>Price</th>
            <th style={styles.thRight}>Total</th>
            <th style={styles.thCenter}>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td style={styles.td}>{formatDate(order.createdAt)}</td>
              <td style={styles.td}>
                <span
                  style={styles.symbolLink}
                  onClick={() => handleSymbolClick(order.symbol)}
                >
                  {order.symbol}
                </span>
              </td>
              <td style={styles.tdCenter}>
                <span style={getSideBadgeStyle(order.side)}>
                  {order.side.toUpperCase()}
                </span>
              </td>
              <td style={styles.tdRight}>{order.quantity.toFixed(4)}</td>
              <td style={styles.tdRight}>
                {order.filledPrice ? formatCurrency(order.filledPrice) : '-'}
              </td>
              <td style={styles.tdRight}>
                {order.filledPrice
                  ? formatCurrency(order.quantity * order.filledPrice)
                  : '-'}
              </td>
              <td style={styles.tdCenter}>
                <span style={getStatusBadgeStyle(order.status)}>
                  {order.status.toUpperCase()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Widget>
  );
}
