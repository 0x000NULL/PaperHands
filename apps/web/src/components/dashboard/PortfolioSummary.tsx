import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useRealtimePnL } from '../../hooks/useRealtimePnL';

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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
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
  pnlPositive: {
    color: theme.colors.positive,
    fontSize: theme.typography['2xl'],
    fontWeight: theme.typography.bold,
  },
  pnlNegative: {
    color: theme.colors.negative,
    fontSize: theme.typography['2xl'],
    fontWeight: theme.typography.bold,
  },
  pnlPercent: {
    fontSize: theme.typography.sm,
    marginTop: theme.spacing.xs,
  },
  streamingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: theme.colors.positive,
    display: 'inline-block',
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
  const portfolio = useRealtimePnL();

  if (portfolio.isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading portfolio...</div>
      </div>
    );
  }

  const pnlStyle =
    portfolio.totalGainLoss >= 0 ? styles.pnlPositive : styles.pnlNegative;
  const pnlSign = portfolio.totalGainLoss >= 0 ? '+' : '';

  return (
    <div style={styles.container}>
      <div style={styles.stat}>
        <div style={styles.label}>
          Portfolio Value
          {portfolio.hasStreamingData && <span style={styles.streamingDot} />}
        </div>
        <div style={styles.valueAccent}>
          {formatCurrency(portfolio.totalValue)}
        </div>
      </div>
      <div style={styles.statDivider}>
        <div style={styles.label}>Day P&L</div>
        <div style={pnlStyle}>
          {pnlSign}
          {formatCurrency(portfolio.totalGainLoss)}
        </div>
        <div
          style={{
            ...styles.pnlPercent,
            color:
              portfolio.totalGainLoss >= 0
                ? theme.colors.positive
                : theme.colors.negative,
          }}
        >
          ({pnlSign}
          {portfolio.totalGainLossPercent.toFixed(2)}%)
        </div>
      </div>
      <div style={styles.statDivider}>
        <div style={styles.label}>Cash Balance</div>
        <div style={styles.value}>{formatCurrency(portfolio.cashBalance)}</div>
      </div>
      <div style={styles.statDivider}>
        <div style={styles.label}>Open Positions</div>
        <div style={styles.value}>{portfolio.positions.length}</div>
      </div>
    </div>
  );
}
