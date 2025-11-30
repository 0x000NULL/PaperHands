import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useVolatilityMetrics } from '../../hooks';

interface IVGaugeProps {
  symbol: string;
  compact?: boolean;
}

// IV Rank color scale
const getIVRankColor = (rank: number | null): string => {
  if (rank === null) return '#6B7280'; // gray
  if (rank <= 20) return '#3B82F6'; // blue - very low
  if (rank <= 40) return '#10B981'; // green - low
  if (rank <= 60) return '#F59E0B'; // yellow - moderate
  if (rank <= 80) return '#F97316'; // orange - high
  return '#EF4444'; // red - very high
};

const getIVRankLabel = (rank: number | null): string => {
  if (rank === null) return 'N/A';
  if (rank <= 20) return 'Very Low';
  if (rank <= 40) return 'Low';
  if (rank <= 60) return 'Moderate';
  if (rank <= 80) return 'High';
  return 'Very High';
};

const formatPercent = (value: number | null): string => {
  if (value === null) return '-';
  return `${(value * 100).toFixed(1)}%`;
};

const styles: Record<string, CSSProperties> = {
  container: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: 0,
  },
  ivRankBadge: {
    padding: '2px 8px',
    borderRadius: theme.radius.full,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.medium,
    color: '#FFFFFF',
  },
  gaugeContainer: {
    position: 'relative',
    height: '24px',
    marginBottom: theme.spacing.md,
  },
  gaugeTrack: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    left: 0,
    right: 0,
    height: '8px',
    borderRadius: theme.radius.full,
    background: 'linear-gradient(to right, #3B82F6 0%, #10B981 25%, #F59E0B 50%, #F97316 75%, #EF4444 100%)',
    opacity: 0.3,
  },
  gaugeFill: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    left: 0,
    height: '8px',
    borderRadius: theme.radius.full,
    transition: 'width 0.3s ease',
  },
  gaugeMarker: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    transition: 'left 0.3s ease',
  },
  gaugeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
    marginTop: '4px',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: theme.spacing.sm,
  },
  stat: {
    textAlign: 'center',
  },
  statLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
    marginBottom: '2px',
  },
  statValue: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.textPrimary,
  },
  loading: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    padding: theme.spacing.md,
  },
  noData: {
    textAlign: 'center',
    color: theme.colors.textTertiary,
    fontSize: theme.typography.sm,
    padding: theme.spacing.sm,
  },
  spreadPositive: {
    color: '#EF4444', // red - IV premium (elevated)
  },
  spreadNegative: {
    color: '#10B981', // green - IV discount
  },
};

export function IVGauge({ symbol, compact = false }: IVGaugeProps) {
  const { data: metrics, isLoading, isError } = useVolatilityMetrics(symbol, !!symbol);

  if (!symbol) {
    return null;
  }

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading volatility data...</div>
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div style={styles.container}>
        <div style={styles.noData}>Volatility data unavailable</div>
      </div>
    );
  }

  const ivRank = metrics.ivRank;
  const ivRankColor = getIVRankColor(ivRank);
  const ivRankLabel = getIVRankLabel(ivRank);
  const gaugePosition = ivRank !== null ? Math.min(100, Math.max(0, ivRank)) : 0;

  // Determine IV-HV spread color
  const spreadStyle: CSSProperties = {
    ...styles.statValue,
    ...(metrics.ivHvSpread !== null && metrics.ivHvSpread > 0
      ? styles.spreadPositive
      : styles.spreadNegative),
  };

  if (compact) {
    return (
      <div style={{ ...styles.container, padding: theme.spacing.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <span style={{ ...styles.title, margin: 0 }}>IV Rank</span>
          <span
            style={{
              ...styles.ivRankBadge,
              backgroundColor: ivRankColor,
            }}
          >
            {ivRank !== null ? `${ivRank}%` : 'N/A'}
          </span>
          <span style={{ fontSize: theme.typography.xs, color: theme.colors.textTertiary }}>
            ({ivRankLabel})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}>Implied Volatility</h4>
        <span
          style={{
            ...styles.ivRankBadge,
            backgroundColor: ivRankColor,
          }}
        >
          {ivRankLabel}
        </span>
      </div>

      {/* IV Rank Gauge */}
      <div style={styles.gaugeContainer}>
        <div style={styles.gaugeTrack} />
        <div
          style={{
            ...styles.gaugeFill,
            width: `${gaugePosition}%`,
            background: `linear-gradient(to right, #3B82F6, ${ivRankColor})`,
          }}
        />
        <div
          style={{
            ...styles.gaugeMarker,
            left: `${gaugePosition}%`,
            backgroundColor: ivRankColor,
          }}
        />
      </div>
      <div style={styles.gaugeLabels}>
        <span>0</span>
        <span>IV Rank: {ivRank !== null ? `${ivRank}%` : 'N/A'}</span>
        <span>100</span>
      </div>

      {/* Stats */}
      <div style={{ ...styles.statsRow, marginTop: theme.spacing.md }}>
        <div style={styles.stat}>
          <div style={styles.statLabel}>Current IV</div>
          <div style={styles.statValue}>{formatPercent(metrics.currentIV)}</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statLabel}>HV (20d)</div>
          <div style={styles.statValue}>{formatPercent(metrics.hv20)}</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statLabel}>IV-HV Spread</div>
          <div style={spreadStyle}>
            {metrics.ivHvSpread !== null
              ? `${metrics.ivHvSpread > 0 ? '+' : ''}${(metrics.ivHvSpread * 100).toFixed(1)}%`
              : '-'}
          </div>
        </div>
      </div>

      {/* 52-Week Range */}
      <div style={{ ...styles.statsRow, marginTop: theme.spacing.sm }}>
        <div style={styles.stat}>
          <div style={styles.statLabel}>52W Low</div>
          <div style={styles.statValue}>{formatPercent(metrics.iv52WeekLow)}</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statLabel}>IV Percentile</div>
          <div style={styles.statValue}>
            {metrics.ivPercentile !== null ? `${metrics.ivPercentile}%` : '-'}
          </div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statLabel}>52W High</div>
          <div style={styles.statValue}>{formatPercent(metrics.iv52WeekHigh)}</div>
        </div>
      </div>
    </div>
  );
}
