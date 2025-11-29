import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useStreamingQuote } from '../../hooks';
import { useDashboardStore } from '../../store/dashboardStore';
import { Widget } from './Widget';
import { SymbolSearch } from './SymbolSearch';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
  },
  quoteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  symbolInfo: {
    flex: 1,
  },
  symbolRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  symbol: {
    fontSize: theme.typography['2xl'],
    fontWeight: theme.typography.bold,
    color: theme.colors.textPrimary,
    margin: 0,
  },
  streamingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.medium,
    color: theme.colors.positive,
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    borderRadius: theme.radius.full,
  },
  streamingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: theme.colors.positive,
    animation: 'pulse 2s infinite',
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    marginTop: theme.spacing.xs,
  },
  priceSection: {
    textAlign: 'right',
  },
  price: {
    fontSize: theme.typography['3xl'],
    fontWeight: theme.typography.bold,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontMono,
  },
  change: {
    fontSize: theme.typography.base,
    marginTop: theme.spacing.xs,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
  },
  stat: {
    textAlign: 'center',
  },
  statLabel: {
    color: theme.colors.textTertiary,
    fontSize: theme.typography.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    padding: theme.spacing.xl,
  },
  loading: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    padding: theme.spacing.xl,
  },
  error: {
    textAlign: 'center',
    color: theme.colors.negative,
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: theme.radius.md,
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

const formatVolume = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

export function QuotePanel() {
  const selectedSymbol = useDashboardStore((state) => state.selectedSymbol);
  const quote = useStreamingQuote(selectedSymbol ?? '', {
    enabled: !!selectedSymbol,
  });

  const hasData = quote.last !== null;
  const change = quote.change ?? 0;
  const changePercent = quote.changePercent ?? 0;

  return (
    <Widget title="Quote">
      <div style={styles.container}>
        <SymbolSearch />

        {!selectedSymbol && (
          <div style={styles.empty}>
            Enter a symbol above to view quote data
          </div>
        )}

        {selectedSymbol && quote.isLoading && !hasData && (
          <div style={styles.loading}>Loading quote for {selectedSymbol}...</div>
        )}

        {selectedSymbol && quote.isError && !hasData && (
          <div style={styles.error}>
            {quote.error?.message ?? 'Failed to load quote'}
          </div>
        )}

        {hasData && (
          <>
            <div style={styles.quoteHeader}>
              <div style={styles.symbolInfo}>
                <div style={styles.symbolRow}>
                  <h2 style={styles.symbol}>{quote.symbol}</h2>
                  {quote.isStreaming && (
                    <span style={styles.streamingBadge}>
                      <span style={styles.streamingDot} />
                      LIVE
                    </span>
                  )}
                </div>
              </div>
              <div style={styles.priceSection}>
                <div style={styles.price}>
                  {formatCurrency(quote.last ?? 0)}
                </div>
                <div
                  style={{
                    ...styles.change,
                    color:
                      change >= 0
                        ? theme.colors.positive
                        : theme.colors.negative,
                  }}
                >
                  {change >= 0 ? '+' : ''}
                  {change.toFixed(2)} ({changePercent.toFixed(2)}%)
                </div>
              </div>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Bid</div>
                <div style={styles.statValue}>
                  {quote.bid !== null ? formatCurrency(quote.bid) : '-'}
                </div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Ask</div>
                <div style={styles.statValue}>
                  {quote.ask !== null ? formatCurrency(quote.ask) : '-'}
                </div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Spread</div>
                <div style={styles.statValue}>
                  {quote.bid !== null && quote.ask !== null
                    ? formatCurrency(quote.ask - quote.bid)
                    : '-'}
                </div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Volume</div>
                <div style={styles.statValue}>
                  {quote.volume !== undefined ? formatVolume(quote.volume) : '-'}
                </div>
              </div>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Open</div>
                <div style={styles.statValue}>
                  {quote.open !== undefined ? formatCurrency(quote.open) : '-'}
                </div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>High</div>
                <div style={styles.statValue}>
                  {quote.high !== undefined ? formatCurrency(quote.high) : '-'}
                </div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Low</div>
                <div style={styles.statValue}>
                  {quote.low !== undefined ? formatCurrency(quote.low) : '-'}
                </div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Prev Close</div>
                <div style={styles.statValue}>
                  {quote.previousClose !== undefined
                    ? formatCurrency(quote.previousClose)
                    : '-'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Widget>
  );
}
