import { useState, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { usePlaceOrder } from '../../hooks/useOrders';
import type { OptionContract } from '../../types';

interface OptionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: OptionContract | null;
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: '480px',
    boxShadow: theme.shadows.lg,
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    margin: 0,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    margin: 0,
  },
  badge: {
    display: 'inline-block',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase' as const,
    marginLeft: theme.spacing.sm,
  },
  callBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    color: theme.colors.positive,
  },
  putBadge: {
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    color: theme.colors.negative,
  },
  itmBadge: {
    backgroundColor: 'rgba(255, 165, 2, 0.15)',
    color: theme.colors.warning,
    marginLeft: theme.spacing.xs,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: theme.spacing.sm,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing.md,
  },
  greeksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: theme.spacing.md,
  },
  stat: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: theme.spacing.xs,
  },
  statLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
  },
  statValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.base,
    fontFamily: theme.typography.fontMono,
    fontWeight: theme.typography.medium,
  },
  ivValue: {
    color: theme.colors.accent,
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
  },
  tradeSection: {
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    marginBottom: theme.spacing.xs,
    display: 'block',
  },
  input: {
    width: '100%',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.base,
    fontFamily: theme.typography.fontMono,
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTop: `1px solid ${theme.colors.border}`,
    marginTop: theme.spacing.md,
  },
  totalLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  totalValue: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.xl,
    fontFamily: theme.typography.fontMono,
    fontWeight: theme.typography.bold,
  },
  buttons: {
    display: 'flex',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  button: {
    flex: 1,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
    transition: theme.transitions.fast,
    border: 'none',
  },
  buyButton: {
    backgroundColor: theme.colors.positive,
    color: theme.colors.bgPrimary,
  },
  sellButton: {
    backgroundColor: theme.colors.negative,
    color: theme.colors.textPrimary,
  },
  closeButton: {
    backgroundColor: 'transparent',
    color: theme.colors.textSecondary,
    border: `1px solid ${theme.colors.border}`,
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    margin: `${theme.spacing.lg} 0`,
  },
  message: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
    fontSize: theme.typography.sm,
  },
  successMessage: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    color: theme.colors.positive,
  },
  errorMessage: {
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    color: theme.colors.negative,
  },
  contractSymbol: {
    color: theme.colors.textTertiary,
    fontSize: theme.typography.xs,
    fontFamily: theme.typography.fontMono,
    marginTop: theme.spacing.xs,
  },
};

function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return '$' + value.toFixed(2);
}

function formatGreek(value: number | undefined, decimals = 4): string {
  if (value === undefined) return '-';
  return value.toFixed(decimals);
}

