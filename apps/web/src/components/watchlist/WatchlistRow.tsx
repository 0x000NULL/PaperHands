import { useState, type CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { theme } from '../../theme/constants';
import type { WatchlistItem, Quote } from '../../types';
import type { ColumnConfig } from '../../store/watchlistStore';

interface WatchlistRowProps {
  item: WatchlistItem;
  quote?: Quote;
  visibleColumns: ColumnConfig[];
  onRemove: () => void;
}

const styles: Record<string, CSSProperties> = {
  row: {
    borderBottom: `1px solid ${theme.colors.border}`,
    transition: theme.transitions.fast,
  },
  cell: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    fontSize: theme.typography.sm,
    color: theme.colors.textPrimary,
  },
  cellRight: {
    textAlign: 'right' as const,
    fontFamily: theme.typography.fontMono,
  },
  dragHandle: {
    cursor: 'grab',
    color: theme.colors.textTertiary,
    padding: theme.spacing.xs,
  },
  symbol: {
    fontWeight: theme.typography.semibold,
    color: theme.colors.accent,
  },
  description: {
    color: theme.colors.textSecondary,
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  positive: {
    color: theme.colors.positive,
  },
  negative: {
    color: theme.colors.negative,
  },
  removeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: theme.colors.textTertiary,
    cursor: 'pointer',
    padding: theme.spacing.xs,
    fontSize: theme.typography.sm,
    opacity: 0,
    transition: theme.transitions.fast,
  },
};

function formatNumber(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null) return '-';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatVolume(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function formatPercent(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export function WatchlistRow({
  item,
  quote,
  visibleColumns,
  onRemove,
}: WatchlistRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: CSSProperties = {
    ...styles.row,
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: isDragging
      ? theme.colors.bgHover
      : isHovered
        ? theme.colors.bgTertiary
        : 'transparent',
    opacity: isDragging ? 0.8 : 1,
  };

  const getCellValue = (key: string) => {
    if (!quote) return '-';

    switch (key) {
      case 'symbol':
        return <span style={styles.symbol}>{quote.symbol}</span>;
      case 'description':
        return <span style={styles.description}>{quote.description}</span>;
      case 'last':
        return formatNumber(quote.last);
      case 'change':
        return (
          <span
            style={
              quote.change > 0
                ? styles.positive
                : quote.change < 0
                  ? styles.negative
                  : {}
            }
          >
            {quote.change > 0 ? '+' : ''}
            {formatNumber(quote.change)}
          </span>
        );
      case 'change_percentage':
        return (
          <span
            style={
              quote.change_percentage > 0
                ? styles.positive
                : quote.change_percentage < 0
                  ? styles.negative
                  : {}
            }
          >
            {formatPercent(quote.change_percentage)}
          </span>
        );
      case 'volume':
        return formatVolume(quote.volume);
      case 'bid':
        return formatNumber(quote.bid);
      case 'ask':
        return formatNumber(quote.ask);
      case 'open':
        return formatNumber(quote.open);
      case 'high':
        return formatNumber(quote.high);
      case 'low':
        return formatNumber(quote.low);
      // 52-week data columns
      case 'week_52_high':
        return formatNumber(quote.week_52_high);
      case 'week_52_low':
        return formatNumber(quote.week_52_low);
      case 'pct_from_52_high':
        return (
          <span
            style={
              quote.pct_from_52_high !== null && quote.pct_from_52_high > 0
                ? styles.positive
                : quote.pct_from_52_high !== null && quote.pct_from_52_high < 0
                  ? styles.negative
                  : {}
            }
          >
            {formatPercent(quote.pct_from_52_high)}
          </span>
        );
      case 'pct_from_52_low':
        return (
          <span
            style={
              quote.pct_from_52_low !== null && quote.pct_from_52_low > 0
                ? styles.positive
                : quote.pct_from_52_low !== null && quote.pct_from_52_low < 0
                  ? styles.negative
                  : {}
            }
          >
            {formatPercent(quote.pct_from_52_low)}
          </span>
        );
      case 'average_volume':
        return formatVolume(quote.average_volume);
      default:
        return '-';
    }
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <td style={styles.cell}>
        <span style={styles.dragHandle} {...attributes} {...listeners}>
          &#x2630;
        </span>
      </td>
      {visibleColumns.map((col) => (
        <td
          key={col.key}
          style={{
            ...styles.cell,
            ...(col.key !== 'symbol' && col.key !== 'description'
              ? styles.cellRight
              : {}),
          }}
        >
          {getCellValue(col.key)}
        </td>
      ))}
      <td style={styles.cell}>
        <button
          style={{
            ...styles.removeButton,
            opacity: isHovered ? 1 : 0,
          }}
          onClick={onRemove}
          title="Remove from watchlist"
        >
          &#x2715;
        </button>
      </td>
    </tr>
  );
}
