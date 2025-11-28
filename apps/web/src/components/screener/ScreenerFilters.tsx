import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useWatchlistStore } from '../../store/watchlistStore';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} 0`,
    borderTop: `1px solid ${theme.colors.border}`,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  row: {
    display: 'flex',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    minWidth: '60px',
  },
  input: {
    flex: 1,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.xs,
    fontFamily: theme.typography.fontMono,
    maxWidth: '80px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    cursor: 'pointer',
  },
  checkboxInput: {
    accentColor: theme.colors.accent,
  },
  checkboxLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
  },
  clearButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: theme.colors.textTertiary,
    fontSize: theme.typography.xs,
    cursor: 'pointer',
    padding: theme.spacing.xs,
  },
};

export function ScreenerFilters() {
  const { filters, setFilter, resetFilters, activePreset } = useWatchlistStore();

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <span style={styles.label}>Price</span>
        <input
          type="number"
          placeholder="Min"
          value={filters.priceMin}
          onChange={(e) => setFilter('priceMin', e.target.value)}
          style={styles.input}
          disabled={!!activePreset}
        />
        <span style={{ color: theme.colors.textTertiary }}>-</span>
        <input
          type="number"
          placeholder="Max"
          value={filters.priceMax}
          onChange={(e) => setFilter('priceMax', e.target.value)}
          style={styles.input}
          disabled={!!activePreset}
        />
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Volume</span>
        <input
          type="number"
          placeholder="Min"
          value={filters.volumeMin}
          onChange={(e) => setFilter('volumeMin', e.target.value)}
          style={styles.input}
          disabled={!!activePreset}
        />
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Change %</span>
        <input
          type="number"
          placeholder="Min"
          value={filters.changeMin}
          onChange={(e) => setFilter('changeMin', e.target.value)}
          style={styles.input}
          disabled={!!activePreset}
        />
        <span style={{ color: theme.colors.textTertiary }}>-</span>
        <input
          type="number"
          placeholder="Max"
          value={filters.changeMax}
          onChange={(e) => setFilter('changeMax', e.target.value)}
          style={styles.input}
          disabled={!!activePreset}
        />
      </div>

      <div style={styles.row}>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={filters.nearHigh}
            onChange={(e) => setFilter('nearHigh', e.target.checked)}
            style={styles.checkboxInput}
            disabled={!!activePreset}
          />
          <span style={styles.checkboxLabel}>Near Day High</span>
        </label>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={filters.nearLow}
            onChange={(e) => setFilter('nearLow', e.target.checked)}
            style={styles.checkboxInput}
            disabled={!!activePreset}
          />
          <span style={styles.checkboxLabel}>Near Day Low</span>
        </label>
        <button style={styles.clearButton} onClick={resetFilters}>
          Clear
        </button>
      </div>
    </div>
  );
}
