import { useState, type CSSProperties, type FormEvent } from 'react';
import { theme } from '../../theme/constants';

interface AddSymbolInputProps {
  onAdd: (symbol: string) => Promise<void>;
  isLoading: boolean;
}

const styles: Record<string, CSSProperties> = {
  form: {
    display: 'flex',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
    textTransform: 'uppercase' as const,
  },
  button: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    border: 'none',
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export function AddSymbolInput({ onAdd, isLoading }: AddSymbolInputProps) {
  const [symbol, setSymbol] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = symbol.trim().toUpperCase();
    if (!trimmed) return;

    if (!/^[A-Z]{1,10}$/.test(trimmed)) {
      setError('Invalid symbol format');
      return;
    }

    try {
      await onAdd(trimmed);
      setSymbol('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add symbol');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <input
        type="text"
        value={symbol}
        onChange={(e) => {
          setSymbol(e.target.value.toUpperCase());
          setError('');
        }}
        placeholder="Add symbol (e.g., AAPL)"
        style={styles.input}
        maxLength={10}
        disabled={isLoading}
      />
      <button
        type="submit"
        style={{
          ...styles.button,
          ...(isLoading || !symbol.trim() ? styles.buttonDisabled : {}),
        }}
        disabled={isLoading || !symbol.trim()}
      >
        {isLoading ? 'Adding...' : 'Add'}
      </button>
      {error && (
        <span style={{ color: theme.colors.negative, fontSize: theme.typography.xs }}>
          {error}
        </span>
      )}
    </form>
  );
}
