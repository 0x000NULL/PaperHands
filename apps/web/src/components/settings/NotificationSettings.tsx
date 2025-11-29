import { type CSSProperties } from 'react';
import { theme } from '../../theme/constants';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  icon: {
    fontSize: '48px',
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
  },
  description: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    maxWidth: 400,
  },
};

export function NotificationSettings() {
  return (
    <div style={styles.container}>
      <div style={styles.icon}>&#128276;</div>
      <h3 style={styles.title}>Coming Soon</h3>
      <p style={styles.description}>
        Notification preferences will be available in a future update. Stay tuned for alerts on order fills, price movements, and more!
      </p>
    </div>
  );
}
