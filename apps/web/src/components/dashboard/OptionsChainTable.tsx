import { useMemo, useState, useRef, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { MobileCard, CardRow, MobileCardList } from '../mobile';
import { TabToggle, type TabOption } from '../mobile/TabToggle';
import type { OptionContract, OptionsChainResponse } from '../../types';

interface OptionsChainTableProps {
  chain: OptionsChainResponse;
  onSelectContract: (contract: OptionContract) => void;
}

type OptionViewType = 'calls' | 'puts';

const styles: Record<string, CSSProperties> = {
  container: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontFamily,
  },
  headerRow: {
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  headerCell: {
    padding: `${theme.spacing.sm} ${theme.spacing.xs}`,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.medium,
    fontSize: theme.typography.xs,
    textAlign: 'center' as const,
    whiteSpace: 'nowrap',
  },
  headerCellLeft: {
    textAlign: 'left' as const,
  },
  headerCellCenter: {
    textAlign: 'center' as const,
  },
  strikeHeader: {
    backgroundColor: theme.colors.bgTertiary,
    position: 'sticky' as const,
    left: 0,
  },
  row: {
    borderBottom: `1px solid ${theme.colors.border}`,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  rowHover: {
    backgroundColor: theme.colors.bgHover,
  },
  cell: {
    padding: `${theme.spacing.sm} ${theme.spacing.xs}`,
    textAlign: 'center' as const,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontMono,
    fontSize: theme.typography.sm,
  },
  strikeCell: {
    textAlign: 'center' as const,
    fontWeight: theme.typography.semibold,
    backgroundColor: theme.colors.bgTertiary,
    position: 'sticky' as const,
    left: 0,
    zIndex: 1,
  },
  callCell: {
    backgroundColor: 'rgba(0, 255, 136, 0.03)',
  },
  putCell: {
    backgroundColor: 'rgba(255, 71, 87, 0.03)',
  },
  itmCell: {
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
  },
  itmPutCell: {
    backgroundColor: 'rgba(255, 71, 87, 0.08)',
  },
  noData: {
    color: theme.colors.textTertiary,
  },
  sectionLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  // Mobile styles
  mobileContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  mobileHeader: {
    padding: theme.spacing.md,
    position: 'sticky',
    top: 0,
    backgroundColor: theme.colors.bgSecondary,
    zIndex: 10,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  atmIndicator: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.sm,
  },
  atmLabel: {
    color: theme.colors.textSecondary,
  },
  atmValue: {
    fontFamily: theme.typography.fontMono,
    fontWeight: theme.typography.semibold,
    color: theme.colors.accent,
  },
  strikeText: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.textPrimary,
  },
  badge: {
    padding: `2px ${theme.spacing.xs}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase' as const,
  },
  itmBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    color: theme.colors.positive,
  },
  otmBadge: {
    backgroundColor: theme.colors.bgSecondary,
    color: theme.colors.textSecondary,
  },
  greeksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  greekItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  greekLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase' as const,
  },
  greekValue: {
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.textPrimary,
  },
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  swipeAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    padding: `0 ${theme.spacing.lg}`,
    fontWeight: theme.typography.semibold,
    fontSize: theme.typography.sm,
  },
  tradeButton: {
    marginTop: theme.spacing.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    border: 'none',
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
    width: '100%',
    minHeight: '44px',
  },
};

function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return value.toFixed(2);
}

function formatVolume(value: number): string {
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toString();
}

interface RowData {
  strike: number;
  call: OptionContract | null;
  put: OptionContract | null;
}

// Tab options for mobile view
const tabOptions: TabOption<OptionViewType>[] = [
  { value: 'calls', label: 'Calls' },
  { value: 'puts', label: 'Puts' },
];

// Swipeable card component for mobile
interface SwipeableOptionCardProps {
  contract: OptionContract;
  strike: number;
  onSelect: (contract: OptionContract) => void;
}

function SwipeableOptionCard({ contract, strike, onSelect }: SwipeableOptionCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.touches[0].clientX;
    // Only allow swipe left (positive diff)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 100)); // Max 100px
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 50) {
      // Trigger trade action
      onSelect(contract);
    }
    setSwipeOffset(0);
  };

  const isItm = contract.inTheMoney;
  const isCall = contract.optionType === 'call';

  const cardVariant = isItm
    ? (isCall ? 'itmCall' : 'itmPut')
    : (isCall ? 'call' : 'put');

  const greeksContent = contract.greeks && (
    <div style={styles.greeksGrid}>
      <div style={styles.greekItem}>
        <span style={styles.greekLabel}>Delta</span>
        <span style={styles.greekValue}>{contract.greeks.delta.toFixed(3)}</span>
      </div>
      <div style={styles.greekItem}>
        <span style={styles.greekLabel}>Gamma</span>
        <span style={styles.greekValue}>{contract.greeks.gamma.toFixed(4)}</span>
      </div>
      <div style={styles.greekItem}>
        <span style={styles.greekLabel}>Theta</span>
        <span style={styles.greekValue}>{contract.greeks.theta.toFixed(3)}</span>
      </div>
      <div style={styles.greekItem}>
        <span style={styles.greekLabel}>Vega</span>
        <span style={styles.greekValue}>{contract.greeks.vega.toFixed(3)}</span>
      </div>
      <div style={styles.greekItem}>
        <span style={styles.greekLabel}>IV</span>
        <span style={styles.greekValue}>{(contract.greeks.iv * 100).toFixed(1)}%</span>
      </div>
      <div style={styles.greekItem}>
        <span style={styles.greekLabel}>Rho</span>
        <span style={styles.greekValue}>{contract.greeks.rho.toFixed(4)}</span>
      </div>
    </div>
  );

  return (
    <div
      ref={cardRef}
      style={{
        ...styles.swipeContainer,
        transform: `translateX(-${swipeOffset}px)`,
        transition: swipeOffset === 0 ? theme.transitions.fast : 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe reveal action */}
      {swipeOffset > 0 && (
        <div
          style={{
            ...styles.swipeAction,
            width: swipeOffset,
          }}
        >
          Trade
        </div>
      )}

      <MobileCard
        variant={cardVariant as 'default' | 'call' | 'put' | 'itmCall' | 'itmPut'}
        header={
          <span style={styles.strikeText}>${strike.toFixed(2)}</span>
        }
        headerRight={
          <span style={{ ...styles.badge, ...(isItm ? styles.itmBadge : styles.otmBadge) }}>
            {isItm ? 'ITM' : 'OTM'}
          </span>
        }
        expandable={!!contract.greeks}
        expandedContent={greeksContent}
      >
        <CardRow label="Bid" value={`$${formatPrice(contract.bid)}`} />
        <CardRow label="Ask" value={`$${formatPrice(contract.ask)}`} />
        <CardRow label="Last" value={contract.last ? `$${formatPrice(contract.last)}` : '-'} />
        <CardRow label="Volume" value={formatVolume(contract.volume)} />

        <button
          style={styles.tradeButton}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(contract);
          }}
        >
          Trade {isCall ? 'Call' : 'Put'}
        </button>
      </MobileCard>
    </div>
  );
}

export function OptionsChainTable({
  chain,
  onSelectContract,
}: OptionsChainTableProps) {
  const isDesktop = useIsDesktop();
  const [mobileView, setMobileView] = useState<OptionViewType>('calls');

  // Build rows with calls and puts aligned by strike
  const rows = useMemo<RowData[]>(() => {
    const strikeMap = new Map<number, { call?: OptionContract; put?: OptionContract }>();

    for (const call of chain.calls) {
      strikeMap.set(call.strike, { ...strikeMap.get(call.strike), call });
    }
    for (const put of chain.puts) {
      strikeMap.set(put.strike, { ...strikeMap.get(put.strike), put });
    }

    return Array.from(strikeMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([strike, { call, put }]) => ({
        strike,
        call: call ?? null,
        put: put ?? null,
      }));
  }, [chain.calls, chain.puts]);

  // Find ATM strike (closest to underlying price)
  const atmStrike = useMemo(() => {
    if (rows.length === 0) return null;
    let closest = rows[0].strike;
    let minDiff = Math.abs(rows[0].strike - chain.underlyingPrice);

    for (const row of rows) {
      const diff = Math.abs(row.strike - chain.underlyingPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closest = row.strike;
      }
    }
    return closest;
  }, [rows, chain.underlyingPrice]);

  if (rows.length === 0) {
    return (
      <div style={{ padding: theme.spacing.lg, textAlign: 'center', color: theme.colors.textSecondary }}>
        No options data available for this expiration
      </div>
    );
  }

  // Mobile view
  if (!isDesktop) {
    const contracts = mobileView === 'calls'
      ? rows.filter(r => r.call).map(r => ({ strike: r.strike, contract: r.call! }))
      : rows.filter(r => r.put).map(r => ({ strike: r.strike, contract: r.put! }));

    return (
      <div style={styles.mobileContainer}>
        {/* Sticky header with tabs and ATM indicator */}
        <div style={styles.mobileHeader}>
          <TabToggle
            options={tabOptions}
            value={mobileView}
            onChange={setMobileView}
          />
          <div style={styles.atmIndicator}>
            <span style={styles.atmLabel}>
              ATM Strike: <strong>${atmStrike?.toFixed(2)}</strong>
            </span>
            <span style={styles.atmValue}>
              {chain.symbol} @ ${chain.underlyingPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Option cards */}
        <MobileCardList>
          {contracts.map(({ strike, contract }) => (
            <SwipeableOptionCard
              key={contract.symbol}
              contract={contract}
              strike={strike}
              onSelect={onSelectContract}
            />
          ))}
        </MobileCardList>
      </div>
    );
  }

  // Desktop table view (existing)
  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            {/* Call columns */}
            <th colSpan={4} style={{ ...styles.headerCell, ...styles.headerCellCenter, color: theme.colors.positive }}>
              <span style={styles.sectionLabel}>Calls</span>
            </th>
            {/* Strike column */}
            <th style={{ ...styles.headerCell, ...styles.strikeHeader, ...styles.headerCellCenter }}>
              Strike
            </th>
            {/* Put columns */}
            <th colSpan={4} style={{ ...styles.headerCell, ...styles.headerCellCenter, color: theme.colors.negative }}>
              <span style={styles.sectionLabel}>Puts</span>
            </th>
          </tr>
          <tr style={styles.headerRow}>
            {/* Call headers */}
            <th style={styles.headerCell}>Bid</th>
            <th style={styles.headerCell}>Ask</th>
            <th style={styles.headerCell}>Last</th>
            <th style={styles.headerCell}>Vol</th>
            {/* Strike */}
            <th style={{ ...styles.headerCell, ...styles.strikeHeader, ...styles.headerCellCenter }}></th>
            {/* Put headers */}
            <th style={styles.headerCell}>Bid</th>
            <th style={styles.headerCell}>Ask</th>
            <th style={styles.headerCell}>Last</th>
            <th style={styles.headerCell}>Vol</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ strike, call, put }) => (
            <tr
              key={strike}
              style={styles.row}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.bgHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '';
              }}
            >
              {/* Call cells */}
              <td
                style={{
                  ...styles.cell,
                  ...styles.callCell,
                  ...(call?.inTheMoney ? styles.itmCell : {}),
                }}
                onClick={() => call && onSelectContract(call)}
              >
                {call ? formatPrice(call.bid) : <span style={styles.noData}>-</span>}
              </td>
              <td
                style={{
                  ...styles.cell,
                  ...styles.callCell,
                  ...(call?.inTheMoney ? styles.itmCell : {}),
                }}
                onClick={() => call && onSelectContract(call)}
              >
                {call ? formatPrice(call.ask) : <span style={styles.noData}>-</span>}
              </td>
              <td
                style={{
                  ...styles.cell,
                  ...styles.callCell,
                  ...(call?.inTheMoney ? styles.itmCell : {}),
                }}
                onClick={() => call && onSelectContract(call)}
              >
                {call ? formatPrice(call.last) : <span style={styles.noData}>-</span>}
              </td>
              <td
                style={{
                  ...styles.cell,
                  ...styles.callCell,
                  ...(call?.inTheMoney ? styles.itmCell : {}),
                }}
                onClick={() => call && onSelectContract(call)}
              >
                {call ? formatVolume(call.volume) : <span style={styles.noData}>-</span>}
              </td>

              {/* Strike cell */}
              <td style={{ ...styles.cell, ...styles.strikeCell }}>
                ${strike.toFixed(2)}
              </td>

              {/* Put cells */}
              <td
                style={{
                  ...styles.cell,
                  ...styles.putCell,
                  ...(put?.inTheMoney ? styles.itmPutCell : {}),
                }}
                onClick={() => put && onSelectContract(put)}
              >
                {put ? formatPrice(put.bid) : <span style={styles.noData}>-</span>}
              </td>
              <td
                style={{
                  ...styles.cell,
                  ...styles.putCell,
                  ...(put?.inTheMoney ? styles.itmPutCell : {}),
                }}
                onClick={() => put && onSelectContract(put)}
              >
                {put ? formatPrice(put.ask) : <span style={styles.noData}>-</span>}
              </td>
              <td
                style={{
                  ...styles.cell,
                  ...styles.putCell,
                  ...(put?.inTheMoney ? styles.itmPutCell : {}),
                }}
                onClick={() => put && onSelectContract(put)}
              >
                {put ? formatPrice(put.last) : <span style={styles.noData}>-</span>}
              </td>
              <td
                style={{
                  ...styles.cell,
                  ...styles.putCell,
                  ...(put?.inTheMoney ? styles.itmPutCell : {}),
                }}
                onClick={() => put && onSelectContract(put)}
              >
                {put ? formatVolume(put.volume) : <span style={styles.noData}>-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
