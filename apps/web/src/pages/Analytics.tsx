import { useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { Widget } from '../components/dashboard/Widget';
import { theme } from '../theme/constants';
import { api } from '../api/client';
import type { OpenTaxLot, LotSale, Dividend } from '../api/client';

type AnalyticsPeriod = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';
type TabType = 'lots' | 'history' | 'dividends';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
    minHeight: 'calc(100vh - 80px)',
  },
  summaryBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: theme.spacing.md,
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
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: theme.spacing.lg,
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
  },
  periodSelector: {
    display: 'flex',
    gap: theme.spacing.xs,
  },
  periodButton: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: 'transparent',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  periodButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: theme.spacing.md,
  },
  statCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    textAlign: 'center' as const,
  },
  statLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    fontFamily: theme.typography.fontMono,
  },
  allocationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  allocationItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.sm,
  },
  allocationSymbol: {
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
  },
  allocationPercent: {
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
  },
  gainsSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  gainsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.sm,
  },
  tabBar: {
    display: 'flex',
    gap: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.border}`,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  tab: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: theme.radius.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  tabActive: {
    backgroundColor: theme.colors.bgTertiary,
    color: theme.colors.accent,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: theme.typography.sm,
  },
  th: {
    padding: theme.spacing.sm,
    textAlign: 'left' as const,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.medium,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  td: {
    padding: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.border}`,
    fontFamily: theme.typography.fontMono,
  },
  loading: {
    padding: theme.spacing.xl,
    textAlign: 'center' as const,
    color: theme.colors.textSecondary,
  },
  noData: {
    padding: theme.spacing.xl,
    textAlign: 'center' as const,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  chartPlaceholder: {
    height: 300,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    color: theme.colors.textSecondary,
  },
};

