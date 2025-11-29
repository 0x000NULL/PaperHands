import { useState, type CSSProperties } from 'react';
import { theme } from '../../../theme/constants';

interface WelcomeStepProps {
  onNext: (data: { userIntent: string }) => void;
}

const intents = [
  { id: 'stocks', label: 'Learning to trade stocks' },
  { id: 'options', label: 'Exploring options strategies' },
  { id: 'testing', label: 'Testing a new trading system' },
  { id: 'exploring', label: 'Just exploring' },
];

const styles: Record<string, CSSProperties> = {
  container: {
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography['2xl'],
    fontWeight: theme.typography.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.typography.base,
    color: theme.colors.textSecondary,
    lineHeight: 1.6,
    marginBottom: theme.spacing.xl,
    maxWidth: '420px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  question: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
    maxWidth: '340px',
    margin: '0 auto',
    marginBottom: theme.spacing.xl,
  },
  option: {
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.bgTertiary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    cursor: 'pointer',
    textAlign: 'left',
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    transition: theme.transitions.fast,
  },
  optionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentGlow,
  },
  button: {
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    border: 'none',
    borderRadius: theme.radius.md,
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);

  const handleNext = () => {
    if (selectedIntent) {
      onNext({ userIntent: selectedIntent });
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome to Paper Trading</h1>
      <p style={styles.subtitle}>
        Practice trading stocks and options with $100,000 in virtual cash. Track your
        performance, learn the Greeks, and build confidence before risking real money.
      </p>

      <p style={styles.question}>What brings you here today?</p>

      <div style={styles.optionsContainer}>
        {intents.map((intent) => (
          <button
            key={intent.id}
            style={{
              ...styles.option,
              ...(selectedIntent === intent.id && styles.optionSelected),
            }}
            onClick={() => setSelectedIntent(intent.id)}
          >
            {intent.label}
          </button>
        ))}
      </div>

      <button
        style={{
          ...styles.button,
          ...(!selectedIntent && styles.buttonDisabled),
        }}
        onClick={handleNext}
        disabled={!selectedIntent}
      >
        Get Started
      </button>
    </div>
  );
}
