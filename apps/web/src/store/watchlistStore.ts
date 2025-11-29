import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  order: number;
}

const defaultColumns: ColumnConfig[] = [
  { key: 'symbol', label: 'Symbol', visible: true, order: 0 },
  { key: 'description', label: 'Name', visible: true, order: 1 },
  { key: 'last', label: 'Last', visible: true, order: 2 },
  { key: 'change', label: 'Change', visible: true, order: 3 },
  { key: 'change_percentage', label: 'Change %', visible: true, order: 4 },
  { key: 'volume', label: 'Volume', visible: true, order: 5 },
  { key: 'bid', label: 'Bid', visible: false, order: 6 },
  { key: 'ask', label: 'Ask', visible: false, order: 7 },
  { key: 'open', label: 'Open', visible: false, order: 8 },
  { key: 'high', label: 'Day High', visible: false, order: 9 },
  { key: 'low', label: 'Day Low', visible: false, order: 10 },
  // 52-week data columns
  { key: 'week_52_high', label: '52W High', visible: false, order: 11 },
  { key: 'week_52_low', label: '52W Low', visible: false, order: 12 },
  { key: 'pct_from_52_high', label: '% from High', visible: false, order: 13 },
  { key: 'pct_from_52_low', label: '% from Low', visible: false, order: 14 },
  { key: 'average_volume', label: 'Avg Volume', visible: false, order: 15 },
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
  // 52-week filters
  near52WeekHigh: boolean;
  near52WeekLow: boolean;
  near52WeekThreshold: string; // Percentage threshold (e.g., "5" for within 5%)
}

const defaultFilters: ScreenerFilters = {
  priceMin: '',
  priceMax: '',
  volumeMin: '',
  changeMin: '',
  changeMax: '',
  nearHigh: false,
  nearLow: false,
  near52WeekHigh: false,
  near52WeekLow: false,
  near52WeekThreshold: '5',
};

interface WatchlistState {
  // Active watchlist
  activeWatchlistId: string | null;
  setActiveWatchlistId: (id: string | null) => void;

  // Column preferences
  columns: ColumnConfig[];
  toggleColumn: (key: string) => void;
  reorderColumns: (fromIndex: number, toIndex: number) => void;
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
      reorderColumns: (fromIndex, toIndex) =>
        set((state) => {
          const newColumns = [...state.columns];
          const [removed] = newColumns.splice(fromIndex, 1);
          newColumns.splice(toIndex, 0, removed);
          // Update order property to match new array positions
          return {
            columns: newColumns.map((col, i) => ({ ...col, order: i })),
          };
        }),
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
