import type { CSSProperties } from 'react';
import { useState } from 'react';
import { theme } from '../../theme/constants';
import { usePortfolio, useOptionPositions } from '../../hooks';
import { useDashboardStore } from '../../store/dashboardStore';
import { Widget } from './Widget';
import type { OptionPosition } from '../../types';

type TabType = 'stocks' | 'options';

const styles: Record<string, CSSProperties> = {
  tabContainer: {
    display: 'flex',
    gap: theme.spacing.xs,
    padding: `0 ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  tab: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.textSecondary,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: theme.transitions.fast,
    marginBottom: '-1px',
  },
  tabActive: {
    color: theme.colors.accent,
    borderBottomColor: theme.colors.accent,
  },
  tabBadge: {
    marginLeft: theme.spacing.xs,
    padding: `2px ${theme.spacing.xs}`,
    fontSize: theme.typography.xs,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.sm,
    color: theme.colors.textSecondary,
  },
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
  optionBadge: {
    display: 'inline-block',
    padding: `2px ${theme.spacing.xs}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase' as const,
    marginLeft: theme.spacing.xs,
  },
  callBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    color: theme.colors.positive,
  },
  putBadge: {
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    color: theme.colors.negative,
  },
  shortBadge: {
    backgroundColor: 'rgba(255, 165, 2, 0.15)',
    color: theme.colors.warning,
    marginLeft: theme.spacing.xs,
  },
  expirationText: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

const formatPercent = (value: number) =>
  `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

const formatExpiration = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
};

const daysUntilExpiration = (dateStr: string) => {
  const expDate = new Date(dateStr);
  const today = new Date();
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export function PositionsTable() {
  const { data: portfolio, isLoading: stocksLoading } = usePortfolio();
  const { data: optionPositions, isLoading: optionsLoading } = useOptionPositions();
  const { selectedSymbol, setSelectedSymbol, prefillSell } = useDashboardStore();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('stocks');

  const stockCount = portfolio?.positions.length ?? 0;
  const optionCount = optionPositions?.length ?? 0;

  const handleRowClick = (symbol: string, quantity: number) => {
    setSelectedSymbol(symbol);
    // Pre-fill quantity for quick sell when clicking a position
    useDashboardStore.getState().setQuantity(quantity.toString());
  };

  const handleSellClick = (e: React.MouseEvent, symbol: string, quantity: number) => {
    e.stopPropagation();
    prefillSell(symbol, quantity);
  };

  const isLoading = activeTab === 'stocks' ? stocksLoading : optionsLoading;

  if (isLoading) {
    return (
      <Widget title="Positions" noPadding>
        <div style={styles.loading}>Loading positions...</div>
      </Widget>
    );
  }

  const renderTabs = () => (
    <div style={styles.tabContainer}>
      <button
        style={{
          ...styles.tab,
          ...(activeTab === 'stocks' ? styles.tabActive : {}),
        }}
        onClick={() => setActiveTab('stocks')}
      >
        Stocks
        {stockCount > 0 && <span style={styles.tabBadge}>{stockCount}</span>}
      </button>
      <button
        style={{
          ...styles.tab,
          ...(activeTab === 'options' ? styles.tabActive : {}),
        }}
        onClick={() => setActiveTab('options')}
      >
        Options
        {optionCount > 0 && <span style={styles.tabBadge}>{optionCount}</span>}
      </button>
    </div>
  );

  const renderStocksTable = () => {
    if (!portfolio?.positions.length) {
      return <div style={styles.empty}>No stock positions. Search for a symbol to start trading!</div>;
    }

    return (
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
    );
  };

  const renderOptionsTable = () => {
    if (!optionPositions?.length) {
      return <div style={styles.empty}>No option positions. Browse the options chain to trade options!</div>;
    }

    return (
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Contract</th>
            <th style={styles.thRight}>Qty</th>
            <th style={styles.thRight}>Avg Cost</th>
            <th style={styles.thRight}>Price</th>
            <th style={styles.thRight}>Value</th>
            <th style={styles.thRight}>P/L</th>
          </tr>
        </thead>
        <tbody>
          {optionPositions.map((position: OptionPosition) => {
            const isHovered = hoveredRow === position.optionSymbol;
            const daysLeft = daysUntilExpiration(position.expirationDate);
            const isShort = position.quantity < 0;
            const rowStyle: CSSProperties = {
              cursor: 'pointer',
              backgroundColor: isHovered ? theme.colors.bgTertiary : 'transparent',
              transition: theme.transitions.fast,
            };

            return (
              <tr
                key={position.id}
                style={rowStyle}
                onClick={() => setSelectedSymbol(position.underlyingSymbol)}
                onMouseEnter={() => setHoveredRow(position.optionSymbol)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td style={styles.td}>
                  <div>
                    <span style={styles.symbol}>{position.underlyingSymbol}</span>
                    <span style={{ marginLeft: theme.spacing.sm }}>
                      ${position.strikePrice.toFixed(2)}
                    </span>
                    <span
                      style={{
                        ...styles.optionBadge,
                        ...(position.optionType === 'call' ? styles.callBadge : styles.putBadge),
                      }}
                    >
                      {position.optionType}
                    </span>
                    {isShort && <span style={{ ...styles.optionBadge, ...styles.shortBadge }}>SHORT</span>}
                  </div>
                  <div style={styles.expirationText}>
                    Exp: {formatExpiration(position.expirationDate)} ({daysLeft}d)
                  </div>
                </td>
                <td style={styles.tdRight}>
                  {Math.abs(position.quantity)}
                </td>
                <td style={styles.tdRight}>
                  {formatCurrency(position.avgCostBasis)}
                </td>
                <td style={styles.tdRight}>
                  {formatCurrency(position.currentPrice)}
                </td>
                <td style={styles.tdRight}>
                  {formatCurrency(Math.abs(position.marketValue))}
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
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <Widget title="Positions" noPadding>
      {renderTabs()}
      {activeTab === 'stocks' ? renderStocksTable() : renderOptionsTable()}
    </Widget>
  );
}
