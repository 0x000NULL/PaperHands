import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useRealtimePnL } from '../../hooks/useRealtimePnL';
import { useIsDesktop } from '../../hooks/useMediaQuery';

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
  // Mobile styles
  containerMobile: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
  },
  statMobile: {
    textAlign: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
  },
  labelMobile: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: theme.spacing.xs,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  valueMobile: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    fontFamily: theme.typography.fontMono,
  },
  valueAccentMobile: {
    color: theme.colors.accent,
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    fontFamily: theme.typography.fontMono,
  },
  pnlPositiveMobile: {
    color: theme.colors.positive,
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    fontFamily: theme.typography.fontMono,
  },
  pnlNegativeMobile: {
    color: theme.colors.negative,
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    fontFamily: theme.typography.fontMono,
  },
  pnlPercentMobile: {
    fontSize: theme.typography.xs,
    marginTop: '2px',
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
  const isDesktop = useIsDesktop();
  const portfolio = useRealtimePnL();

  if (portfolio.isLoading) {
    return (
      <div style={isDesktop ? styles.container : styles.containerMobile}>
        <div style={styles.loading}>Loading portfolio...</div>
      </div>
    );
  }

  const pnlSign = portfolio.totalGainLoss >= 0 ? '+' : '';

  // Mobile layout: 2x2 grid
  if (!isDesktop) {
    const pnlStyleMobile =
      portfolio.totalGainLoss >= 0 ? styles.pnlPositiveMobile : styles.pnlNegativeMobile;

    return (
      <div style={styles.containerMobile}>
        <div style={styles.statMobile}>
          <div style={styles.labelMobile}>
            Portfolio Value
            {portfolio.hasStreamingData && <span style={styles.streamingDot} />}
          </div>
          <div style={styles.valueAccentMobile}>
            {formatCurrency(portfolio.totalValue)}
          </div>
        </div>
        <div style={styles.statMobile}>
          <div style={styles.labelMobile}>Day P&L</div>
          <div style={pnlStyleMobile}>
            {pnlSign}
            {formatCurrency(portfolio.totalGainLoss)}
          </div>
          <div
            style={{
              ...styles.pnlPercentMobile,
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
        <div style={styles.statMobile}>
          <div style={styles.labelMobile}>Cash Balance</div>
          <div style={styles.valueMobile}>{formatCurrency(portfolio.cashBalance)}</div>
        </div>
        <div style={styles.statMobile}>
          <div style={styles.labelMobile}>Positions</div>
          <div style={styles.valueMobile}>{portfolio.positions.length}</div>
        </div>
      </div>
    );
  }

  // Desktop layout: flex row with dividers
  const pnlStyle =
    portfolio.totalGainLoss >= 0 ? styles.pnlPositive : styles.pnlNegative;

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