function formatPercent(value: number | undefined): string {
  if (value === undefined) return '-';
  return (value * 100).toFixed(1) + '%';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function OptionDetailModal({
  isOpen,
  onClose,
  contract,
}: OptionDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const placeOrder = usePlaceOrder();

  if (!isOpen || !contract) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const spread = contract.ask - contract.bid;
  const midPrice = (contract.bid + contract.ask) / 2;
  // Options are for 100 shares per contract
  const totalCost = midPrice * quantity * 100;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 1000) {
      setQuantity(val);
    } else if (e.target.value === '') {
      setQuantity(1);
    }
  };

  const handleTrade = async (side: 'buy' | 'sell') => {
    setMessage(null);

    try {
      await placeOrder.mutateAsync({
        symbol: contract.symbol,
        side,
        quantity,
        orderType: 'market',
      });

      setMessage({
        type: 'success',
        text: `Successfully ${side === 'buy' ? 'bought' : 'sold'} ${quantity} contract${quantity > 1 ? 's' : ''} of ${contract.symbol}`,
      });

      // Close modal after short delay on success
      setTimeout(() => {
        onClose();
        setMessage(null);
        setQuantity(1);
      }, 1500);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to place order',
      });
    }
  };

  const isLoading = placeOrder.isPending;

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            ${contract.strike.toFixed(2)} {contract.optionType.toUpperCase()}
            <span
              style={{
                ...styles.badge,
                ...(contract.optionType === 'call' ? styles.callBadge : styles.putBadge),
              }}
            >
              {contract.optionType}
            </span>
            {contract.inTheMoney && (
              <span style={{ ...styles.badge, ...styles.itmBadge }}>ITM</span>
            )}
          </h2>
          <p style={styles.subtitle}>
            Expires {formatDate(contract.expiration)}
          </p>
          <p style={styles.contractSymbol}>{contract.symbol}</p>
        </div>

        {/* Message */}
        {message && (
          <div
            style={{
              ...styles.message,
              ...(message.type === 'success' ? styles.successMessage : styles.errorMessage),
            }}
          >
            {message.text}
          </div>
        )}

        {/* Price Info */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Price</div>
          <div style={styles.grid}>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Bid</span>
              <span style={styles.statValue}>{formatPrice(contract.bid)}</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Ask</span>
              <span style={styles.statValue}>{formatPrice(contract.ask)}</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Last</span>
              <span style={styles.statValue}>{formatPrice(contract.last)}</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Spread</span>
              <span style={styles.statValue}>{formatPrice(spread)}</span>
            </div>
          </div>
        </div>

        <div style={styles.divider} />

        {/* Greeks */}
        {contract.greeks && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Greeks</div>
              <div style={styles.greeksGrid}>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Delta</span>
                  <span style={styles.statValue}>
                    {formatGreek(contract.greeks.delta)}
                  </span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Gamma</span>
                  <span style={styles.statValue}>
                    {formatGreek(contract.greeks.gamma)}
                  </span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Theta</span>
                  <span style={styles.statValue}>
                    {formatGreek(contract.greeks.theta)}
                  </span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Vega</span>
                  <span style={styles.statValue}>
                    {formatGreek(contract.greeks.vega)}
                  </span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Rho</span>
                  <span style={styles.statValue}>
                    {formatGreek(contract.greeks.rho)}
                  </span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>IV</span>
                  <span style={{ ...styles.statValue, ...styles.ivValue }}>
                    {formatPercent(contract.greeks.iv)}
                  </span>
                </div>
              </div>
            </div>
            <div style={styles.divider} />
          </>
        )}

        {/* Volume & OI */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Activity</div>
          <div style={styles.grid}>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Volume</span>
              <span style={styles.statValue}>
                {contract.volume.toLocaleString()}
              </span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Open Interest</span>
              <span style={styles.statValue}>
                {contract.openInterest.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Trade Section */}
        <div style={styles.tradeSection}>
          <div style={styles.sectionTitle}>Trade</div>

          <div style={styles.inputRow}>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Contracts</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={quantity}
                onChange={handleQuantityChange}
                style={styles.input}
                disabled={isLoading}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>Price (Mid)</label>
              <input
                type="text"
                value={formatPrice(midPrice)}
                style={styles.input}
                disabled
              />
            </div>
          </div>

          <div style={styles.totalRow}>
            <span style={styles.totalLabel}>
              Total ({quantity} × ${midPrice.toFixed(2)} × 100)
            </span>
            <span style={styles.totalValue}>
              ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.buttons}>
          <button
            style={{ ...styles.button, ...styles.closeButton }}
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            style={{
              ...styles.button,
              ...styles.sellButton,
              ...(isLoading ? styles.disabledButton : {}),
            }}
            onClick={() => handleTrade('sell')}
            disabled={isLoading}
          >
            {isLoading ? 'Placing...' : `Sell ${quantity}`}
          </button>
          <button
            style={{
              ...styles.button,
              ...styles.buyButton,
              ...(isLoading ? styles.disabledButton : {}),
            }}
            onClick={() => handleTrade('buy')}
            disabled={isLoading}
          >
            {isLoading ? 'Placing...' : `Buy ${quantity}`}
          </button>
        </div>
      </div>
    </div>
  );
}
