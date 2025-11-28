import { useState } from 'react';
import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useDashboardStore } from '../../store/dashboardStore';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgInput,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.base,
    outline: 'none',
    transition: theme.transitions.fast,
  },
  inputFocused: {
    borderColor: theme.colors.borderFocus,
    boxShadow: `0 0 0 2px ${theme.colors.accentGlow}`,
  },
  button: {
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
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

export function SymbolSearch() {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { setSelectedSymbol, resetTradeForm } = useDashboardStore();

  const handleSearch = () => {
    const symbol = inputValue.trim().toUpperCase();
    if (symbol) {
      resetTradeForm();
      setSelectedSymbol(symbol);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div style={styles.container}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Enter symbol (e.g. AAPL)"
        style={{
          ...styles.input,
          ...(isFocused ? styles.inputFocused : {}),
        }}
      />
      <button
        onClick={handleSearch}
        disabled={!inputValue.trim()}
        style={{
          ...styles.button,
          ...(!inputValue.trim() ? styles.buttonDisabled : {}),
        }}
      >
        Search
      </button>
    </div>
  );
}
