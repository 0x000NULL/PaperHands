import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import type { OptionContract } from '../../types';

interface OptionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: OptionContract | null;
  onTrade: (contract: OptionContract, side: 'buy' | 'sell') => void;
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
  buttons: {
    display: 'flex',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
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
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    margin: `${theme.spacing.lg} 0`,
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
  onTrade,
}: OptionDetailModalProps) {
  if (!isOpen || !contract) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const spread = contract.ask - contract.bid;

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
        </div>

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
        )}

        <div style={styles.divider} />

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

        {/* Action Buttons */}
        <div style={styles.buttons}>
          <button
            style={{ ...styles.button, ...styles.closeButton }}
            onClick={onClose}
          >
            Close
          </button>
          <button
            style={{ ...styles.button, ...styles.sellButton }}
            onClick={() => onTrade(contract, 'sell')}
          >
            Sell
          </button>
          <button
            style={{ ...styles.button, ...styles.buyButton }}
            onClick={() => onTrade(contract, 'buy')}
          >
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}
