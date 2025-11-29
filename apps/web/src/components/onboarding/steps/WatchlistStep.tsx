import { useState, type CSSProperties } from 'react';
import { theme } from '../../../theme/constants';

interface WatchlistStepProps {
  onNext: (data: { watchlistName: string; symbols: string[] }) => void;
  onBack: () => void;
  onSkip: () => void;
}

const popularSymbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN'];

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
  input: {
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.base,
    marginBottom: theme.spacing.lg,
    boxSizing: 'border-box',
  },
  symbolsLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  symbolInput: {
    display: 'flex',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  symbolInputField: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.base,
    textTransform: 'uppercase',
  },
  addButton: {
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.bgTertiary,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    cursor: 'pointer',
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
  },
  popularContainer: {
    marginBottom: theme.spacing.lg,
  },
  popularLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.sm,
    display: 'block',
  },
  popularChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  chip: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.bgTertiary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.full,
    cursor: 'pointer',
    fontSize: theme.typography.sm,
    color: theme.colors.textPrimary,
    transition: theme.transitions.fast,
  },
  chipSelected: {
    backgroundColor: theme.colors.accentGlow,
    borderColor: theme.colors.accent,
    color: theme.colors.accent,
  },
  selectedSymbols: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    minHeight: '40px',
  },
  selectedChip: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.accentGlow,
    border: `1px solid ${theme.colors.accent}`,
    borderRadius: theme.radius.full,
    fontSize: theme.typography.sm,
    color: theme.colors.accent,
  },
  removeButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.accent,
    cursor: 'pointer',
    fontSize: theme.typography.sm,
    padding: 0,
    lineHeight: 1,
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
  emptyText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
};

export function WatchlistStep({ onNext, onBack, onSkip }: WatchlistStepProps) {
  const [watchlistName, setWatchlistName] = useState('My Watchlist');
  const [symbols, setSymbols] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const addSymbol = (symbol: string) => {
    const upper = symbol.toUpperCase().trim();
    if (upper && !symbols.includes(upper)) {
      setSymbols([...symbols, upper]);
    }
    setInputValue('');
  };

  const removeSymbol = (symbol: string) => {
    setSymbols(symbols.filter((s) => s !== symbol));
  };

  const togglePopularSymbol = (symbol: string) => {
    if (symbols.includes(symbol)) {
      removeSymbol(symbol);
    } else {
      addSymbol(symbol);
    }
  };

  const handleNext = () => {
    onNext({ watchlistName, symbols });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue) {
      e.preventDefault();
      addSymbol(inputValue);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Start Tracking Stocks</h2>
      <p style={styles.subtitle}>
        Create your first watchlist to track symbols you're interested in.
      </p>

      <label style={styles.label}>Watchlist Name</label>
      <input
        type="text"
        value={watchlistName}
        onChange={(e) => setWatchlistName(e.target.value)}
        style={styles.input}
        maxLength={100}
      />

      <div style={styles.symbolsLabel}>
        <label style={styles.label}>Add Symbols (3-5 recommended)</label>
      </div>

      <div style={styles.symbolInput}>
        <input
          type="text"
          placeholder="Enter symbol..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          style={styles.symbolInputField}
          maxLength={10}
        />
        <button
          style={styles.addButton}
          onClick={() => addSymbol(inputValue)}
          disabled={!inputValue}
        >
          Add
        </button>
      </div>

      <div style={styles.popularContainer}>
        <label style={styles.popularLabel}>Popular picks:</label>
        <div style={styles.popularChips}>
          {popularSymbols.map((symbol) => (
            <button
              key={symbol}
              style={{
                ...styles.chip,
                ...(symbols.includes(symbol) && styles.chipSelected),
              }}
              onClick={() => togglePopularSymbol(symbol)}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      <label style={styles.label}>Selected Symbols</label>
      <div style={styles.selectedSymbols}>
        {symbols.length === 0 ? (
          <span style={styles.emptyText}>No symbols selected yet</span>
        ) : (
          symbols.map((symbol) => (
            <div key={symbol} style={styles.selectedChip}>
              {symbol}
              <button
                style={styles.removeButton}
                onClick={() => removeSymbol(symbol)}
              >
                ×
              </button>
            </div>
          ))
        )}
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
