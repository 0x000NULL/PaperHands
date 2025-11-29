import { type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useThemeStore, type ThemeMode } from '../../store/themeStore';
import { useUpdateTheme } from '../../hooks/useSettings';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    marginBottom: theme.spacing.md,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.medium,
    color: theme.colors.textPrimary,
  },
  themeOptions: {
    display: 'flex',
    gap: theme.spacing.md,
  },
  themeOption: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.bgTertiary,
    border: `2px solid ${theme.colors.border}`,
    borderRadius: theme.radius.lg,
    cursor: 'pointer',
    transition: theme.transitions.fast,
    textAlign: 'center' as const,
  },
  themeOptionActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.bgHover,
  },
  themePreview: {
    width: '100%',
    height: 60,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: theme.typography['2xl'],
  },
  darkPreview: {
    backgroundColor: '#0a0a0f',
    border: '1px solid #2a2a3e',
  },
  lightPreview: {
    backgroundColor: '#f5f5f7',
    border: '1px solid #d0d0d8',
  },
  themeLabel: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.textPrimary,
  },
  themeHint: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
  checkmark: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    fontSize: theme.typography.xs,
    position: 'absolute' as const,
    top: theme.spacing.sm,
    right: theme.spacing.sm,
  },
  optionWrapper: {
    position: 'relative' as const,
    flex: 1,
  },
};

export function DisplaySettings() {
  const { mode, setMode } = useThemeStore();
  const updateThemeMutation = useUpdateTheme();

  const handleThemeChange = (newMode: ThemeMode) => {
    // Update local store immediately for instant feedback
    setMode(newMode);
    // Sync to backend
    updateThemeMutation.mutate({ theme: newMode });
  };

  return (
    <div style={styles.container}>
      <p style={styles.description}>
        Choose your preferred theme. Your preference will be saved and synced across devices.
      </p>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Theme</h3>
        <div style={styles.themeOptions}>
          <div style={styles.optionWrapper}>
            <div
              style={{
                ...styles.themeOption,
                ...(mode === 'dark' ? styles.themeOptionActive : {}),
              }}
              onClick={() => handleThemeChange('dark')}
            >
              {mode === 'dark' && <span style={styles.checkmark}>&#10003;</span>}
              <div style={{ ...styles.themePreview, ...styles.darkPreview }}>
                &#9790;
              </div>
              <div style={styles.themeLabel}>Dark</div>
              <div style={styles.themeHint}>Easy on the eyes</div>
            </div>
          </div>

          <div style={styles.optionWrapper}>
            <div
              style={{
                ...styles.themeOption,
                ...(mode === 'light' ? styles.themeOptionActive : {}),
              }}
              onClick={() => handleThemeChange('light')}
            >
              {mode === 'light' && <span style={styles.checkmark}>&#10003;</span>}
              <div style={{ ...styles.themePreview, ...styles.lightPreview }}>
                &#9788;
              </div>
              <div style={styles.themeLabel}>Light</div>
              <div style={styles.themeHint}>Bright and clean</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
