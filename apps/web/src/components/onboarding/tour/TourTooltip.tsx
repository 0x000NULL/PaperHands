import type { CSSProperties } from 'react';
import { theme } from '../../../theme/constants';

interface TourTooltipProps {
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  position: { top: number; left: number };
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const styles: Record<string, CSSProperties> = {
  tooltip: {
    position: 'absolute',
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.accent}`,
    padding: theme.spacing.lg,
    maxWidth: '320px',
    width: '100%',
    boxShadow: `${theme.shadows.lg}, ${theme.shadows.glow}`,
    zIndex: 1002,
  },
  title: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    lineHeight: 1.6,
    marginBottom: theme.spacing.lg,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progress: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
  },
  buttons: {
    display: 'flex',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  skipButton: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: 'transparent',
    color: theme.colors.textTertiary,
    border: 'none',
    cursor: 'pointer',
    fontSize: theme.typography.xs,
  },
  backButton: {
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    backgroundColor: 'transparent',
    color: theme.colors.textSecondary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    cursor: 'pointer',
    fontSize: theme.typography.sm,
  },
  nextButton: {
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    border: 'none',
    borderRadius: theme.radius.sm,
    cursor: 'pointer',
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
  },
};

export function TourTooltip({
  title,
  description,
  currentStep,
  totalSteps,
  position,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
}: TourTooltipProps) {
  return (
    <div
      style={{
        ...styles.tooltip,
        top: position.top,
        left: position.left,
      }}
    >
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.description}>{description}</p>
      <div style={styles.footer}>
        <span style={styles.progress}>
          {currentStep + 1} of {totalSteps}
        </span>
        <div style={styles.buttons}>
          <button style={styles.skipButton} onClick={onSkip}>
            Skip Tour
          </button>
          {!isFirst && (
            <button style={styles.backButton} onClick={onPrev}>
              Back
            </button>
          )}
          <button style={styles.nextButton} onClick={onNext}>
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
