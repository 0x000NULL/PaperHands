import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { theme } from '../../theme/constants';
import { useVolatilityMetrics, useChartTheme, getGaugeColor } from '../../hooks';

interface IVGaugeProps {
  symbol: string;
  compact?: boolean;
}

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

const baseStyles: Record<string, CSSProperties> = {
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
    color: theme.colors.textPrimary,
  },
  gaugeContainer: {
    position: 'relative',
    height: '24px',
    marginBottom: theme.spacing.md,
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
    border: `2px solid ${theme.colors.textPrimary}`,
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
};

export function IVGauge({ symbol, compact = false }: IVGaugeProps) {
  const { data: metrics, isLoading, isError } = useVolatilityMetrics(symbol, !!symbol);
  const chartColors = useChartTheme();

  // Build gradient string from theme colors
  const gaugeGradient = useMemo(
    () =>
      `linear-gradient(to right, ${chartColors.gaugeVeryLow} 0%, ${chartColors.gaugeLow} 25%, ${chartColors.gaugeModerate} 50%, ${chartColors.gaugeHigh} 75%, ${chartColors.gaugeVeryHigh} 100%)`,
    [chartColors]
  );

  // Dynamic styles that depend on theme colors
  const gaugeTrackStyle: CSSProperties = useMemo(
    () => ({
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      left: 0,
      right: 0,
      height: '8px',
      borderRadius: theme.radius.full,
      background: gaugeGradient,
      opacity: 0.3,
    }),
    [gaugeGradient]
  );

  if (!symbol) {
    return null;
  }

  if (isLoading) {
    return (
      <div style={baseStyles.container}>
        <div style={baseStyles.loading}>Loading volatility data...</div>
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div style={baseStyles.container}>
        <div style={baseStyles.noData}>Volatility data unavailable</div>
      </div>
    );
  }

  const ivRank = metrics.ivRank;
  const ivRankColor = getGaugeColor(ivRank, chartColors);
  const ivRankLabel = getIVRankLabel(ivRank);
  const gaugePosition = ivRank !== null ? Math.min(100, Math.max(0, ivRank)) : 0;

  // Determine IV-HV spread color (positive = elevated IV = red/high, negative = IV discount = green/low)
  const spreadStyle: CSSProperties = {
    ...baseStyles.statValue,
    color:
      metrics.ivHvSpread !== null && metrics.ivHvSpread > 0
        ? chartColors.gaugeVeryHigh
        : chartColors.gaugeLow,
  };

  if (compact) {
    return (
      <div style={{ ...baseStyles.container, padding: theme.spacing.sm }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
          <span style={{ ...baseStyles.title, margin: 0 }}>IV Rank</span>
          <span
            style={{
              ...baseStyles.ivRankBadge,
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
    <div style={baseStyles.container}>
      <div style={baseStyles.header}>
        <h4 style={baseStyles.title}>Implied Volatility</h4>
        <span
          style={{
            ...baseStyles.ivRankBadge,
            backgroundColor: ivRankColor,
          }}
        >
          {ivRankLabel}
        </span>
      </div>

      {/* IV Rank Gauge */}
      <div style={baseStyles.gaugeContainer}>
        <div style={gaugeTrackStyle} />
        <div
          style={{
            ...baseStyles.gaugeFill,
            width: `${gaugePosition}%`,
            background: `linear-gradient(to right, ${chartColors.gaugeVeryLow}, ${ivRankColor})`,
          }}
        />
        <div
          style={{
            ...baseStyles.gaugeMarker,
            left: `${gaugePosition}%`,
            backgroundColor: ivRankColor,
          }}
        />
      </div>
      <div style={baseStyles.gaugeLabels}>
        <span>0</span>
        <span>IV Rank: {ivRank !== null ? `${ivRank}%` : 'N/A'}</span>
        <span>100</span>
      </div>

      {/* Stats */}
      <div style={{ ...baseStyles.statsRow, marginTop: theme.spacing.md }}>
        <div style={baseStyles.stat}>
          <div style={baseStyles.statLabel}>Current IV</div>
          <div style={baseStyles.statValue}>{formatPercent(metrics.currentIV)}</div>
        </div>
        <div style={baseStyles.stat}>
          <div style={baseStyles.statLabel}>HV (20d)</div>
          <div style={baseStyles.statValue}>{formatPercent(metrics.hv20)}</div>
        </div>
        <div style={baseStyles.stat}>
          <div style={baseStyles.statLabel}>IV-HV Spread</div>
          <div style={spreadStyle}>
            {metrics.ivHvSpread !== null
              ? `${metrics.ivHvSpread > 0 ? '+' : ''}${(metrics.ivHvSpread * 100).toFixed(1)}%`
              : '-'}
          </div>
        </div>
      </div>

      {/* 52-Week Range */}
      <div style={{ ...baseStyles.statsRow, marginTop: theme.spacing.sm }}>
        <div style={baseStyles.stat}>
          <div style={baseStyles.statLabel}>52W Low</div>
          <div style={baseStyles.statValue}>{formatPercent(metrics.iv52WeekLow)}</div>
        </div>
        <div style={baseStyles.stat}>
          <div style={baseStyles.statLabel}>IV Percentile</div>
          <div style={baseStyles.statValue}>
            {metrics.ivPercentile !== null ? `${metrics.ivPercentile}%` : '-'}
          </div>
        </div>
        <div style={baseStyles.stat}>
          <div style={baseStyles.statLabel}>52W High</div>
          <div style={baseStyles.statValue}>{formatPercent(metrics.iv52WeekHigh)}</div>
        </div>
      </div>
    </div>
  );
}
