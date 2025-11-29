import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';

interface ExpirationTabsProps {
  expirations: string[];
  selected: string;
  onChange: (expiration: string) => void;
  maxTabs?: number;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    gap: theme.spacing.xs,
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  button: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: 'transparent',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontFamily: theme.typography.fontFamily,
    cursor: 'pointer',
    transition: theme.transitions.fast,
    whiteSpace: 'nowrap',
  },
  activeButton: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
  },
};

function formatExpiration(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const currentYear = new Date().getFullYear();
  const expYear = date.getFullYear();

  // Only show year if it's different from current year
  if (expYear !== currentYear) {
    const shortYear = expYear.toString().slice(-2);
    return `${month} ${day} '${shortYear}`;
  }
  return `${month} ${day}`;
}

export function ExpirationTabs({
  expirations,
  selected,
  onChange,
  maxTabs = 6,
}: ExpirationTabsProps) {
  // Show only the first maxTabs expirations
  const visibleExpirations = expirations.slice(0, maxTabs);

  return (
    <div style={styles.container}>
      {visibleExpirations.map((exp) => (
        <button
          key={exp}
          onClick={() => onChange(exp)}
          style={{
            ...styles.button,
            ...(selected === exp ? styles.activeButton : {}),
          }}
        >
          {formatExpiration(exp)}
        </button>
      ))}
    </div>
  );
}
