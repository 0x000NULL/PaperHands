import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useWatchlistStore } from '../../store/watchlistStore';

const presets = [
  { id: 'gainers', label: 'Top Gainers', icon: '↑' },
  { id: 'losers', label: 'Top Losers', icon: '↓' },
  { id: 'active', label: 'Most Active', icon: '📊' },
  { id: 'nearHigh', label: 'Near Highs', icon: '🔝' },
  { id: 'nearLow', label: 'Near Lows', icon: '🔻' },
];

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: theme.spacing.xs,
  },
  button: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.bgTertiary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    cursor: 'pointer',
    transition: theme.transitions.fast,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  buttonActive: {
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    borderColor: theme.colors.accent,
  },
};

export function PrebuiltScreeners() {
  const { activePreset, setActivePreset, resetFilters } = useWatchlistStore();

  const handleClick = (presetId: string) => {
    if (activePreset === presetId) {
      // Toggle off
      resetFilters();
    } else {
      setActivePreset(presetId);
    }
  };

  return (
    <div style={styles.container}>
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => handleClick(preset.id)}
          style={{
            ...styles.button,
            ...(activePreset === preset.id ? styles.buttonActive : {}),
          }}
        >
          <span>{preset.icon}</span>
          <span>{preset.label}</span>
        </button>
      ))}
    </div>
  );
}
