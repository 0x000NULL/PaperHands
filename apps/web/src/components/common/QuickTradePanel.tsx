import { useState, useEffect, useRef, useLayoutEffect, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useQuote, usePlaceOrder, useMarketStatus } from '../../hooks';
import { SymbolAutocomplete } from './SymbolAutocomplete';
import { useQuickTradePanel } from '../../store/quickTradePanelStore';
import type { OrderType, TimeInForce } from '../../types';

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9998,
  },
  panel: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadows.xl,
    width: '100%',
    maxWidth: '400px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  title: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.textSecondary,
    cursor: 'pointer',
    padding: theme.spacing.xs,
    fontSize: theme.typography.lg,
    lineHeight: 1,
  },
  content: {
    padding: theme.spacing.md,
    overflowY: 'auto',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  sideToggle: {
    display: 'flex',
    gap: theme.spacing.sm,
  },
  sideButton: {
    flex: 1,
    padding: theme.spacing.sm,
    border: 'none',
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.bold,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgInput,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.base,
    outline: 'none',
  },
  select: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgInput,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.base,
    outline: 'none',
    cursor: 'pointer',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.sm,
  },
  estimate: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
  },
  estimateLabel: {
    color: theme.colors.textSecondary,
  },
  estimateValue: {
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.semibold,
    fontFamily: theme.typography.fontMono,
  },
  submitButton: {
    padding: theme.spacing.md,
    border: 'none',
    borderRadius: theme.radius.md,
    fontSize: theme.typography.base,
    fontWeight: theme.typography.bold,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  quoteInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
  },
  price: {
    fontFamily: theme.typography.fontMono,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
  },
  change: {
    fontFamily: theme.typography.fontMono,
  },
};

export function QuickTradePanel() {
  const { isOpen, initialSymbol, close } = useQuickTradePanel();
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('day');
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: quote } = useQuote(symbol, !!symbol);
  const { data: marketStatus } = useMarketStatus();
  const { mutate: placeOrder, isPending } = usePlaceOrder();

  // Sync symbol when panel opens with an initial symbol
  useLayoutEffect(() => {
    if (isOpen && initialSymbol) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSymbol(initialSymbol);
    }
  }, [isOpen, initialSymbol]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, close]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !quantity) return;

    placeOrder(
      {
        symbol,
        side,
        quantity,
        orderType,
        limitPrice: orderType === 'limit' ? parseFloat(limitPrice) : undefined,
        timeInForce,
      },
      {
        onSuccess: () => {
          close();
          setSymbol('');
          setQuantity(1);
          setLimitPrice('');
        },
      }
    );
  };

  if (!isOpen) return null;

  const estimatedCost = quote ? quote.last * quantity : 0;
  const isMarketOpen = marketStatus?.status === 'open';

  return (
    <div style={styles.overlay} onClick={close}>
      <div
        ref={panelRef}
        style={styles.panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <h2 style={styles.title}>Quick Trade</h2>
          <button
            style={styles.closeButton}
            onClick={close}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div style={styles.content}>
          <form style={styles.form} onSubmit={handleSubmit}>
            {/* Symbol Search */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Symbol</label>
              <SymbolAutocomplete
                value={symbol}
                onChange={(s) => setSymbol(s)}
                placeholder="Enter symbol..."
                autoFocus
              />
            </div>

            {/* Quote Info */}
            {quote && (
              <div style={styles.quoteInfo}>
                <span style={styles.price}>
                  ${quote.last.toFixed(2)}
                </span>
                <span
                  style={{
                    ...styles.change,
                    color: quote.change >= 0 ? theme.colors.positive : theme.colors.negative,
                  }}
                >
                  {quote.change >= 0 ? '+' : ''}
                  {quote.change.toFixed(2)} ({quote.change_percentage.toFixed(2)}%)
                </span>
              </div>
            )}

            {/* Buy/Sell Toggle */}
            <div style={styles.sideToggle}>
              <button
                type="button"
                style={{
                  ...styles.sideButton,
                  backgroundColor: side === 'buy' ? theme.colors.positive : theme.colors.bgTertiary,
                  color: side === 'buy' ? '#000' : theme.colors.textSecondary,
                }}
                onClick={() => setSide('buy')}
              >
                Buy
              </button>
              <button
                type="button"
                style={{
                  ...styles.sideButton,
                  backgroundColor: side === 'sell' ? theme.colors.negative : theme.colors.bgTertiary,
                  color: side === 'sell' ? '#fff' : theme.colors.textSecondary,
                }}
                onClick={() => setSide('sell')}
              >
                Sell
              </button>
            </div>

            {/* Quantity and Order Type */}
            <div style={styles.row}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  style={styles.input}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Type</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as OrderType)}
                  style={styles.select}
                >
                  <option value="market">Market</option>
                  <option value="limit">Limit</option>
                </select>
              </div>
            </div>

            {/* Limit Price (if limit order) */}
            {orderType === 'limit' && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Limit Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  style={styles.input}
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Time in Force */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Time in Force</label>
              <select
                value={timeInForce}
                onChange={(e) => setTimeInForce(e.target.value as TimeInForce)}
                style={styles.select}
              >
                <option value="day">Day</option>
                <option value="gtc">Good Till Cancelled</option>
              </select>
            </div>

            {/* Estimated Cost */}
            <div style={styles.estimate}>
              <span style={styles.estimateLabel}>
                Est. {side === 'buy' ? 'Cost' : 'Credit'}
              </span>
              <span style={styles.estimateValue}>
                ${estimatedCost.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!symbol || isPending}
              style={{
                ...styles.submitButton,
                backgroundColor:
                  side === 'buy' ? theme.colors.positive : theme.colors.negative,
                color: side === 'buy' ? '#000' : '#fff',
                opacity: !symbol || isPending ? 0.5 : 1,
                cursor: !symbol || isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {isPending
                ? 'Placing Order...'
                : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol || 'Stock'}`}
            </button>

            {/* Market Status Warning */}
            {!isMarketOpen && (
              <div
                style={{
                  padding: theme.spacing.sm,
                  backgroundColor: 'rgba(255, 200, 0, 0.1)',
                  color: theme.colors.warning,
                  borderRadius: theme.radius.sm,
                  fontSize: theme.typography.xs,
                  textAlign: 'center',
                }}
              >
                Market is currently closed. Orders will be queued.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
