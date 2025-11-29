import { useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { Widget } from '../components/dashboard/Widget';
import { theme } from '../theme/constants';
import { api } from '../api/client';
import type {
  PortfolioGreeksSummary,
  UnderlyingGreeks,
  ThetaProjection,
  DeltaExposure,
} from '../types';

type TabType = 'overview' | 'byUnderlying' | 'theta' | 'sensitivity';

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
  fullWidth: {
    gridColumn: '1 / -1',
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
  tabContainer: {
    display: 'flex',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.border}`,
    paddingBottom: theme.spacing.sm,
  },
  tab: {
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
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
    color: theme.colors.textPrimary,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.typography.sm,
  },
  th: {
    textAlign: 'left' as const,
    padding: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.border}`,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.medium,
    fontSize: theme.typography.xs,
    textTransform: 'uppercase' as const,
  },
  td: {
    padding: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.border}`,
    fontFamily: theme.typography.fontMono,
  },
  positive: {
    color: theme.colors.success,
  },
  negative: {
    color: theme.colors.error,
  },
  expirationCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
  },
  expirationDate: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
  },
  expirationDTE: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  expirationGreeks: {
    display: 'flex',
    gap: theme.spacing.lg,
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
  },
  greekLabel: {
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  chartPlaceholder: {
    height: '250px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
};

function formatGreek(value: number, decimals: number = 2): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(decimals);
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function GreeksSummaryBar({ summary }: { summary: PortfolioGreeksSummary }) {
  return (
    <div style={styles.summaryBar}>
      <div style={styles.summaryItem}>
        <span style={styles.summaryLabel}>Net Delta</span>
        <span
          style={{
            ...styles.summaryValue,
            color:
              summary.netDelta >= 0
                ? theme.colors.success
                : theme.colors.error,
          }}
        >
          {formatGreek(summary.netDelta)}
        </span>
        <span style={styles.summaryLabel}>share equiv.</span>
      </div>
      <div style={styles.summaryItem}>
        <span style={styles.summaryLabel}>Net Gamma</span>
        <span style={styles.summaryValue}>{formatGreek(summary.netGamma)}</span>
        <span style={styles.summaryLabel}>per $1 move</span>
      </div>
      <div style={styles.summaryItem}>
        <span style={styles.summaryLabel}>Daily Theta</span>
        <span
          style={{
            ...styles.summaryValue,
            color:
              summary.netTheta >= 0
                ? theme.colors.success
                : theme.colors.error,
          }}
        >
          {formatCurrency(summary.netTheta)}
        </span>
        <span style={styles.summaryLabel}>per day</span>
      </div>
      <div style={styles.summaryItem}>
        <span style={styles.summaryLabel}>Net Vega</span>
        <span style={styles.summaryValue}>{formatGreek(summary.netVega)}</span>
        <span style={styles.summaryLabel}>per 1% IV</span>
      </div>
      <div style={styles.summaryItem}>
        <span style={styles.summaryLabel}>Notional</span>
        <span style={styles.summaryValue}>
          {formatCurrency(summary.notionalExposure)}
        </span>
        <span style={styles.summaryLabel}>delta exposure</span>
      </div>
    </div>
  );
}

function GreeksByUnderlyingTable({
  underlyings,
}: {
  underlyings: UnderlyingGreeks[];
}) {
  if (underlyings.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>No option positions</p>
      </div>
    );
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Underlying</th>
          <th style={styles.th}>Price</th>
          <th style={styles.th}>Positions</th>
          <th style={styles.th}>Delta</th>
          <th style={styles.th}>Gamma</th>
          <th style={styles.th}>Theta</th>
          <th style={styles.th}>Vega</th>
        </tr>
      </thead>
      <tbody>
        {underlyings.map((u) => (
          <tr key={u.underlyingSymbol}>
            <td style={styles.td}>
              <strong>{u.underlyingSymbol}</strong>
              {u.stockPosition && (
                <div style={{ fontSize: theme.typography.xs, color: theme.colors.textSecondary }}>
                  {u.stockPosition.quantity} shares
                </div>
              )}
            </td>
            <td style={styles.td}>${u.underlyingPrice.toFixed(2)}</td>
            <td style={styles.td}>{u.positions.length}</td>
            <td
              style={{
                ...styles.td,
                color:
                  u.totalDelta >= 0
                    ? theme.colors.success
                    : theme.colors.error,
              }}
            >
              {formatGreek(u.totalDelta)}
            </td>
            <td style={styles.td}>{formatGreek(u.totalGamma)}</td>
            <td
              style={{
                ...styles.td,
                color:
                  u.totalTheta >= 0
                    ? theme.colors.success
                    : theme.colors.error,
              }}
            >
              {formatCurrency(u.totalTheta)}
            </td>
            <td style={styles.td}>{formatGreek(u.totalVega)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExpirationBuckets({
  buckets,
}: {
  buckets: PortfolioGreeksSummary['positionsByExpiration'];
}) {
  if (buckets.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>No upcoming expirations</p>
      </div>
    );
  }

  return (
    <div>
      {buckets.map((bucket) => (
        <div key={bucket.expirationDate} style={styles.expirationCard}>
          <div>
            <div style={styles.expirationDate}>{bucket.expirationDate}</div>
            <div style={styles.expirationDTE}>
              {bucket.daysToExpiration} DTE | {bucket.positionCount} position
              {bucket.positionCount !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={styles.expirationGreeks}>
            <span>
              <span style={styles.greekLabel}>Delta:</span>
              <span
                style={{
                  color:
                    bucket.netDelta >= 0
                      ? theme.colors.success
                      : theme.colors.error,
                }}
              >
                {formatGreek(bucket.netDelta)}
              </span>
            </span>
            <span>
              <span style={styles.greekLabel}>Theta:</span>
              <span
                style={{
                  color:
                    bucket.netTheta >= 0
                      ? theme.colors.success
                      : theme.colors.error,
                }}
              >
                {formatCurrency(bucket.netTheta)}
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ThetaProjectionChart({
  projections,
}: {
  projections: ThetaProjection[];
}) {
  if (projections.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>No theta data available</p>
      </div>
    );
  }

  // Simple text-based representation
  const maxDecay = Math.max(...projections.map((p) => p.cumulativeDecay));
  const total30Day = projections[projections.length - 1]?.cumulativeDecay || 0;

  return (
    <div>
      <div style={{ marginBottom: theme.spacing.md }}>
        <span style={styles.summaryLabel}>30-Day Projected Decay: </span>
        <span
          style={{
            ...styles.summaryValue,
            fontSize: theme.typography.lg,
            color: theme.colors.error,
          }}
        >
          {formatCurrency(total30Day)}
        </span>
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Daily Decay</th>
            <th style={styles.th}>Cumulative</th>
            <th style={styles.th}>Positions</th>
          </tr>
        </thead>
        <tbody>
          {projections.slice(0, 7).map((p) => (
            <tr key={p.date}>
              <td style={styles.td}>{p.date}</td>
              <td style={{ ...styles.td, color: theme.colors.error }}>
                -{formatCurrency(p.dailyDecay)}
              </td>
              <td style={styles.td}>
                -{formatCurrency(p.cumulativeDecay)}
                <span
                  style={{
                    marginLeft: theme.spacing.xs,
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.xs,
                  }}
                >
                  ({maxDecay > 0 ? ((p.cumulativeDecay / maxDecay) * 100).toFixed(0) : 0}%)
                </span>
              </td>
              <td style={styles.td}>{p.remainingPositions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeltaExposureTable({ exposures }: { exposures: DeltaExposure[] }) {
  if (exposures.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p>No delta exposure data</p>
      </div>
    );
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Price Change</th>
          <th style={styles.th}>Portfolio P&L</th>
          <th style={styles.th}>Delta Exposure</th>
        </tr>
      </thead>
      <tbody>
        {exposures.map((e, i) => (
          <tr
            key={i}
            style={
              e.percentChange === 0
                ? { backgroundColor: theme.colors.bgTertiary }
                : {}
            }
          >
            <td style={styles.td}>
              <span
                style={{
                  color:
                    e.percentChange > 0
                      ? theme.colors.success
                      : e.percentChange < 0
                        ? theme.colors.error
                        : theme.colors.textPrimary,
                }}
              >
                {e.percentChange > 0 ? '+' : ''}
                {e.percentChange}%
              </span>
            </td>
            <td
              style={{
                ...styles.td,
                color:
                  e.portfolioPnL >= 0
                    ? theme.colors.success
                    : theme.colors.error,
              }}
            >
              {e.portfolioPnL >= 0 ? '+' : ''}
              {formatCurrency(e.portfolioPnL)}
            </td>
            <td style={styles.td}>{formatCurrency(e.deltaDollars)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Greeks() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['portfolio-greeks'],
    queryFn: api.getPortfolioGreeks,
    refetchInterval: 30000,
  });

  const { data: underlyings, isLoading: underlyingsLoading } = useQuery({
    queryKey: ['greeks-by-underlying'],
    queryFn: api.getGreeksByUnderlying,
    enabled: activeTab === 'byUnderlying' || activeTab === 'overview',
  });

  const { data: thetaProjection, isLoading: thetaLoading } = useQuery({
    queryKey: ['theta-projection'],
    queryFn: () => api.getThetaDecayProjection(30),
    enabled: activeTab === 'theta' || activeTab === 'overview',
  });

  const { data: deltaExposure, isLoading: deltaLoading } = useQuery({
    queryKey: ['delta-exposure'],
    queryFn: () => api.getDeltaExposure(),
    enabled: activeTab === 'sensitivity' || activeTab === 'overview',
  });

  const isLoading =
    summaryLoading || underlyingsLoading || thetaLoading || deltaLoading;

  if (summaryError) {
    return (
      <Layout>
        <div style={styles.container}>
          <div style={styles.emptyState}>
            <p>Error loading Greeks data. Please try again.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={styles.container}>
        {/* Summary Bar */}
        {summary && <GreeksSummaryBar summary={summary} />}

        {/* Tabs */}
        <div style={styles.tabContainer}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'overview' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'byUnderlying' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('byUnderlying')}
          >
            By Underlying
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'theta' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('theta')}
          >
            Theta Decay
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'sensitivity' ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab('sensitivity')}
          >
            Sensitivity
          </button>
        </div>

        {/* Main Content */}
        {activeTab === 'overview' && (
          <div style={styles.mainGrid}>
            <div style={styles.leftColumn}>
              <Widget title="Greeks by Underlying">
                {isLoading ? (
                  <div style={styles.emptyState}>Loading...</div>
                ) : (
                  <GreeksByUnderlyingTable underlyings={underlyings || []} />
                )}
              </Widget>

              <Widget title="Delta Exposure Analysis">
                {isLoading ? (
                  <div style={styles.emptyState}>Loading...</div>
                ) : (
                  <DeltaExposureTable exposures={deltaExposure || []} />
                )}
              </Widget>
            </div>

            <div style={styles.rightColumn}>
              <Widget title="Expirations">
                {summary && (
                  <ExpirationBuckets
                    buckets={summary.positionsByExpiration || []}
                  />
                )}
              </Widget>

              <Widget title="7-Day Theta Decay">
                {isLoading ? (
                  <div style={styles.emptyState}>Loading...</div>
                ) : (
                  <ThetaProjectionChart projections={thetaProjection || []} />
                )}
              </Widget>
            </div>
          </div>
        )}

        {activeTab === 'byUnderlying' && (
          <Widget title="Greeks by Underlying">
            {isLoading ? (
              <div style={styles.emptyState}>Loading...</div>
            ) : (
              <GreeksByUnderlyingTable underlyings={underlyings || []} />
            )}
          </Widget>
        )}

        {activeTab === 'theta' && (
          <Widget title="30-Day Theta Decay Projection">
            {isLoading ? (
              <div style={styles.emptyState}>Loading...</div>
            ) : (
              <ThetaProjectionChart projections={thetaProjection || []} />
            )}
          </Widget>
        )}

        {activeTab === 'sensitivity' && (
          <Widget title="Delta Exposure at Price Levels">
            {isLoading ? (
              <div style={styles.emptyState}>Loading...</div>
            ) : (
              <DeltaExposureTable exposures={deltaExposure || []} />
            )}
          </Widget>
        )}
      </div>
    </Layout>
  );
}
