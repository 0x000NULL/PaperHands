import { type CSSProperties, type ReactNode } from 'react';
import { theme } from '../../theme/constants';

export interface StickyActionBarProps {
  children: ReactNode;
  className?: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'sticky',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    paddingBottom: `calc(${theme.spacing.md} + env(safe-area-inset-bottom, 0px))`,
    backgroundColor: theme.colors.bgSecondary,
    borderTop: `1px solid ${theme.colors.border}`,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 100,
  },
};

export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div style={styles.container} className={className}>
      {children}
    </div>
  );
}

// A convenience wrapper for action bar with estimate + button layout
export interface StickyTradeBarProps {
  estimateLabel: string;
  estimateValue: ReactNode;
  children: ReactNode;
  className?: string;
}

const tradeBarStyles: Record<string, CSSProperties> = {
  container: {
    position: 'sticky',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
    paddingBottom: `calc(${theme.spacing.md} + env(safe-area-inset-bottom, 0px))`,
    backgroundColor: theme.colors.bgSecondary,
    borderTop: `1px solid ${theme.colors.border}`,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  estimateRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estimateLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  estimateValue: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.textPrimary,
  },
};

export function StickyTradeBar({
  estimateLabel,
  estimateValue,
  children,
  className,
}: StickyTradeBarProps) {
  return (
    <div style={tradeBarStyles.container} className={className}>
      <div style={tradeBarStyles.estimateRow}>
        <span style={tradeBarStyles.estimateLabel}>{estimateLabel}</span>
        <span style={tradeBarStyles.estimateValue}>{estimateValue}</span>
      </div>
      {children}
    </div>
  );
}
