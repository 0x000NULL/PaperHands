import { useState, useMemo, type CSSProperties } from 'react';
import { Layout } from '../components/Layout';
import { Widget } from '../components/dashboard/Widget';
import { theme } from '../theme/constants';
import { useOrders } from '../hooks';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useDashboardStore } from '../store/dashboardStore';
import type { OrderCategory } from '../types';
import '../styles/responsive.css';

type FilterCategory = 'all' | OrderCategory;
type FilterStatus = 'all' | 'pending' | 'filled' | 'cancelled' | 'rejected';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
    minHeight: 'calc(100vh - 80px)',
  },
  summaryBar: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  summaryLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: theme.typography['2xl'],
    fontWeight: theme.typography.bold,
    fontFamily: theme.typography.fontMono,
  },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  filterGroup: {
    display: 'flex',
    gap: theme.spacing.xs,
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  },
  filterButton: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: 'transparent',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
  },
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
  optionSymbol: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  // Mobile card styles
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.border}`,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardSymbol: {
    fontWeight: theme.typography.semibold,
    color: theme.colors.accent,
    fontSize: theme.typography.base,
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.xs} 0`,
  },
  cardLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  cardValue: {
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.textPrimary,
  },
  cardDate: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
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

const categoryFilters: { value: FilterCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'equity', label: 'Stocks' },
  { value: 'option', label: 'Options' },
];

const statusFilters: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'filled', label: 'Filled' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function Orders() {
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const { data: orders, isLoading, error } = useOrders();
  const setSelectedSymbol = useDashboardStore((state) => state.setSelectedSymbol);
  const isDesktop = useIsDesktop();

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((order) => {
      const matchesCategory = categoryFilter === 'all' || order.orderCategory === categoryFilter;
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesCategory && matchesStatus;
    });
  }, [orders, categoryFilter, statusFilter]);

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!orders) return { total: 0, pending: 0, filledToday: 0, cancelledToday: 0, successRate: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'pending').length;
    const filled = orders.filter((o) => o.status === 'filled');
    const filledToday = filled.filter((o) => new Date(o.createdAt) >= today).length;
    const cancelledToday = orders.filter(
      (o) => o.status === 'cancelled' && new Date(o.createdAt) >= today
    ).length;
    const successRate = total > 0 ? (filled.length / total) * 100 : 0;

    return { total, pending, filledToday, cancelledToday, successRate };
  }, [orders]);

  const renderFilters = () => (
    <div style={styles.filterRow}>
      <div style={styles.filterGroup}>
        <span style={styles.filterLabel}>Type:</span>
        {categoryFilters.map((filter) => (
          <button
            key={filter.value}
            style={{
              ...styles.filterButton,
              ...(categoryFilter === filter.value ? styles.filterButtonActive : {}),
            }}
            onClick={() => setCategoryFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div style={styles.filterGroup}>
        <span style={styles.filterLabel}>Status:</span>
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            style={{
              ...styles.filterButton,
              ...(statusFilter === filter.value ? styles.filterButtonActive : {}),
            }}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderOrdersTable = () => {
    if (filteredOrders.length === 0) {
      return (
        <div style={styles.empty}>
          {orders?.length === 0
            ? 'No orders yet. Place your first trade!'
            : 'No orders match the selected filters.'}
        </div>
      );
    }

    if (!isDesktop) {
      return (
        <div style={styles.cardList}>
          {filteredOrders.map((order) => (
            <div key={order.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span
                  style={styles.cardSymbol}
                  onClick={() => handleSymbolClick(order.underlyingSymbol || order.symbol)}
                >
                  {order.underlyingSymbol || order.symbol}
                  {order.orderCategory === 'option' && order.optionSymbol && (
                    <span style={styles.optionSymbol}>{order.optionSymbol}</span>
                  )}
                </span>
                <span style={getStatusBadgeStyle(order.status)}>
                  {order.status.toUpperCase()}
                </span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Side</span>
                <span style={getSideBadgeStyle(order.side)}>{order.side.toUpperCase()}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Quantity</span>
                <span style={styles.cardValue}>{order.quantity.toFixed(4)}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Price</span>
                <span style={styles.cardValue}>
                  {order.filledPrice ? formatCurrency(order.filledPrice) : '-'}
                </span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Total</span>
                <span style={styles.cardValue}>
                  {order.filledPrice
                    ? formatCurrency(order.quantity * order.filledPrice)
                    : '-'}
                </span>
              </div>
              <div style={styles.cardDate}>{formatDate(order.createdAt)}</div>
            </div>
          ))}
        </div>
      );
    }

    return (
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
          {filteredOrders.map((order) => (
            <tr key={order.id}>
              <td style={styles.td}>{formatDate(order.createdAt)}</td>
              <td style={styles.td}>
                <span
                  style={styles.symbolLink}
                  onClick={() => handleSymbolClick(order.underlyingSymbol || order.symbol)}
                >
                  {order.underlyingSymbol || order.symbol}
                  {order.orderCategory === 'option' && order.optionSymbol && (
                    <span style={styles.optionSymbol}>{order.optionSymbol}</span>
                  )}
                </span>
              </td>
              <td style={styles.tdCenter}>
                <span style={getSideBadgeStyle(order.side)}>{order.side.toUpperCase()}</span>
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
    );
  };

  if (error) {
    return (
      <Layout>
        <div style={styles.container}>
          <div style={styles.error}>
            {error instanceof Error ? error.message : 'Failed to load orders'}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.container}>
        {/* Summary Bar */}
        <div className="summary-bar" style={styles.summaryBar}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Total Orders</span>
            <span style={styles.summaryValue}>{stats.total}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Pending</span>
            <span
              style={{
                ...styles.summaryValue,
                color: stats.pending > 0 ? theme.colors.warning : theme.colors.textPrimary,
              }}
            >
              {stats.pending}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Filled Today</span>
            <span
              style={{
                ...styles.summaryValue,
                color: stats.filledToday > 0 ? theme.colors.positive : theme.colors.textPrimary,
              }}
            >
              {stats.filledToday}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Cancelled Today</span>
            <span style={styles.summaryValue}>{stats.cancelledToday}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Success Rate</span>
            <span
              style={{
                ...styles.summaryValue,
                color: stats.successRate >= 80 ? theme.colors.positive : theme.colors.textPrimary,
              }}
            >
              {stats.successRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Orders List */}
        <Widget title="Order History" noPadding>
          {renderFilters()}
          {isLoading ? (
            <div style={styles.loading}>Loading orders...</div>
          ) : (
            renderOrdersTable()
          )}
        </Widget>
      </div>
    </Layout>
  );
}
