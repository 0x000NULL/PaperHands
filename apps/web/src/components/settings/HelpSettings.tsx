import { type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme } from '../../theme/constants';
import { useOnboardingStore } from '../../store/onboardingStore';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xl,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.lg,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  icon: {
    fontSize: theme.typography.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
  },
  description: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 1.6,
  },
  button: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
    border: 'none',
    alignSelf: 'flex-start',
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
  },
  linkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  link: {
    color: theme.colors.accent,
    fontSize: theme.typography.sm,
    textDecoration: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
};

export function HelpSettings() {
  const navigate = useNavigate();
  const { startTour } = useOnboardingStore();

  const handleReplayTour = () => {
    // Navigate to dashboard first, then start tour
    navigate('/');
    // Small delay to ensure navigation completes
    setTimeout(() => {
      startTour();
    }, 100);
  };

  return (
    <div style={styles.container}>
      {/* Tour Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.icon}>&#127919;</span>
          <h3 style={styles.sectionTitle}>Product Tour</h3>
        </div>
        <p style={styles.description}>
          Take a guided tour of PaperHands to learn about all the features available to you.
          The tour highlights key areas like portfolio tracking, quote panels, trade forms, and options chains.
        </p>
        <button
          style={{ ...styles.button, ...styles.primaryButton }}
          onClick={handleReplayTour}
        >
          Replay Tour
        </button>
      </div>

      {/* Quick Links Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.icon}>&#128279;</span>
          <h3 style={styles.sectionTitle}>Quick Links</h3>
        </div>
        <div style={styles.linkList}>
          <a
            style={styles.link}
            href="https://github.com/anthropics/claude-code/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            &#8599; Report an Issue
          </a>
        </div>
      </div>

      {/* About Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.icon}>&#128196;</span>
          <h3 style={styles.sectionTitle}>About PaperHands</h3>
        </div>
        <p style={styles.description}>
          PaperHands is a paper trading platform for stocks and options with full tax reporting,
          Greeks analytics, and real-time streaming. Practice trading strategies risk-free with virtual money.
        </p>
      </div>
    </div>
  );
}
