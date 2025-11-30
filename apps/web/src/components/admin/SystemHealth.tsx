import { type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useSystemHealth, useSystemStats, useScheduledJobs, useApiUsage } from '../../hooks/useAdmin';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: theme.spacing.md,
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
  healthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing.md,
  },
  healthCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  healthIndicator: {
    width: 12,
    height: 12,
    borderRadius: '50%',
  },
  healthUp: {
    backgroundColor: theme.colors.positive,
  },
  healthDown: {
    backgroundColor: theme.colors.negative,
  },
  healthInfo: {
    flex: 1,
  },
  healthName: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.textPrimary,
  },
  healthStatus: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  jobsTable: {
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
  },
  typeBadge: {
    display: 'inline-block',
    padding: `2px ${theme.spacing.xs}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    backgroundColor: theme.colors.bgSecondary,
    color: theme.colors.textSecondary,
  },
  runningBadge: {
    display: 'inline-block',
    padding: `2px ${theme.spacing.xs}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
  },
  runningYes: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: theme.colors.positive,
  },
  runningNo: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    color: theme.colors.textSecondary,
  },
  loading: {
    textAlign: 'center',
    padding: theme.spacing.xl,
    color: theme.colors.textSecondary,
  },
  timestamp: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  apiTypeBadge: {
    display: 'inline-block',
    padding: `4px ${theme.spacing.sm}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase',
  },
  productionBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: theme.colors.positive,
  },
  sandboxBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    color: theme.colors.warning,
  },
  endpointList: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  endpointRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: `${theme.spacing.xs} 0`,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    marginTop: theme.spacing.xs,
  },
  progressBar: {
    height: '100%',
    borderRadius: theme.radius.sm,
    transition: 'width 0.3s ease',
  },
  quotaText: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  apiCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  apiCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  apiName: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
  },
};

export function SystemHealth() {
  const { data: health, isLoading: healthLoading } = useSystemHealth();
  const { data: stats, isLoading: statsLoading } = useSystemStats();
  const { data: jobs, isLoading: jobsLoading } = useScheduledJobs();
  const { data: apiUsage, isLoading: apiUsageLoading } = useApiUsage();

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('en-US').format(value);

  const formatDate = (dateStr?: string) =>
    dateStr
      ? new Date(dateStr).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-';

  const getQuotaColor = (percent: number) => {
    if (percent >= 90) return theme.colors.negative;
    if (percent >= 70) return theme.colors.warning;
    return theme.colors.positive;
  };

  if (healthLoading || statsLoading) {
    return <div style={styles.loading}>Loading system health...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Platform Statistics */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Platform Statistics</h3>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {formatNumber(stats?.totalUsers ?? 0)}
            </div>
            <div style={styles.statLabel}>Total Users</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {formatNumber(stats?.activeUsers24h ?? 0)}
            </div>
            <div style={styles.statLabel}>Active (24h)</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {formatNumber(stats?.totalOrders ?? 0)}
            </div>
            <div style={styles.statLabel}>Total Orders</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {formatNumber(stats?.totalPositions ?? 0)}
            </div>
            <div style={styles.statLabel}>Open Positions</div>
          </div>
        </div>
        <div style={{ ...styles.statsGrid, marginTop: theme.spacing.md }}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {formatNumber(stats?.adminCount ?? 0)}
            </div>
            <div style={styles.statLabel}>Admins</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {formatNumber(stats?.superAdminCount ?? 0)}
            </div>
            <div style={styles.statLabel}>Super Admins</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {formatNumber(stats?.disabledUsers ?? 0)}
            </div>
            <div style={styles.statLabel}>Disabled Users</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>
              {formatNumber(stats?.pendingOrders ?? 0)}
            </div>
            <div style={styles.statLabel}>Pending Orders</div>
          </div>
        </div>
      </div>

      {/* Service Health */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Service Health</h3>
        <div style={styles.healthGrid}>
          <div style={styles.healthCard}>
            <div
              style={{
                ...styles.healthIndicator,
                ...(health?.database.status === 'up'
                  ? styles.healthUp
                  : styles.healthDown),
              }}
            />
            <div style={styles.healthInfo}>
              <div style={styles.healthName}>Database (PostgreSQL)</div>
              <div style={styles.healthStatus}>
                {health?.database.status === 'up'
                  ? 'Connected'
                  : health?.database.message ?? 'Disconnected'}
              </div>
            </div>
          </div>
          <div style={styles.healthCard}>
            <div
              style={{
                ...styles.healthIndicator,
                ...(health?.redis.status === 'up'
                  ? styles.healthUp
                  : styles.healthDown),
              }}
            />
            <div style={styles.healthInfo}>
              <div style={styles.healthName}>Cache (Redis/Valkey)</div>
              <div style={styles.healthStatus}>
                {health?.redis.status === 'up'
                  ? 'Connected'
                  : health?.redis.message ?? 'Disconnected'}
              </div>
            </div>
          </div>
        </div>
        {health?.timestamp && (
          <div style={styles.timestamp}>
            Last checked: {formatDate(health.timestamp)}
          </div>
        )}
      </div>

      {/* API Usage */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>API Usage & Quotas</h3>
        {apiUsageLoading ? (
          <div style={styles.loading}>Loading API usage...</div>
        ) : apiUsage ? (
          <>
            {/* Tradier API */}
            <div style={styles.apiCard}>
              <div style={styles.apiCardHeader}>
                <span style={styles.apiName}>Tradier API</span>
                {apiUsage.tradier.apiType && (
                  <span
                    style={{
                      ...styles.apiTypeBadge,
                      ...(apiUsage.tradier.apiType === 'production'
                        ? styles.productionBadge
                        : styles.sandboxBadge),
                    }}
                  >
                    {apiUsage.tradier.apiType}
                  </span>
                )}
              </div>
              <div style={styles.progressBarContainer}>
                <div
                  style={{
                    ...styles.progressBar,
                    width: `${apiUsage.tradier.quotaUsedPercent}%`,
                    backgroundColor: getQuotaColor(apiUsage.tradier.quotaUsedPercent),
                  }}
                />
              </div>
              <div style={styles.quotaText}>
                <span>{formatNumber(apiUsage.tradier.callsToday)} / {formatNumber(apiUsage.tradier.dailyQuota)} calls today</span>
                <span>{apiUsage.tradier.quotaUsedPercent.toFixed(1)}%</span>
              </div>
              <div style={{ ...styles.statsGrid, marginTop: theme.spacing.sm, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{formatNumber(apiUsage.tradier.totalCalls)}</div>
                  <div style={styles.statLabel}>Total (Session)</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{Object.keys(apiUsage.tradier.callsByEndpoint).length}</div>
                  <div style={styles.statLabel}>Endpoints Used</div>
                </div>
              </div>
              {Object.keys(apiUsage.tradier.callsByEndpoint).length > 0 && (
                <div style={styles.endpointList}>
                  <div style={{ fontWeight: theme.typography.medium, marginBottom: theme.spacing.xs }}>
                    Top Endpoints:
                  </div>
                  {Object.entries(apiUsage.tradier.callsByEndpoint)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([endpoint, count]) => (
                      <div key={endpoint} style={styles.endpointRow}>
                        <span>{endpoint}</span>
                        <span>{formatNumber(count)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Finnhub API */}
            <div style={styles.apiCard}>
              <div style={styles.apiCardHeader}>
                <span style={styles.apiName}>Finnhub API</span>
              </div>
              <div style={styles.progressBarContainer}>
                <div
                  style={{
                    ...styles.progressBar,
                    width: `${apiUsage.finnhub.quotaUsedPercent}%`,
                    backgroundColor: getQuotaColor(apiUsage.finnhub.quotaUsedPercent),
                  }}
                />
              </div>
              <div style={styles.quotaText}>
                <span>{formatNumber(apiUsage.finnhub.callsToday)} / {formatNumber(apiUsage.finnhub.dailyQuota)} calls today</span>
                <span>{apiUsage.finnhub.quotaUsedPercent.toFixed(1)}%</span>
              </div>
              <div style={{ ...styles.statsGrid, marginTop: theme.spacing.sm, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{formatNumber(apiUsage.finnhub.totalCalls)}</div>
                  <div style={styles.statLabel}>Total (Session)</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{Object.keys(apiUsage.finnhub.callsByEndpoint).length}</div>
                  <div style={styles.statLabel}>Endpoints Used</div>
                </div>
              </div>
              {Object.keys(apiUsage.finnhub.callsByEndpoint).length > 0 && (
                <div style={styles.endpointList}>
                  <div style={{ fontWeight: theme.typography.medium, marginBottom: theme.spacing.xs }}>
                    Top Endpoints:
                  </div>
                  {Object.entries(apiUsage.finnhub.callsByEndpoint)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([endpoint, count]) => (
                      <div key={endpoint} style={styles.endpointRow}>
                        <span>{endpoint}</span>
                        <span>{formatNumber(count)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={styles.loading}>No API usage data available</div>
        )}
      </div>

      {/* Scheduled Jobs */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Scheduled Jobs</h3>
        {jobsLoading ? (
          <div style={styles.loading}>Loading jobs...</div>
        ) : jobs && jobs.length > 0 ? (
          <table style={styles.jobsTable}>
            <thead>
              <tr>
                <th style={styles.th}>Job Name</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Next Run</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.name}>
                  <td style={styles.td}>{job.name}</td>
                  <td style={styles.td}>
                    <span style={styles.typeBadge}>{job.type}</span>
                  </td>
                  <td style={styles.td}>{formatDate(job.nextRun)}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.runningBadge,
                        ...(job.isRunning ? styles.runningYes : styles.runningNo),
                      }}
                    >
                      {job.isRunning ? 'Running' : 'Idle'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={styles.loading}>No scheduled jobs found</div>
        )}
      </div>
    </div>
  );
}
