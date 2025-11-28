import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import type { Timeframe } from '../../types';

const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

interface TimeframeSelectorProps {
  selected: Timeframe;
  onChange: (tf: Timeframe) => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    gap: theme.spacing.xs,
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
  },
  activeButton: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
  },
};

export function TimeframeSelector({
  selected,
  onChange,
}: TimeframeSelectorProps) {
  return (
    <div style={styles.container}>
      {timeframes.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          style={{
            ...styles.button,
            ...(selected === tf ? styles.activeButton : {}),
          }}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
