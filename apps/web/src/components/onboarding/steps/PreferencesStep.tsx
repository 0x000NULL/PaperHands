import { useState, type CSSProperties } from 'react';
import { theme } from '../../../theme/constants';
import type { OrderType, TimeInForce, CostBasisMethod } from '../../../types';

interface PreferencesStepProps {
  onNext: (data: {
    defaultOrderType: OrderType;
    defaultTimeInForce: TimeInForce;
    defaultCostBasisMethod: CostBasisMethod;
  }) => void;
  onBack: () => void;
  onSkip: () => void;
}

const orderTypes: { value: OrderType; label: string; desc: string }[] = [
  { value: 'market', label: 'Market', desc: 'Executes immediately at current price' },
  { value: 'limit', label: 'Limit', desc: 'Only executes at your specified price or better' },
  { value: 'stop', label: 'Stop', desc: 'Triggers when price reaches stop level' },
  { value: 'stop_limit', label: 'Stop Limit', desc: 'Stop order with a limit price' },
];

const timeInForceOptions: { value: TimeInForce; label: string; desc: string }[] = [
  { value: 'day', label: 'Day', desc: 'Expires at end of trading day' },
  { value: 'gtc', label: 'GTC', desc: 'Good til cancelled (up to 90 days)' },
  { value: 'ioc', label: 'IOC', desc: 'Immediate or cancel' },
  { value: 'fok', label: 'FOK', desc: 'Fill or kill' },
];

const costBasisMethods: { value: CostBasisMethod; label: string; desc: string }[] = [
  { value: 'fifo', label: 'FIFO', desc: 'First In, First Out - sells oldest shares first' },
  { value: 'lifo', label: 'LIFO', desc: 'Last In, First Out - sells newest shares first' },
  { value: 'hifo', label: 'HIFO', desc: 'Highest In, First Out - minimizes taxes' },
  { value: 'specific', label: 'Specific ID', desc: 'Choose which lots to sell manually' },
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
  section: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    display: 'block',
    fontWeight: theme.typography.medium,
  },
  selectContainer: {
    position: 'relative',
  },
  select: {
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.base,
    appearance: 'none',
    cursor: 'pointer',
  },
  selectArrow: {
    position: 'absolute',
    right: theme.spacing.md,
    top: '50%',
    transform: 'translateY(-50%)',
    color: theme.colors.textSecondary,
    pointerEvents: 'none',
  },
  hint: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
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

export function PreferencesStep({ onNext, onBack, onSkip }: PreferencesStepProps) {
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('day');
  const [costBasis, setCostBasis] = useState<CostBasisMethod>('fifo');

  const handleNext = () => {
    onNext({
      defaultOrderType: orderType,
      defaultTimeInForce: timeInForce,
      defaultCostBasisMethod: costBasis,
    });
  };

  const getHint = (options: { value: string; desc: string }[], selected: string) => {
    return options.find((o) => o.value === selected)?.desc || '';
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Set Your Trading Defaults</h2>
      <p style={styles.subtitle}>
        These settings can be changed anytime in Settings.
      </p>

      <div style={styles.section}>
        <label style={styles.label}>Default Order Type</label>
        <div style={styles.selectContainer as CSSProperties}>
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as OrderType)}
            style={styles.select}
          >
            {orderTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span style={styles.selectArrow as CSSProperties}>▼</span>
        </div>
        <p style={styles.hint}>{getHint(orderTypes, orderType)}</p>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Time in Force</label>
        <div style={styles.selectContainer as CSSProperties}>
          <select
            value={timeInForce}
            onChange={(e) => setTimeInForce(e.target.value as TimeInForce)}
            style={styles.select}
          >
            {timeInForceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span style={styles.selectArrow as CSSProperties}>▼</span>
        </div>
        <p style={styles.hint}>{getHint(timeInForceOptions, timeInForce)}</p>
      </div>

      <div style={styles.section}>
        <label style={styles.label}>Cost Basis Method</label>
        <div style={styles.selectContainer as CSSProperties}>
          <select
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value as CostBasisMethod)}
            style={styles.select}
          >
            {costBasisMethods.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span style={styles.selectArrow as CSSProperties}>▼</span>
        </div>
        <p style={styles.hint}>{getHint(costBasisMethods, costBasis)}</p>
      </div>

      <div style={styles.buttonRow}>
        <button style={styles.backButton} onClick={onBack}>
          Back
        </button>
        <div style={styles.rightButtons}>
          <button style={styles.skipButton} onClick={onSkip}>
            Skip
          </button>
          <button style={styles.nextButton} onClick={handleNext}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
