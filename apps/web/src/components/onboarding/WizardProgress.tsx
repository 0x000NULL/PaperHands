import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  step: {
    flex: 1,
    height: '4px',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.bgTertiary,
    transition: theme.transitions.fast,
  },
  stepActive: {
    backgroundColor: theme.colors.accent,
    boxShadow: theme.shadows.glow,
  },
  stepCompleted: {
    backgroundColor: theme.colors.accent,
  },
  stepLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  labelText: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
  },
};

export function WizardProgress({ currentStep, totalSteps }: WizardProgressProps) {
  return (
    <div>
      <div style={styles.container}>
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;

          return (
            <div
              key={i}
              style={{
                ...styles.step,
                ...(isCompleted && styles.stepCompleted),
                ...(isActive && styles.stepActive),
              }}
            />
          );
        })}
      </div>
      <div style={styles.stepLabel}>
        <span style={styles.labelText}>Step {currentStep} of {totalSteps}</span>
      </div>
    </div>
  );
}
