import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

const defaultColumns: ColumnConfig[] = [
  { key: 'symbol', label: 'Symbol', visible: true },
  { key: 'description', label: 'Name', visible: true },
  { key: 'last', label: 'Last', visible: true },
  { key: 'change', label: 'Change', visible: true },
  { key: 'change_percentage', label: 'Change %', visible: true },
  { key: 'volume', label: 'Volume', visible: true },
  { key: 'bid', label: 'Bid', visible: false },
  { key: 'ask', label: 'Ask', visible: false },
  { key: 'open', label: 'Open', visible: false },
  { key: 'high', label: 'High', visible: false },
  { key: 'low', label: 'Low', visible: false },
];

// Screener filter types
export interface ScreenerFilters {
  priceMin: string;
  priceMax: string;
  volumeMin: string;
  changeMin: string;
  changeMax: string;
  nearHigh: boolean;
  nearLow: boolean;
}

const defaultFilters: ScreenerFilters = {
  priceMin: '',
  priceMax: '',
  volumeMin: '',
  changeMin: '',
  changeMax: '',
  nearHigh: false,
  nearLow: false,
};

interface WatchlistState {
  // Active watchlist
  activeWatchlistId: string | null;
  setActiveWatchlistId: (id: string | null) => void;

  // Column preferences
  columns: ColumnConfig[];
  toggleColumn: (key: string) => void;
  resetColumns: () => void;

  // Screener filters
  filters: ScreenerFilters;
  setFilter: <K extends keyof ScreenerFilters>(
    key: K,
    value: ScreenerFilters[K],
  ) => void;
  resetFilters: () => void;

  // Active screener preset
  activePreset: string | null;
  setActivePreset: (preset: string | null) => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      // Active watchlist
      activeWatchlistId: null,
      setActiveWatchlistId: (id) => set({ activeWatchlistId: id }),

      // Column preferences
      columns: defaultColumns,
      toggleColumn: (key) =>
        set((state) => ({
          columns: state.columns.map((col) =>
            col.key === key ? { ...col, visible: !col.visible } : col,
          ),
        })),
      resetColumns: () => set({ columns: defaultColumns }),

      // Screener filters
      filters: defaultFilters,
      setFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
          activePreset: null, // Clear preset when manually filtering
        })),
      resetFilters: () => set({ filters: defaultFilters, activePreset: null }),

      // Active screener preset
      activePreset: null,
      setActivePreset: (preset) => set({ activePreset: preset }),
    }),
    {
      name: 'paperhands-watchlist',
      partialize: (state) => ({
        columns: state.columns,
        activeWatchlistId: state.activeWatchlistId,
      }),
    },
  ),
);
