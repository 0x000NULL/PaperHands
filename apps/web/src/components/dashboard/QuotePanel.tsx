import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useQuote } from '../../hooks';
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
  symbol: {
    fontSize: theme.typography['2xl'],
    fontWeight: theme.typography.bold,
    color: theme.colors.textPrimary,
    margin: 0,
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
  const {
    data: quote,
    isLoading,
    error,
  } = useQuote(selectedSymbol ?? '', !!selectedSymbol);

  return (
    <Widget title="Quote">
      <div style={styles.container}>
        <SymbolSearch />

        {!selectedSymbol && (
          <div style={styles.empty}>
            Enter a symbol above to view quote data
          </div>
        )}

        {selectedSymbol && isLoading && (
          <div style={styles.loading}>Loading quote for {selectedSymbol}...</div>
        )}

        {selectedSymbol && error && (
          <div style={styles.error}>
            {error instanceof Error ? error.message : 'Failed to load quote'}
          </div>
        )}

        {quote && (
          <>
            <div style={styles.quoteHeader}>
              <div style={styles.symbolInfo}>
                <h2 style={styles.symbol}>{quote.symbol}</h2>
                <div style={styles.description}>{quote.description}</div>
              </div>
              <div style={styles.priceSection}>
                <div style={styles.price}>{formatCurrency(quote.last)}</div>
                <div
                  style={{
                    ...styles.change,
                    color:
                      quote.change >= 0
                        ? theme.colors.positive
                        : theme.colors.negative,
                  }}
                >
                  {quote.change >= 0 ? '+' : ''}
                  {quote.change.toFixed(2)} ({quote.change_percentage.toFixed(2)}%)
                </div>
              </div>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Bid</div>
                <div style={styles.statValue}>{formatCurrency(quote.bid)}</div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Ask</div>
                <div style={styles.statValue}>{formatCurrency(quote.ask)}</div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Spread</div>
                <div style={styles.statValue}>
                  {formatCurrency(quote.ask - quote.bid)}
                </div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Volume</div>
                <div style={styles.statValue}>{formatVolume(quote.volume)}</div>
              </div>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Open</div>
                <div style={styles.statValue}>{formatCurrency(quote.open)}</div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>High</div>
                <div style={styles.statValue}>{formatCurrency(quote.high)}</div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Low</div>
                <div style={styles.statValue}>{formatCurrency(quote.low)}</div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statLabel}>Prev Close</div>
                <div style={styles.statValue}>
                  {quote.close ? formatCurrency(quote.close) : '-'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Widget>
  );
}
