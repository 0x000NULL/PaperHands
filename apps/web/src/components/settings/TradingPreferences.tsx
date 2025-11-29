import { useState, useEffect, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useSettings, useUpdatePreferences } from '../../hooks/useSettings';

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
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.textPrimary,
  },
  select: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    cursor: 'pointer',
    outline: 'none',
    transition: theme.transitions.fast,
  },
  hint: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
  },
  actions: {
    display: 'flex',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  button: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
    border: 'none',
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  loading: {
    padding: theme.spacing.xl,
    textAlign: 'center' as const,
    color: theme.colors.textSecondary,
  },
};

const orderTypes = [
  { value: 'market', label: 'Market', hint: 'Execute immediately at current price' },
  { value: 'limit', label: 'Limit', hint: 'Execute only at specified price or better' },
  { value: 'stop', label: 'Stop', hint: 'Trigger market order when price reaches stop' },
  { value: 'stop_limit', label: 'Stop Limit', hint: 'Trigger limit order when price reaches stop' },
];

const timeInForceOptions = [
  { value: 'day', label: 'Day', hint: 'Order expires at market close' },
  { value: 'gtc', label: 'Good Till Cancelled', hint: 'Order remains active until filled or cancelled' },
  { value: 'ioc', label: 'Immediate or Cancel', hint: 'Fill immediately or cancel unfilled portion' },
  { value: 'fok', label: 'Fill or Kill', hint: 'Fill completely immediately or cancel entirely' },
];

const costBasisMethods = [
  { value: 'fifo', label: 'FIFO', hint: 'First In, First Out - sell oldest shares first' },
  { value: 'lifo', label: 'LIFO', hint: 'Last In, First Out - sell newest shares first' },
  { value: 'hifo', label: 'HIFO', hint: 'Highest In, First Out - sell highest cost first' },
  { value: 'specific', label: 'Specific ID', hint: 'Choose specific lots to sell' },
];

export function TradingPreferences() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdatePreferences();

  const [orderType, setOrderType] = useState('market');
  const [timeInForce, setTimeInForce] = useState('day');
  const [costBasis, setCostBasis] = useState('fifo');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settings?.trading) {
      setOrderType(settings.trading.defaultOrderType);
      setTimeInForce(settings.trading.defaultTimeInForce);
      setCostBasis(settings.trading.defaultCostBasisMethod);
    }
  }, [settings]);

  const handleChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setIsDirty(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      defaultOrderType: orderType,
      defaultTimeInForce: timeInForce,
      defaultCostBasisMethod: costBasis,
    }, {
      onSuccess: () => setIsDirty(false),
    });
  };

  if (isLoading) {
    return <div style={styles.loading}>Loading preferences...</div>;
  }

  return (
    <div style={styles.container}>
      <p style={styles.description}>
        Set your default trading preferences. These will be pre-selected when placing new orders.
      </p>

      <div style={styles.field}>
        <label style={styles.label}>Default Order Type</label>
        <select
          style={styles.select}
          value={orderType}
          onChange={handleChange(setOrderType)}
        >
          {orderTypes.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span style={styles.hint}>
          {orderTypes.find((o) => o.value === orderType)?.hint}
        </span>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Time in Force</label>
        <select
          style={styles.select}
          value={timeInForce}
          onChange={handleChange(setTimeInForce)}
        >
          {timeInForceOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span style={styles.hint}>
          {timeInForceOptions.find((o) => o.value === timeInForce)?.hint}
        </span>
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Cost Basis Method</label>
        <select
          style={styles.select}
          value={costBasis}
          onChange={handleChange(setCostBasis)}
        >
          {costBasisMethods.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span style={styles.hint}>
          {costBasisMethods.find((o) => o.value === costBasis)?.hint}
        </span>
      </div>

      <div style={styles.actions}>
        <button
          style={{
            ...styles.button,
            ...styles.saveButton,
            ...(!isDirty || updateMutation.isPending ? styles.saveButtonDisabled : {}),
          }}
          onClick={handleSave}
          disabled={!isDirty || updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
