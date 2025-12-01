import { type CSSProperties } from 'react';
import { theme } from '../../theme/constants';

export interface QuickQuantityButtonsProps {
  onAdd: (amount: number) => void;
  onSet?: (amount: number) => void;
  amounts?: number[];
  maxQuantity?: number;
  showMax?: boolean;
  className?: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  button: {
    minWidth: '48px',
    minHeight: '44px', // Touch target minimum
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.bgTertiary,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
    flex: 1,
  },
  maxButton: {
    minWidth: '56px',
    minHeight: '44px',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: `1px solid ${theme.colors.accent}`,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accentDim,
    color: theme.colors.accent,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
    transition: theme.transitions.fast,
    flex: 1,
  },
};

const DEFAULT_AMOUNTS = [1, 10, 100];

export function QuickQuantityButtons({
  onAdd,
  onSet,
  amounts = DEFAULT_AMOUNTS,
  maxQuantity,
  showMax = true,
  className,
}: QuickQuantityButtonsProps) {
  const handleMaxClick = () => {
    if (maxQuantity !== undefined && onSet) {
      onSet(maxQuantity);
    } else if (maxQuantity !== undefined && onAdd) {
      // If no onSet, just add the max (less useful but fallback)
      onAdd(maxQuantity);
    }
  };

  return (
    <div style={styles.container} className={className}>
      {amounts.map((amount) => (
        <button
          key={amount}
          style={styles.button}
          onClick={() => onAdd(amount)}
          type="button"
        >
          +{amount}
        </button>
      ))}
      {showMax && maxQuantity !== undefined && maxQuantity > 0 && (
        <button
          style={styles.maxButton}
          onClick={handleMaxClick}
          type="button"
        >
          MAX
        </button>
      )}
    </div>
  );
}
