import { useMemo, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import type { OptionContract, OptionsChainResponse } from '../../types';

interface OptionsChainTableProps {
  chain: OptionsChainResponse;
  onSelectContract: (contract: OptionContract) => void;
}

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

export function OptionsChainTable({
  chain,
  onSelectContract,
}: OptionsChainTableProps) {
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

  if (rows.length === 0) {
    return (
      <div style={{ padding: theme.spacing.lg, textAlign: 'center', color: theme.colors.textSecondary }}>
        No options data available for this expiration
      </div>
    );
  }

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
