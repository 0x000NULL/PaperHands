import { useState, type CSSProperties } from 'react';
import { theme } from '../../../theme/constants';

interface CashSetupStepProps {
  onNext: (data: { startingCash: number }) => void;
  onBack: () => void;
  onSkip: () => void;
}

const presets = [
  { value: 10000, label: '$10,000', desc: 'Conservative learner' },
  { value: 25000, label: '$25,000', desc: 'Day trading minimum' },
  { value: 100000, label: '$100,000', desc: 'Default - most flexibility' },
  { value: 500000, label: '$500,000', desc: 'Large portfolio testing' },
];

const styles: Record<string, CSSProperties> = {
  container: {
    padding: theme.spacing.md,
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
  label: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    display: 'block',
  },
  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  preset: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    cursor: 'pointer',
    textAlign: 'left',
    transition: theme.transitions.fast,
  },
  presetSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentGlow,
  },
  presetValue: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  presetDesc: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
  },
  customContainer: {
    marginBottom: theme.spacing.lg,
  },
  customInput: {
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.lg,
    fontFamily: theme.typography.fontMono,
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
  nextButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    border: 'none',
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
  },
  rightButtons: {
    display: 'flex',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
};

export function CashSetupStep({ onNext, onBack, onSkip }: CashSetupStepProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(100000);
  const [customValue, setCustomValue] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const getCurrentValue = () => {
    if (isCustom) {
      const parsed = parseInt(customValue.replace(/[^0-9]/g, ''), 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return selectedPreset || 100000;
  };

  const handlePresetClick = (value: number) => {
    setSelectedPreset(value);
    setIsCustom(false);
    setCustomValue('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsCustom(true);
    setSelectedPreset(null);
    // Format as currency
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw) {
      const num = parseInt(raw, 10);
      setCustomValue(num.toLocaleString());
    } else {
      setCustomValue('');
    }
  };

  const handleNext = () => {
    const value = getCurrentValue();
    if (value >= 1000 && value <= 10000000) {
      onNext({ startingCash: value });
    }
  };

  const currentValue = getCurrentValue();
  const isValid = currentValue >= 1000 && currentValue <= 10000000;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Set Up Your Practice Account</h2>
      <p style={styles.subtitle}>
        Choose how much virtual cash you want to start with.
      </p>

      <label style={styles.label}>Starting Cash Balance</label>
      <div style={styles.presetsGrid}>
        {presets.map((preset) => (
          <button
            key={preset.value}
            style={{
              ...styles.preset,
              ...(selectedPreset === preset.value && !isCustom && styles.presetSelected),
            }}
            onClick={() => handlePresetClick(preset.value)}
          >
            <div style={styles.presetValue}>{preset.label}</div>
            <div style={styles.presetDesc}>{preset.desc}</div>
          </button>
        ))}
      </div>

      <div style={styles.customContainer}>
        <label style={styles.label}>Or enter a custom amount ($1,000 - $10,000,000)</label>
        <input
          type="text"
          placeholder="Enter amount..."
          value={customValue}
          onChange={handleCustomChange}
          style={{
            ...styles.customInput,
            ...(isCustom && { borderColor: theme.colors.accent }),
          }}
        />
      </div>

      <div style={styles.buttonRow}>
        <button style={styles.backButton} onClick={onBack}>
          Back
        </button>
        <div style={styles.rightButtons}>
          <button style={styles.skipButton} onClick={onSkip}>
            Skip
          </button>
          <button
            style={{
              ...styles.nextButton,
              ...(!isValid && { opacity: 0.5, cursor: 'not-allowed' }),
            }}
            onClick={handleNext}
            disabled={!isValid}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
