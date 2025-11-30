import { type CSSProperties } from 'react';
import { theme } from '../../theme/constants';

export type AllocationViewType = 'position' | 'sector';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  tab: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: 'transparent',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  tabActive: {
    backgroundColor: theme.colors.bgTertiary,
    borderColor: theme.colors.accent,
    color: theme.colors.accent,
  },
};

interface AllocationViewTabsProps {
  value: AllocationViewType;
  onChange: (view: AllocationViewType) => void;
}

export function AllocationViewTabs({ value, onChange }: AllocationViewTabsProps) {
  return (
    <div style={styles.container}>
      <button
        style={{
          ...styles.tab,
          ...(value === 'position' ? styles.tabActive : {}),
        }}
        onClick={() => onChange('position')}
      >
        By Position
      </button>
      <button
        style={{
          ...styles.tab,
          ...(value === 'sector' ? styles.tabActive : {}),
        }}
        onClick={() => onChange('sector')}
      >
        By Sector
      </button>
    </div>
  );
}
