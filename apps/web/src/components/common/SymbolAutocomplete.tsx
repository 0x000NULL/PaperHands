import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { theme } from '../../theme/constants';
import { useSearchStore, type RecentSymbol } from '../../store/searchStore';
import type { SymbolSearchResult } from '../../types';

interface SymbolAutocompleteProps {
  value: string;
  onChange: (symbol: string, name?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
  },
  input: {
    width: '100%',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.base,
    outline: 'none',
    fontFamily: theme.typography.fontMono,
    textTransform: 'uppercase',
  },
  inputFocused: {
    borderColor: theme.colors.accent,
    boxShadow: `0 0 0 2px ${theme.colors.accentGlow}`,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    backgroundColor: theme.colors.bgSecondary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    boxShadow: theme.shadows.lg,
    zIndex: 1000,
    maxHeight: '300px',
    overflowY: 'auto',
  },
  section: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  sectionTitle: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: theme.spacing.xs,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  itemHighlighted: {
    backgroundColor: theme.colors.bgHover,
  },
  itemSymbol: {
    fontFamily: theme.typography.fontMono,
    fontWeight: theme.typography.semibold,
    color: theme.colors.accent,
    marginRight: theme.spacing.sm,
  },
  itemName: {
    flex: 1,
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemExchange: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
    marginLeft: theme.spacing.sm,
  },
  noResults: {
    padding: theme.spacing.md,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  loading: {
    padding: theme.spacing.md,
    textAlign: 'center',
    color: theme.colors.textTertiary,
    fontSize: theme.typography.sm,
  },
  clearRecent: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
    cursor: 'pointer',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    textAlign: 'right',
  },
};

export function SymbolAutocomplete({
  value,
  onChange,
  placeholder = 'Search symbol...',
  disabled = false,
  autoFocus = false,
}: SymbolAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { recentSymbols, addRecentSymbol, clearRecentSymbols } = useSearchStore();

  // Debounce search query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Search API query
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['symbolSearch', debouncedQuery],
    queryFn: () => api.searchSymbols(debouncedQuery),
    enabled: debouncedQuery.length >= 1,
    staleTime: 60_000, // 1 minute
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync input value with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Build combined results list
  const showRecent = inputValue.length === 0 && recentSymbols.length > 0;
  const allItems: Array<{ symbol: string; name?: string; exchange?: string; isRecent?: boolean }> = [];

  if (showRecent) {
    recentSymbols.forEach((r: RecentSymbol) => {
      allItems.push({ symbol: r.symbol, name: r.name, isRecent: true });
    });
  } else if (searchResults.length > 0) {
    searchResults.forEach((r: SymbolSearchResult) => {
      allItems.push({ symbol: r.symbol, name: r.name, exchange: r.exchange });
    });
  }

  // Handle item selection
  const handleSelect = (symbol: string, name?: string) => {
    setInputValue(symbol);
    setIsOpen(false);
    addRecentSymbol(symbol, name);
    onChange(symbol, name);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, allItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allItems.length) {
          const item = allItems[highlightedIndex];
          handleSelect(item.symbol, item.name);
        } else if (inputValue) {
          // Submit current input value
          handleSelect(inputValue.toUpperCase());
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, '');
    setInputValue(val);
    setHighlightedIndex(-1);
    setIsOpen(true);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setIsOpen(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div ref={containerRef} style={styles.container}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        style={{
          ...styles.input,
          ...(isFocused ? styles.inputFocused : {}),
        }}
      />

      {isOpen && (showRecent || searchResults.length > 0 || isLoading || debouncedQuery.length >= 1) && (
        <div style={styles.dropdown}>
          {showRecent && (
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={styles.sectionTitle}>Recent</span>
                <span
                  style={styles.clearRecent}
                  onClick={(e) => {
                    e.stopPropagation();
                    clearRecentSymbols();
                  }}
                >
                  Clear
                </span>
              </div>
              {recentSymbols.map((item, index) => (
                <div
                  key={item.symbol}
                  style={{
                    ...styles.item,
                    ...(highlightedIndex === index ? styles.itemHighlighted : {}),
                  }}
                  onClick={() => handleSelect(item.symbol, item.name)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span style={styles.itemSymbol}>{item.symbol}</span>
                  <span style={styles.itemName}>{item.name || ''}</span>
                </div>
              ))}
            </div>
          )}

          {!showRecent && isLoading && (
            <div style={styles.loading}>Searching...</div>
          )}

          {!showRecent && !isLoading && searchResults.length > 0 && (
            <div style={styles.section}>
              <span style={styles.sectionTitle}>Results</span>
              {searchResults.map((item, index) => (
                <div
                  key={item.symbol}
                  style={{
                    ...styles.item,
                    ...(highlightedIndex === index ? styles.itemHighlighted : {}),
                  }}
                  onClick={() => handleSelect(item.symbol, item.name)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span style={styles.itemSymbol}>{item.symbol}</span>
                  <span style={styles.itemName}>{item.name}</span>
                  <span style={styles.itemExchange}>{item.exchange}</span>
                </div>
              ))}
            </div>
          )}

          {!showRecent && !isLoading && debouncedQuery.length >= 1 && searchResults.length === 0 && (
            <div style={styles.noResults}>No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