const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value >= 0 ? '' : '-';
  return `${sign}$${absValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPercent = (value: number, showSign = true): string => {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const getValueColor = (value: number): string => {
  if (value > 0) return theme.colors.positive;
  if (value < 0) return theme.colors.negative;
  return theme.colors.textPrimary;
};

export function Analytics() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('1M');
  const [activeTab, setActiveTab] = useState<TabType>('lots');

  const { data: performance, isLoading: loadingPerformance } = useQuery({
    queryKey: ['analytics', 'performance', period],
    queryFn: () => api.getPerformanceHistory(period),
    staleTime: 60000,
  });

  const { data: statistics, isLoading: loadingStats } = useQuery({
    queryKey: ['analytics', 'statistics'],
    queryFn: () => api.getTradeStatistics(),
    staleTime: 30000,
  });

  const { data: allocation, isLoading: loadingAllocation } = useQuery({
    queryKey: ['analytics', 'allocation'],
    queryFn: () => api.getAllocation(),
    staleTime: 30000,
  });

  const { data: gains, isLoading: loadingGains } = useQuery({
    queryKey: ['analytics', 'gains'],
    queryFn: () => api.getGainsSummary(),
    staleTime: 30000,
  });

  const { data: taxLots } = useQuery({
    queryKey: ['analytics', 'tax-lots'],
    queryFn: () => api.getOpenTaxLots(),
    staleTime: 30000,
    enabled: activeTab === 'lots',
  });

  const { data: lotSales } = useQuery({
    queryKey: ['analytics', 'lot-sales'],
    queryFn: () => api.getLotSales({ limit: 20 }),
    staleTime: 30000,
    enabled: activeTab === 'history',
  });

  const { data: dividends } = useQuery({
    queryKey: ['analytics', 'dividends'],
    queryFn: () => api.getDividends({ limit: 20 }),
    staleTime: 30000,
    enabled: activeTab === 'dividends',
  });

  const lastDataPoint = performance?.[performance.length - 1];
  const totalValue = lastDataPoint?.value ?? 0;
  const totalReturn = lastDataPoint?.change ?? 0;
  const totalReturnPercent = lastDataPoint?.changePercent ?? 0;

  const periods: AnalyticsPeriod[] = ['1W', '1M', '3M', 'YTD', '1Y', 'ALL'];

  return (
    <Layout>
      <div style={styles.container}>
        {/* Summary Bar */}
        <div style={styles.summaryBar}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Total Value</span>
            <span style={styles.summaryValue}>
              {formatCurrency(totalValue)}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Total Return</span>
            <span
              style={{
                ...styles.summaryValue,
                color: getValueColor(totalReturn),
              }}
            >
              {formatCurrency(totalReturn)} ({formatPercent(totalReturnPercent)})
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Win Rate</span>
            <span style={styles.summaryValue}>
              {statistics ? `${statistics.winRate.toFixed(1)}%` : '--'}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Sharpe Ratio</span>
            <span style={styles.summaryValue}>
              {statistics?.sharpeRatio?.toFixed(2) ?? '--'}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Max Drawdown</span>
            <span
              style={{
                ...styles.summaryValue,
                color: theme.colors.negative,
              }}
            >
              {statistics ? `-${statistics.maxDrawdown.toFixed(1)}%` : '--'}
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div style={styles.mainGrid}>
          {/* Left Column */}
          <div style={styles.leftColumn}>
            {/* Performance Chart */}
            <Widget
              title="Performance"
              headerAction={
                <div style={styles.periodSelector}>
                  {periods.map((p) => (
                    <button
                      key={p}
                      style={{
                        ...styles.periodButton,
                        ...(period === p ? styles.periodButtonActive : {}),
                      }}
                      onClick={() => setPeriod(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              }
            >
              <div style={styles.chartPlaceholder}>
                {loadingPerformance ? (
                  'Loading...'
                ) : performance && performance.length > 0 ? (
                  `Portfolio performance chart - ${performance.length} data points`
                ) : (
                  'No performance data available'
                )}
              </div>
            </Widget>

            {/* Trade Statistics */}
            <Widget title="Trade Statistics">
              {loadingStats ? (
                <div style={styles.loading}>Loading statistics...</div>
              ) : statistics ? (
                <div style={styles.statsGrid}>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Win Rate</div>
                    <div
                      style={{
                        ...styles.statValue,
                        color: getValueColor(statistics.winRate - 50),
                      }}
                    >
                      {statistics.winRate.toFixed(1)}%
                    </div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Avg Win</div>
                    <div
                      style={{
                        ...styles.statValue,
                        color: theme.colors.positive,
                      }}
                    >
                      {formatCurrency(statistics.avgWin)}
                    </div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Avg Loss</div>
                    <div
                      style={{
                        ...styles.statValue,
                        color: theme.colors.negative,
                      }}
                    >
                      {formatCurrency(statistics.avgLoss)}
                    </div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Profit Factor</div>
                    <div style={styles.statValue}>
                      {statistics.profitFactor === Infinity
                        ? '∞'
                        : statistics.profitFactor.toFixed(2)}
                    </div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Total Trades</div>
                    <div style={styles.statValue}>{statistics.totalTrades}</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Total Realized</div>
                    <div
                      style={{
                        ...styles.statValue,
                        color: getValueColor(statistics.totalRealized),
                      }}
                    >
                      {formatCurrency(statistics.totalRealized)}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.noData}>No trade statistics available</div>
              )}
            </Widget>
          </div>

          {/* Right Column */}
          <div style={styles.rightColumn}>
            {/* Allocation */}
            <Widget title="Allocation">
              {loadingAllocation ? (
                <div style={styles.loading}>Loading...</div>
              ) : allocation && allocation.length > 0 ? (
                <div style={styles.allocationList}>
                  {allocation.slice(0, 5).map((item) => (
                    <div key={item.symbol} style={styles.allocationItem}>
                      <span style={styles.allocationSymbol}>{item.symbol}</span>
                      <span
                        style={{
                          ...styles.allocationPercent,
                          color: getValueColor(item.unrealizedGain),
                        }}
                      >
                        {item.allocation.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.noData}>No positions</div>
              )}
            </Widget>

            {/* Gains Summary */}
            <Widget title="Gains Summary">
              {loadingGains ? (
                <div style={styles.loading}>Loading...</div>
              ) : gains ? (
                <div style={styles.gainsSummary}>
                  <div style={styles.gainsRow}>
                    <span style={{ color: theme.colors.textSecondary }}>
                      Realized P&L
                    </span>
                    <span
                      style={{
                        fontFamily: theme.typography.fontMono,
                        color: getValueColor(gains.realizedGain),
                      }}
                    >
                      {formatCurrency(gains.realizedGain)}
                    </span>
                  </div>
                  <div style={styles.gainsRow}>
                    <span style={{ color: theme.colors.textSecondary }}>
                      Unrealized P&L
                    </span>
                    <span
                      style={{
                        fontFamily: theme.typography.fontMono,
                        color: getValueColor(gains.unrealizedGain),
                      }}
                    >
                      {formatCurrency(gains.unrealizedGain)}
                    </span>
                  </div>
                  <div
                    style={{
                      ...styles.gainsRow,
                      backgroundColor: theme.colors.bgSecondary,
                    }}
                  >
                    <span
                      style={{
                        color: theme.colors.textPrimary,
                        fontWeight: theme.typography.semibold,
                      }}
                    >
                      Total
                    </span>
                    <span
                      style={{
                        fontFamily: theme.typography.fontMono,
                        fontWeight: theme.typography.bold,
                        color: getValueColor(gains.totalGain),
                      }}
                    >
                      {formatCurrency(gains.totalGain)}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={styles.noData}>No gains data</div>
              )}
            </Widget>
          </div>
        </div>

        {/* Bottom Tabbed Section */}
        <Widget title="Details">
          <div style={styles.tabBar}>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'lots' ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab('lots')}
            >
              Tax Lots
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'history' ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab('history')}
            >
              Trade History
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'dividends' ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab('dividends')}
            >
              Dividends
            </button>
          </div>

          {activeTab === 'lots' && (
            <TaxLotsTable lots={taxLots ?? []} />
          )}

          {activeTab === 'history' && (
            <TradeHistoryTable sales={lotSales ?? []} />
          )}

          {activeTab === 'dividends' && (
            <DividendsTable dividends={dividends ?? []} />
          )}
        </Widget>
      </div>
    </Layout>
  );
}

function TaxLotsTable({ lots }: { lots: OpenTaxLot[] }) {
  if (lots.length === 0) {
    return <div style={styles.noData}>No open tax lots</div>;
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Symbol</th>
          <th style={styles.th}>Quantity</th>
          <th style={styles.th}>Cost Basis</th>
          <th style={styles.th}>Acquired</th>
          <th style={styles.th}>Holding</th>
          <th style={styles.th}>Term</th>
        </tr>
      </thead>
      <tbody>
        {lots.map((lot) => (
          <tr key={lot.id}>
            <td style={{ ...styles.td, fontWeight: theme.typography.semibold }}>
              {lot.symbol}
            </td>
            <td style={styles.td}>{lot.remainingQuantity.toFixed(4)}</td>
            <td style={styles.td}>{formatCurrency(lot.costBasisPerShare)}</td>
            <td style={styles.td}>
              {new Date(lot.acquiredAt).toLocaleDateString()}
            </td>
            <td style={styles.td}>{lot.holdingDays} days</td>
            <td
              style={{
                ...styles.td,
                color: lot.isLongTerm
                  ? theme.colors.positive
                  : theme.colors.warning,
              }}
            >
              {lot.isLongTerm ? 'Long' : 'Short'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TradeHistoryTable({ sales }: { sales: LotSale[] }) {
  if (sales.length === 0) {
    return <div style={styles.noData}>No trade history</div>;
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Date</th>
          <th style={styles.th}>Symbol</th>
          <th style={styles.th}>Qty</th>
          <th style={styles.th}>Cost</th>
          <th style={styles.th}>Sale</th>
          <th style={styles.th}>Gain/Loss</th>
          <th style={styles.th}>Term</th>
        </tr>
      </thead>
      <tbody>
        {sales.map((sale) => (
          <tr key={sale.id}>
            <td style={styles.td}>
              {new Date(sale.soldAt).toLocaleDateString()}
            </td>
            <td style={{ ...styles.td, fontWeight: theme.typography.semibold }}>
              {sale.symbol}
            </td>
            <td style={styles.td}>{sale.quantitySold.toFixed(4)}</td>
            <td style={styles.td}>{formatCurrency(sale.costBasis)}</td>
            <td style={styles.td}>{formatCurrency(sale.proceeds)}</td>
            <td
              style={{
                ...styles.td,
                color: getValueColor(sale.realizedGain),
              }}
            >
              {formatCurrency(sale.realizedGain)}
            </td>
            <td
              style={{
                ...styles.td,
                color:
                  sale.gainType === 'long_term'
                    ? theme.colors.positive
                    : theme.colors.warning,
              }}
            >
              {sale.gainType === 'long_term' ? 'Long' : 'Short'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DividendsTable({ dividends }: { dividends: Dividend[] }) {
  if (dividends.length === 0) {
    return <div style={styles.noData}>No dividend history</div>;
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Pay Date</th>
          <th style={styles.th}>Symbol</th>
          <th style={styles.th}>Amount/Share</th>
          <th style={styles.th}>Shares</th>
          <th style={styles.th}>Total</th>
          <th style={styles.th}>Status</th>
        </tr>
      </thead>
      <tbody>
        {dividends.map((div) => (
          <tr key={div.id}>
            <td style={styles.td}>
              {new Date(div.payDate).toLocaleDateString()}
            </td>
            <td style={{ ...styles.td, fontWeight: theme.typography.semibold }}>
              {div.symbol}
            </td>
            <td style={styles.td}>${div.amount.toFixed(4)}</td>
            <td style={styles.td}>{div.quantity.toFixed(4)}</td>
            <td style={{ ...styles.td, color: theme.colors.positive }}>
              {formatCurrency(div.totalAmount)}
            </td>
            <td
              style={{
                ...styles.td,
                color:
                  div.status === 'paid'
                    ? theme.colors.positive
                    : theme.colors.warning,
              }}
            >
              {div.status === 'paid' ? 'Paid' : 'Pending'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
