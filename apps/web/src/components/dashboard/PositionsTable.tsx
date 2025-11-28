import type { CSSProperties } from 'react';
import { useState } from 'react';
import { theme } from '../../theme/constants';
import { usePortfolio } from '../../hooks';
import { useDashboardStore } from '../../store/dashboardStore';
import { Widget } from './Widget';

const styles: Record<string, CSSProperties> = {
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
  td: {
    padding: `${theme.spacing.md}`,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  tdRight: {
    padding: `${theme.spacing.md}`,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    borderBottom: `1px solid ${theme.colors.border}`,
    textAlign: 'right',
  },
  symbol: {
    fontWeight: theme.typography.semibold,
    color: theme.colors.accent,
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
  sellButton: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.negative,
    color: theme.colors.textPrimary,
    border: 'none',
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
    opacity: 0,
    transition: theme.transitions.fast,
  },
  sellButtonVisible: {
    opacity: 1,
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

const formatPercent = (value: number) =>
  `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

export function PositionsTable() {
  const { data: portfolio, isLoading } = usePortfolio();
  const { selectedSymbol, setSelectedSymbol, prefillSell } = useDashboardStore();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleRowClick = (symbol: string, quantity: number) => {
    setSelectedSymbol(symbol);
    // Pre-fill quantity for quick sell when clicking a position
    useDashboardStore.getState().setQuantity(quantity.toString());
  };

  const handleSellClick = (e: React.MouseEvent, symbol: string, quantity: number) => {
    e.stopPropagation();
    prefillSell(symbol, quantity);
  };

  if (isLoading) {
    return (
      <Widget title="Positions" noPadding>
        <div style={styles.loading}>Loading positions...</div>
      </Widget>
    );
  }

  if (!portfolio?.positions.length) {
    return (
      <Widget title="Positions" noPadding>
        <div style={styles.empty}>
          No positions yet. Search for a symbol to start trading!
        </div>
      </Widget>
    );
  }

  return (
    <Widget title="Positions" noPadding>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Symbol</th>
            <th style={styles.thRight}>Qty</th>
            <th style={styles.thRight}>Avg Cost</th>
            <th style={styles.thRight}>Price</th>
            <th style={styles.thRight}>Value</th>
            <th style={styles.thRight}>P/L</th>
            <th style={styles.thRight}></th>
          </tr>
        </thead>
        <tbody>
          {portfolio.positions.map((position) => {
            const isSelected = selectedSymbol === position.symbol;
            const isHovered = hoveredRow === position.symbol;
            const rowStyle: CSSProperties = {
              cursor: 'pointer',
              backgroundColor: isSelected
                ? theme.colors.bgHover
                : isHovered
                  ? theme.colors.bgTertiary
                  : 'transparent',
              transition: theme.transitions.fast,
            };

            return (
              <tr
                key={position.symbol}
                style={rowStyle}
                onClick={() => handleRowClick(position.symbol, position.quantity)}
                onMouseEnter={() => setHoveredRow(position.symbol)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td style={{ ...styles.td, ...styles.symbol }}>
                  {position.symbol}
                </td>
                <td style={styles.tdRight}>
                  {position.quantity.toFixed(4)}
                </td>
                <td style={styles.tdRight}>
                  {formatCurrency(position.avgCostBasis)}
                </td>
                <td style={styles.tdRight}>
                  {formatCurrency(position.currentPrice)}
                </td>
                <td style={styles.tdRight}>
                  {formatCurrency(position.marketValue)}
                </td>
                <td
                  style={{
                    ...styles.tdRight,
                    color:
                      position.gainLoss >= 0
                        ? theme.colors.positive
                        : theme.colors.negative,
                  }}
                >
                  {formatCurrency(position.gainLoss)} ({formatPercent(position.gainLossPercent)})
                </td>
                <td style={styles.tdRight}>
                  <button
                    style={{
                      ...styles.sellButton,
                      ...(isHovered ? styles.sellButtonVisible : {}),
                    }}
                    onClick={(e) => handleSellClick(e, position.symbol, position.quantity)}
                  >
                    SELL
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Widget>
  );
}
