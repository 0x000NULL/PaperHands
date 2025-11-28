import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import type { Candle } from '../../types';

interface OHLCVStatsProps {
  candles: Candle[] | undefined;
  isLoading: boolean;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderTop: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.bgTertiary,
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.textPrimary,
  },
};

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatVolume(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(0);
}

interface StatItemProps {
  label: string;
  value: string;
  color?: string;
}

function StatItem({ label, value, color }: StatItemProps) {
  return (
    <div style={styles.statItem}>
      <span style={styles.label}>{label}</span>
      <span style={{ ...styles.value, color: color || theme.colors.textPrimary }}>
        {value}
      </span>
    </div>
  );
}

export function OHLCVStats({ candles, isLoading }: OHLCVStatsProps) {
  if (isLoading || !candles || candles.length === 0) {
    return null;
  }

  const latest = candles[candles.length - 1];
  const first = candles[0];
  const periodChange = latest.close - first.open;
  const periodChangePercent = (periodChange / first.open) * 100;
  const highestHigh = Math.max(...candles.map((d) => d.high));
  const lowestLow = Math.min(...candles.map((d) => d.low));

  return (
    <div style={styles.container}>
      <StatItem label="Open" value={formatCurrency(latest.open)} />
      <StatItem label="High" value={formatCurrency(latest.high)} />
      <StatItem label="Low" value={formatCurrency(latest.low)} />
      <StatItem label="Close" value={formatCurrency(latest.close)} />
      <StatItem label="Volume" value={formatVolume(latest.volume)} />
      <StatItem
        label="Change"
        value={`${periodChange >= 0 ? '+' : ''}${periodChangePercent.toFixed(2)}%`}
        color={periodChange >= 0 ? theme.colors.positive : theme.colors.negative}
      />
      <StatItem label="Period High" value={formatCurrency(highestHigh)} />
      <StatItem label="Period Low" value={formatCurrency(lowestLow)} />
    </div>
  );
}
