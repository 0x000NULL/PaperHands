import { useState, type CSSProperties } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { theme } from '../../theme/constants';
import { api, VALID_BENCHMARKS, type BenchmarkSymbol } from '../../api/client';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  select: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
    cursor: 'pointer',
    outline: 'none',
    transition: theme.transitions.fast,
  },
};

const BENCHMARK_LABELS: Record<BenchmarkSymbol, string> = {
  SPY: 'S&P 500 (SPY)',
  QQQ: 'Nasdaq 100 (QQQ)',
  DIA: 'Dow Jones (DIA)',
  IWM: 'Russell 2000 (IWM)',
  VTI: 'Total Market (VTI)',
};

interface BenchmarkSelectorProps {
  value: string;
  onChange: (symbol: BenchmarkSymbol) => void;
  onSaveDefault?: boolean;
}

export function BenchmarkSelector({
  value,
  onChange,
  onSaveDefault = false,
}: BenchmarkSelectorProps) {
  const queryClient = useQueryClient();
  const [localValue, setLocalValue] = useState(value);

  const savePreference = useMutation({
    mutationFn: (symbol: BenchmarkSymbol) =>
      api.updateTradingPreferences({ defaultBenchmarkSymbol: symbol }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value as BenchmarkSymbol;
    setLocalValue(newValue);
    onChange(newValue);

    if (onSaveDefault) {
      savePreference.mutate(newValue);
    }
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>vs</span>
      <select
        style={styles.select}
        value={localValue}
        onChange={handleChange}
        title="Select benchmark for comparison"
      >
        {VALID_BENCHMARKS.map((symbol) => (
          <option key={symbol} value={symbol}>
            {BENCHMARK_LABELS[symbol]}
          </option>
        ))}
      </select>
    </div>
  );
}
