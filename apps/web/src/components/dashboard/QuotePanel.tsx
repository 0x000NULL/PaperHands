import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useStreamingQuote } from '../../hooks';
import { useDashboardStore } from '../../store/dashboardStore';
import { useCreateAlert } from '../../hooks/useAlerts';
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
    // Note: gridTemplateColumns is handled by .quote-stats CSS class
    // 2 columns on mobile, 4 columns on md+
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
  alertButtonContainer: {
    position: 'relative',
    display: 'inline-block',
  },
  alertButton: {
    background: 'none',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    padding: '6px 10px',
    cursor: 'pointer',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: theme.transitions.fast,
  },
  alertDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    width: '280px',
    backgroundColor: theme.colors.bgSecondary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.lg,
    boxShadow: theme.shadows.lg,
    padding: theme.spacing.md,
    zIndex: 100,
  },
  alertDropdownTitle: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  alertForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  alertFormRow: {
    display: 'flex',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  alertSelect: {
    flex: 1,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
  },
  alertInput: {
    flex: 1,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
  },
  alertSubmitButton: {
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    border: 'none',
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
    width: '100%',
    marginTop: theme.spacing.xs,
  },
  quickAlertButtons: {
    display: 'flex',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  quickAlertButton: {
    flex: 1,
    backgroundColor: theme.colors.bgTertiary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    padding: '4px 8px',
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    cursor: 'pointer',
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
  const createAlert = useCreateAlert();

  // Quick alert state
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const [alertCondition, setAlertCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [alertTarget, setAlertTarget] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAlertDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasData = quote.last !== null;
  const change = quote.change ?? 0;
  const changePercent = quote.changePercent ?? 0;

  const handleCreateQuickAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSymbol || !alertTarget) return;

    await createAlert.mutateAsync({
      type: 'PRICE',
      symbol: selectedSymbol,
      condition: alertCondition,
      targetValue: parseFloat(alertTarget),
    });

    setShowAlertDropdown(false);
    setAlertTarget('');
  };

  const setQuickTarget = (percent: number) => {
    if (quote.last) {
      const target = quote.last * (1 + percent / 100);
      setAlertTarget(target.toFixed(2));
      setAlertCondition(percent > 0 ? 'ABOVE' : 'BELOW');
    }
  };

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
                <div style={styles.alertButtonContainer} ref={dropdownRef}>
                  <button
                    style={styles.alertButton}
                    onClick={() => setShowAlertDropdown(!showAlertDropdown)}
                    title="Set price alert"
                  >
                    🔔 Alert
                  </button>
                  {showAlertDropdown && (
                    <div style={styles.alertDropdown}>
                      <div style={styles.alertDropdownTitle}>
                        Quick Price Alert for {selectedSymbol}
                      </div>
                      <form onSubmit={handleCreateQuickAlert} style={styles.alertForm}>
                        <div style={styles.alertFormRow}>
                          <select
                            style={styles.alertSelect}
                            value={alertCondition}
                            onChange={(e) => setAlertCondition(e.target.value as 'ABOVE' | 'BELOW')}
                          >
                            <option value="ABOVE">Above</option>
                            <option value="BELOW">Below</option>
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            style={styles.alertInput}
                            placeholder="Price target"
                            value={alertTarget}
                            onChange={(e) => setAlertTarget(e.target.value)}
                            required
                          />
                        </div>
                        <div style={styles.quickAlertButtons}>
                          <button
                            type="button"
                            style={styles.quickAlertButton}
                            onClick={() => setQuickTarget(-5)}
                          >
                            -5%
                          </button>
                          <button
                            type="button"
                            style={styles.quickAlertButton}
                            onClick={() => setQuickTarget(-2)}
                          >
                            -2%
                          </button>
                          <button
                            type="button"
                            style={styles.quickAlertButton}
                            onClick={() => setQuickTarget(2)}
                          >
                            +2%
                          </button>
                          <button
                            type="button"
                            style={styles.quickAlertButton}
                            onClick={() => setQuickTarget(5)}
                          >
                            +5%
                          </button>
                        </div>
                        <button
                          type="submit"
                          style={styles.alertSubmitButton}
                          disabled={createAlert.isPending}
                        >
                          {createAlert.isPending ? 'Creating...' : 'Create Alert'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="quote-stats" style={styles.statsGrid}>
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

            <div className="quote-stats" style={styles.statsGrid}>
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
