import { useMemo, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { Widget } from '../dashboard/Widget';
import { ScreenerFilters } from './ScreenerFilters';
import { PrebuiltScreeners } from './PrebuiltScreeners';
import { useWatchlist, useWatchlistQuotes } from '../../hooks/useWatchlists';
import { useWatchlistStore, type ScreenerFilters as Filters } from '../../store/watchlistStore';
import type { Quote } from '../../types';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  results: {
    maxHeight: '300px',
    overflow: 'auto',
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  symbol: {
    color: theme.colors.accent,
    fontWeight: theme.typography.semibold,
    fontSize: theme.typography.sm,
  },
  price: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontMono,
    fontSize: theme.typography.sm,
  },
  change: {
    fontFamily: theme.typography.fontMono,
    fontSize: theme.typography.sm,
  },
  positive: {
    color: theme.colors.positive,
  },
  negative: {
    color: theme.colors.negative,
  },
  emptyState: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    textAlign: 'center' as const,
    padding: theme.spacing.lg,
  },
  resultCount: {
    color: theme.colors.textTertiary,
    fontSize: theme.typography.xs,
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
  },
};

function applyFilters(quotes: Quote[], filters: Filters): Quote[] {
  return quotes.filter((quote) => {
    // Price range
    if (filters.priceMin && quote.last < parseFloat(filters.priceMin)) {
      return false;
    }
    if (filters.priceMax && quote.last > parseFloat(filters.priceMax)) {
      return false;
    }

    // Volume minimum
    if (filters.volumeMin && quote.volume < parseFloat(filters.volumeMin)) {
      return false;
    }

    // Change percentage range
    if (filters.changeMin && quote.change_percentage < parseFloat(filters.changeMin)) {
      return false;
    }
    if (filters.changeMax && quote.change_percentage > parseFloat(filters.changeMax)) {
      return false;
    }

    // Near day high (within 2%)
    if (filters.nearHigh && quote.last < quote.high * 0.98) {
      return false;
    }

    // Near day low (within 2%)
    if (filters.nearLow && quote.last > quote.low * 1.02) {
      return false;
    }

    return true;
  });
}

function applyPreset(quotes: Quote[], preset: string): Quote[] {
  switch (preset) {
    case 'gainers':
      return quotes
        .filter((q) => q.change_percentage > 0)
        .sort((a, b) => b.change_percentage - a.change_percentage)
        .slice(0, 10);
    case 'losers':
      return quotes
        .filter((q) => q.change_percentage < 0)
        .sort((a, b) => a.change_percentage - b.change_percentage)
        .slice(0, 10);
    case 'active':
      return [...quotes].sort((a, b) => b.volume - a.volume).slice(0, 10);
    case 'nearHigh':
      return quotes.filter((q) => q.last >= q.high * 0.98);
    case 'nearLow':
      return quotes.filter((q) => q.last <= q.low * 1.02);
    default:
      return quotes;
  }
}

export function ScreenerPanel() {
  const { activeWatchlistId, filters, activePreset } = useWatchlistStore();
  const { data: watchlist } = useWatchlist(activeWatchlistId);

  // Get all symbols from active watchlist for screening
  const allSymbols = useMemo(() => {
    if (!watchlist?.items) return [];
    return watchlist.items.map((item) => item.symbol);
  }, [watchlist]);

  const { data: quotes } = useWatchlistQuotes(allSymbols);

  const filteredResults = useMemo(() => {
    if (!quotes || quotes.length === 0) return [];

    if (activePreset) {
      return applyPreset(quotes, activePreset);
    }

    return applyFilters(quotes, filters);
  }, [quotes, filters, activePreset]);

  return (
    <Widget title="Screener" style={{ maxHeight: '500px' }}>
      <div style={styles.container}>
        <PrebuiltScreeners />
        <ScreenerFilters />

        {allSymbols.length === 0 ? (
          <p style={styles.emptyState}>
            Add symbols to your watchlists to use the screener
          </p>
        ) : (
          <>
            <div style={styles.resultCount}>
              {filteredResults.length} of {quotes?.length ?? 0} symbols
            </div>
            <div style={styles.results}>
              {filteredResults.length === 0 ? (
                <p style={styles.emptyState}>No matches found</p>
              ) : (
                filteredResults.map((quote) => (
                  <div key={quote.symbol} style={styles.resultItem}>
                    <span style={styles.symbol}>{quote.symbol}</span>
                    <span style={styles.price}>${quote.last.toFixed(2)}</span>
                    <span
                      style={{
                        ...styles.change,
                        ...(quote.change_percentage > 0
                          ? styles.positive
                          : quote.change_percentage < 0
                            ? styles.negative
                            : {}),
                      }}
                    >
                      {quote.change_percentage > 0 ? '+' : ''}
                      {quote.change_percentage.toFixed(2)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </Widget>
  );
}
