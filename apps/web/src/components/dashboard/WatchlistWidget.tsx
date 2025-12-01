import { useEffect, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useWatchlists, useWatchlist } from '../../hooks/useWatchlists';
import { useWatchlistStore } from '../../store/watchlistStore';
import { useDashboardStore } from '../../store/dashboardStore';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  tabs: {
    display: 'flex',
    gap: theme.spacing.xs,
    padding: `0 0 ${theme.spacing.sm} 0`,
    borderBottom: `1px solid ${theme.colors.border}`,
    overflowX: 'auto',
    flexShrink: 0,
  },
  tab: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: 'transparent',
    border: 'none',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    cursor: 'pointer',
    borderRadius: theme.radius.sm,
    whiteSpace: 'nowrap',
  },
  tabActive: {
    backgroundColor: theme.colors.bgTertiary,
    color: theme.colors.textPrimary,
  },
  list: {
    flex: 1,
    overflow: 'auto',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.xs} 0`,
    cursor: 'pointer',
    borderRadius: theme.radius.sm,
  },
  symbol: {
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
  },
  price: {
    fontFamily: theme.typography.fontMono,
    fontSize: theme.typography.sm,
  },
  change: {
    fontFamily: theme.typography.fontMono,
    fontSize: theme.typography.xs,
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: theme.colors.textTertiary,
    fontSize: theme.typography.sm,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: theme.colors.textTertiary,
    fontSize: theme.typography.sm,
  },
};

export function WatchlistWidget() {
  const { activeWatchlistId, setActiveWatchlistId } = useWatchlistStore();
  const { data: watchlists } = useWatchlists();
  const { data: activeWatchlist, isLoading } = useWatchlist(activeWatchlistId);
  const setSelectedSymbol = useDashboardStore((state) => state.setSelectedSymbol);

  // Auto-select first watchlist if none selected
  useEffect(() => {
    if (!activeWatchlistId && watchlists && watchlists.length > 0) {
      setActiveWatchlistId(watchlists[0].id);
    }
  }, [watchlists, activeWatchlistId, setActiveWatchlistId]);

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  if (!watchlists || watchlists.length === 0) {
    return (
      <div style={styles.emptyState}>
        No watchlists yet
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        {watchlists.map((wl) => (
          <button
            key={wl.id}
            style={{
              ...styles.tab,
              ...(activeWatchlistId === wl.id ? styles.tabActive : {}),
            }}
            onClick={() => setActiveWatchlistId(wl.id)}
          >
            {wl.name}
          </button>
        ))}
      </div>

      <div style={styles.list}>
        {isLoading ? (
          <div style={styles.loading}>Loading...</div>
        ) : !activeWatchlist || activeWatchlist.items.length === 0 ? (
          <div style={styles.emptyState}>No symbols in this watchlist</div>
        ) : (
          activeWatchlist.items.map((item) => (
            <div
              key={item.id}
              style={styles.row}
              onClick={() => handleSymbolClick(item.symbol)}
            >
              <span style={styles.symbol}>{item.symbol}</span>
              <div>
                <span
                  style={{
                    ...styles.price,
                    color: theme.colors.textPrimary,
                  }}
                >
                  ${item.lastPrice?.toFixed(2) || '--'}
                </span>
                <span
                  style={{
                    ...styles.change,
                    color:
                      (item.changePercent || 0) >= 0
                        ? theme.colors.positive
                        : theme.colors.negative,
                    marginLeft: theme.spacing.sm,
                  }}
                >
                  {(item.changePercent || 0) >= 0 ? '+' : ''}
                  {item.changePercent?.toFixed(2) || '0.00'}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
