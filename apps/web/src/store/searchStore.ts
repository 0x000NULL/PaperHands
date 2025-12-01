import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_RECENT_SYMBOLS = 10;

export interface RecentSymbol {
  symbol: string;
  name?: string;
  timestamp: number;
}

interface SearchState {
  recentSymbols: RecentSymbol[];
  addRecentSymbol: (symbol: string, name?: string) => void;
  removeRecentSymbol: (symbol: string) => void;
  clearRecentSymbols: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentSymbols: [],

      addRecentSymbol: (symbol, name) =>
        set((state) => {
          // Remove existing entry for this symbol if present
          const filtered = state.recentSymbols.filter(
            (s) => s.symbol.toUpperCase() !== symbol.toUpperCase()
          );

          // Add to front of array with current timestamp
          const updated = [
            { symbol: symbol.toUpperCase(), name, timestamp: Date.now() },
            ...filtered,
          ].slice(0, MAX_RECENT_SYMBOLS);

          return { recentSymbols: updated };
        }),

      removeRecentSymbol: (symbol) =>
        set((state) => ({
          recentSymbols: state.recentSymbols.filter(
            (s) => s.symbol.toUpperCase() !== symbol.toUpperCase()
          ),
        })),

      clearRecentSymbols: () => set({ recentSymbols: [] }),
    }),
    {
      name: 'paperhands-search',
    }
  )
);
