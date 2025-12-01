import { useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { Widget } from '../components/dashboard/Widget';
import { theme } from '../theme/constants';
import { api } from '../api/client';
import { usePortfolio, useOptionPositions } from '../hooks';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { useDashboardStore } from '../store/dashboardStore';
import {
  AllocationPieChart,
  AllocationViewTabs,
  type AllocationViewType,
} from '../components/analytics';
import type { OptionPosition } from '../types';
import '../styles/responsive.css';

type TabType = 'stocks' | 'options';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
    minHeight: 'calc(100vh - 80px)',
  },
  summaryBar: {
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
    gap: theme.spacing.lg,
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
    fontFamily: theme.typography.fontMono,
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
  // Mobile card styles
  cardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.border}`,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardSymbol: {
    fontWeight: theme.typography.semibold,
    color: theme.colors.accent,
    fontSize: theme.typography.base,
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.xs} 0`,
  },
  cardLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  cardValue: {
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.textPrimary,
  },
  optionBadge: {
    display: 'inline-block',
    padding: `2px ${theme.spacing.xs}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase',
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

const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value >= 0 ? '' : '-';
  return `${sign}$${absValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPercent = (value: number, showSign = true): string => {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const getValueColor = (value: number): string => {
  if (value > 0) return theme.colors.positive;
  if (value < 0) return theme.colors.negative;
  return theme.colors.textPrimary;
};

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

export function Portfolio() {
  const [activeTab, setActiveTab] = useState<TabType>('stocks');
  const [allocationView, setAllocationView] = useState<AllocationViewType>('position');
  const isDesktop = useIsDesktop();

  const { data: portfolio, isLoading: stocksLoading } = usePortfolio();
  const { data: optionPositions, isLoading: optionsLoading } = useOptionPositions();
  const { setSelectedSymbol } = useDashboardStore();

  const { data: allocation, isLoading: loadingAllocation } = useQuery({
    queryKey: ['analytics', 'allocation'],
    queryFn: () => api.getAllocation(),
    staleTime: 30000,
  });

  const { data: sectorAllocation, isLoading: loadingSector } = useQuery({
    queryKey: ['analytics', 'sector-allocation'],
    queryFn: () => api.getSectorAllocation(),
    staleTime: 30000,
    enabled: allocationView === 'sector',
  });

  const stockCount = portfolio?.positions.length ?? 0;
  const optionCount = optionPositions?.length ?? 0;
  const isLoading = activeTab === 'stocks' ? stocksLoading : optionsLoading;

  const totalValue = portfolio?.totalValue ?? 0;
  const totalUnrealizedPL = portfolio?.positions.reduce((sum, p) => sum + p.gainLoss, 0) ?? 0;
  const totalUnrealizedPLPercent = portfolio?.positions.reduce((sum, p) => sum + p.gainLossPercent, 0) ?? 0;
  const cashBalance = portfolio?.cashBalance ?? 0;
  const buyingPower = cashBalance; // For paper trading, buying power = cash

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

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

    if (!isDesktop) {
      return (
        <div style={styles.cardList}>
          {portfolio.positions.map((position) => (
            <div
              key={position.symbol}
              style={styles.card}
              onClick={() => handleSymbolClick(position.symbol)}
            >
              <div style={styles.cardHeader}>
                <span style={styles.cardSymbol}>{position.symbol}</span>
                <span
                  style={{
                    ...styles.cardValue,
                    color: getValueColor(position.gainLoss),
                  }}
                >
                  {formatCurrency(position.gainLoss)}
                </span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Quantity</span>
                <span style={styles.cardValue}>{position.quantity.toFixed(4)}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Avg Cost</span>
                <span style={styles.cardValue}>{formatCurrency(position.avgCostBasis)}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Price</span>
                <span style={styles.cardValue}>{formatCurrency(position.currentPrice)}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>Value</span>
                <span style={styles.cardValue}>{formatCurrency(position.marketValue)}</span>
              </div>
              <div style={styles.cardRow}>
                <span style={styles.cardLabel}>P&L %</span>
                <span
                  style={{
                    ...styles.cardValue,
                    color: getValueColor(position.gainLossPercent),
                  }}
                >
                  {formatPercent(position.gainLossPercent)}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
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
          </tr>
        </thead>
        <tbody>
          {portfolio.positions.map((position) => (
            <tr
              key={position.symbol}
              style={{ cursor: 'pointer' }}
              onClick={() => handleSymbolClick(position.symbol)}
            >
              <td style={{ ...styles.td, ...styles.symbol }}>{position.symbol}</td>
              <td style={styles.tdRight}>{position.quantity.toFixed(4)}</td>
              <td style={styles.tdRight}>{formatCurrency(position.avgCostBasis)}</td>
              <td style={styles.tdRight}>{formatCurrency(position.currentPrice)}</td>
              <td style={styles.tdRight}>{formatCurrency(position.marketValue)}</td>
              <td
                style={{
                  ...styles.tdRight,
                  color: getValueColor(position.gainLoss),
                }}
              >
                {formatCurrency(position.gainLoss)} ({formatPercent(position.gainLossPercent)})
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderOptionsTable = () => {
    if (!optionPositions?.length) {
      return <div style={styles.empty}>No option positions. Browse the options chain to trade options!</div>;
    }

    if (!isDesktop) {
      return (
        <div style={styles.cardList}>
          {optionPositions.map((position: OptionPosition) => {
            const daysLeft = daysUntilExpiration(position.expirationDate);
            const isShort = position.quantity < 0;
            return (
              <div
                key={position.id}
                style={styles.card}
                onClick={() => handleSymbolClick(position.underlyingSymbol)}
              >
                <div style={styles.cardHeader}>
                  <div>
                    <span style={styles.cardSymbol}>{position.underlyingSymbol}</span>
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
                  <span
                    style={{
                      ...styles.cardValue,
                      color: getValueColor(position.gainLoss),
                    }}
                  >
                    {formatCurrency(position.gainLoss)}
                  </span>
                </div>
                <div style={styles.expirationText}>
                  Exp: {formatExpiration(position.expirationDate)} ({daysLeft}d)
                </div>
                <div style={styles.cardRow}>
                  <span style={styles.cardLabel}>Contracts</span>
                  <span style={styles.cardValue}>{Math.abs(position.quantity)}</span>
                </div>
                <div style={styles.cardRow}>
                  <span style={styles.cardLabel}>Avg Cost</span>
                  <span style={styles.cardValue}>{formatCurrency(position.avgCostBasis)}</span>
                </div>
                <div style={styles.cardRow}>
                  <span style={styles.cardLabel}>Price</span>
                  <span style={styles.cardValue}>{formatCurrency(position.currentPrice)}</span>
                </div>
                <div style={styles.cardRow}>
                  <span style={styles.cardLabel}>Value</span>
                  <span style={styles.cardValue}>{formatCurrency(Math.abs(position.marketValue))}</span>
                </div>
                <div style={styles.cardRow}>
                  <span style={styles.cardLabel}>P&L %</span>
                  <span
                    style={{
                      ...styles.cardValue,
                      color: getValueColor(position.gainLossPercent),
                    }}
                  >
                    {formatPercent(position.gainLossPercent)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      );
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
            const daysLeft = daysUntilExpiration(position.expirationDate);
            const isShort = position.quantity < 0;
            return (
              <tr
                key={position.id}
                style={{ cursor: 'pointer' }}
                onClick={() => handleSymbolClick(position.underlyingSymbol)}
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
                <td style={styles.tdRight}>{Math.abs(position.quantity)}</td>
                <td style={styles.tdRight}>{formatCurrency(position.avgCostBasis)}</td>
                <td style={styles.tdRight}>{formatCurrency(position.currentPrice)}</td>
                <td style={styles.tdRight}>{formatCurrency(Math.abs(position.marketValue))}</td>
                <td
                  style={{
                    ...styles.tdRight,
                    color: getValueColor(position.gainLoss),
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
    <Layout>
      <div style={styles.container}>
        {/* Summary Bar */}
        <div className="summary-bar" style={styles.summaryBar}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Total Value</span>
            <span style={styles.summaryValue}>
              {formatCurrency(totalValue)}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Unrealized P&L</span>
            <span
              style={{
                ...styles.summaryValue,
                color: getValueColor(totalUnrealizedPL),
              }}
            >
              {formatCurrency(totalUnrealizedPL)}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Unrealized %</span>
            <span
              style={{
                ...styles.summaryValue,
                color: getValueColor(totalUnrealizedPLPercent),
              }}
            >
              {formatPercent(totalUnrealizedPLPercent)}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Cash Balance</span>
            <span style={styles.summaryValue}>
              {formatCurrency(cashBalance)}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Buying Power</span>
            <span style={styles.summaryValue}>
              {formatCurrency(buyingPower)}
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="main-grid" style={styles.mainGrid}>
          {/* Left Column - Positions */}
          <div style={styles.leftColumn}>
            <Widget title="Positions" noPadding>
              {renderTabs()}
              {isLoading ? (
                <div style={styles.loading}>Loading positions...</div>
              ) : activeTab === 'stocks' ? (
                renderStocksTable()
              ) : (
                renderOptionsTable()
              )}
            </Widget>
          </div>

          {/* Right Column - Allocation */}
          <div style={styles.rightColumn}>
            <Widget title="Allocation">
              <AllocationViewTabs
                value={allocationView}
                onChange={setAllocationView}
              />
              {allocationView === 'position' ? (
                loadingAllocation ? (
                  <div style={styles.loading}>Loading...</div>
                ) : (
                  <AllocationPieChart
                    data={allocation || []}
                    type="position"
                  />
                )
              ) : (
                loadingSector ? (
                  <div style={styles.loading}>Loading...</div>
                ) : (
                  <AllocationPieChart
                    data={sectorAllocation || []}
                    type="sector"
                  />
                )
              )}
            </Widget>
          </div>
        </div>
      </div>
    </Layout>
  );
}
