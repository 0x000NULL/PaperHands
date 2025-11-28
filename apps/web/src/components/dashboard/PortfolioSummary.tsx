import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { usePortfolio } from '../../hooks';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
  },
  stat: {
    flex: 1,
    textAlign: 'center',
  },
  statDivider: {
    flex: 1,
    textAlign: 'center',
    borderLeft: `1px solid ${theme.colors.border}`,
    paddingLeft: theme.spacing.lg,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: theme.spacing.xs,
  },
  value: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography['2xl'],
    fontWeight: theme.typography.bold,
  },
  valueAccent: {
    color: theme.colors.accent,
    fontSize: theme.typography['2xl'],
    fontWeight: theme.typography.bold,
    textShadow: `0 0 20px ${theme.colors.accentGlow}`,
  },
  loading: {
    color: theme.colors.textSecondary,
    padding: theme.spacing.lg,
    textAlign: 'center',
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export function PortfolioSummary() {
  const { data: portfolio, isLoading } = usePortfolio();

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading portfolio...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.stat}>
        <div style={styles.label}>Portfolio Value</div>
        <div style={styles.valueAccent}>
          {formatCurrency(portfolio?.totalValue ?? 0)}
        </div>
      </div>
      <div style={styles.statDivider}>
        <div style={styles.label}>Cash Balance</div>
        <div style={styles.value}>
          {formatCurrency(portfolio?.cashBalance ?? 0)}
        </div>
      </div>
      <div style={styles.statDivider}>
        <div style={styles.label}>Open Positions</div>
        <div style={styles.value}>{portfolio?.positions.length ?? 0}</div>
      </div>
    </div>
  );
}
