import { type CSSProperties } from 'react';
import { theme } from '../../theme/constants';

export interface TabOption<T extends string> {
  value: T;
  label: string;
  badge?: number | string;
}

export interface TabToggleProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.md,
    padding: '4px',
    gap: '4px',
  },
  button: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    minHeight: '44px', // Touch target minimum
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    border: 'none',
    borderRadius: theme.radius.sm,
    backgroundColor: 'transparent',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  buttonActive: {
    backgroundColor: theme.colors.bgTertiary,
    color: theme.colors.accent,
    boxShadow: theme.shadows.sm,
  },
  badge: {
    padding: `2px ${theme.spacing.xs}`,
    fontSize: theme.typography.xs,
    backgroundColor: theme.colors.bgPrimary,
    borderRadius: theme.radius.sm,
    color: theme.colors.textSecondary,
  },
  badgeActive: {
    backgroundColor: theme.colors.accentDim,
    color: theme.colors.accent,
  },
};

export function TabToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: TabToggleProps<T>) {
  return (
    <div style={styles.container} className={className}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            style={{
              ...styles.button,
              ...(isActive ? styles.buttonActive : {}),
            }}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.badge !== undefined && (
              <span
                style={{
                  ...styles.badge,
                  ...(isActive ? styles.badgeActive : {}),
                }}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
