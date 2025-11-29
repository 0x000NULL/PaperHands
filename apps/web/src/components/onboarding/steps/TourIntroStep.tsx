import type { CSSProperties } from 'react';
import { theme } from '../../../theme/constants';

interface TourIntroStepProps {
  onTakeTour: () => void;
  onSkip: () => void;
  onBack: () => void;
}

const tourHighlights = [
  { icon: '📊', title: 'Portfolio Dashboard', desc: 'Track your positions and P&L' },
  { icon: '🔍', title: 'Real-Time Quotes', desc: 'Search any stock for live data' },
  { icon: '📈', title: 'Trading', desc: 'Place orders with different types' },
  { icon: '⚡', title: 'Options Chain', desc: 'Explore and trade options' },
];

const styles: Record<string, CSSProperties> = {
  container: {
    padding: theme.spacing.md,
    textAlign: 'center',
  },
  title: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  highlightsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    textAlign: 'left',
  },
  highlight: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.border}`,
  },
  highlightIcon: {
    fontSize: theme.typography['2xl'],
    marginBottom: theme.spacing.sm,
  },
  highlightTitle: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  highlightDesc: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  backButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: 'transparent',
    color: theme.colors.textSecondary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    cursor: 'pointer',
    fontSize: theme.typography.sm,
  },
  skipButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: 'transparent',
    color: theme.colors.textTertiary,
    border: 'none',
    cursor: 'pointer',
    fontSize: theme.typography.sm,
  },
  tourButton: {
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    border: 'none',
    borderRadius: theme.radius.md,
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
    boxShadow: theme.shadows.glow,
  },
  rightButtons: {
    display: 'flex',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
};

export function TourIntroStep({ onTakeTour, onSkip, onBack }: TourIntroStepProps) {
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Ready to Explore?</h2>
      <p style={styles.subtitle}>
        Take a quick tour to learn how to use the platform, or dive right in!
      </p>

      <div style={styles.highlightsGrid}>
        {tourHighlights.map((item) => (
          <div key={item.title} style={styles.highlight}>
            <div style={styles.highlightIcon}>{item.icon}</div>
            <div style={styles.highlightTitle}>{item.title}</div>
            <div style={styles.highlightDesc}>{item.desc}</div>
          </div>
        ))}
      </div>

      <div style={styles.buttonRow}>
        <button style={styles.backButton} onClick={onBack}>
          Back
        </button>
        <div style={styles.rightButtons}>
          <button style={styles.skipButton} onClick={onSkip}>
            Skip & Go to Dashboard
          </button>
          <button style={styles.tourButton} onClick={onTakeTour}>
            Take the Tour
          </button>
        </div>
      </div>
    </div>
  );
}
