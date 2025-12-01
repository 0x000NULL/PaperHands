import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layout, Layouts } from 'react-grid-layout';

export type WidgetId =
  | 'quote'
  | 'chart'
  | 'trade'
  | 'positions'
  | 'orders'
  | 'watchlist'
  | 'options'
  | 'heatmap'
  | 'expirations'
  | 'ivGauge'
  | 'summary';

export interface WidgetConfig {
  id: WidgetId;
  title: string;
  description: string;
  defaultVisible: boolean;
  minW?: number;
  minH?: number;
}

// Legacy format for migration
interface LegacyWidgetPosition {
  id: WidgetId;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

// New format using react-grid-layout's Layout type
export interface WidgetLayout extends Layout {
  i: string; // Widget ID
}

export interface LayoutPreset {
  id: string;
  name: string;
  layouts: Layouts;
  hiddenWidgets: WidgetId[];
}

// Widget definitions
export const WIDGET_CONFIGS: WidgetConfig[] = [
  {
    id: 'quote',
    title: 'Quote',
    description: 'Real-time price and quote data',
    defaultVisible: true,
    minW: 2,
    minH: 1,
  },
  {
    id: 'chart',
    title: 'Chart',
    description: 'Price chart with candlesticks',
    defaultVisible: true,
    minW: 3,
    minH: 2,
  },
  {
    id: 'trade',
    title: 'Trade',
    description: 'Order entry form',
    defaultVisible: true,
    minW: 2,
    minH: 2,
  },
  {
    id: 'positions',
    title: 'Positions',
    description: 'Current portfolio positions',
    defaultVisible: true,
    minW: 3,
    minH: 2,
  },
  {
    id: 'orders',
    title: 'Recent Orders',
    description: 'Recent order history',
    defaultVisible: false,
    minW: 3,
    minH: 2,
  },
  {
    id: 'watchlist',
    title: 'Watchlist',
    description: 'Tracked symbols',
    defaultVisible: true,
    minW: 2,
    minH: 2,
  },
  {
    id: 'options',
    title: 'Options Chain',
    description: 'Options chain data',
    defaultVisible: false,
    minW: 4,
    minH: 3,
  },
  {
    id: 'heatmap',
    title: 'Heat Map',
    description: 'Performance heatmap',
    defaultVisible: false,
    minW: 2,
    minH: 2,
  },
  {
    id: 'expirations',
    title: 'Expirations',
    description: 'Options expiration calendar',
    defaultVisible: false,
    minW: 2,
    minH: 2,
  },
  {
    id: 'ivGauge',
    title: 'IV Gauge',
    description: 'Implied volatility indicator',
    defaultVisible: false,
    minW: 2,
    minH: 1,
  },
  {
    id: 'summary',
    title: 'Portfolio Summary',
    description: 'Portfolio value and P&L',
    defaultVisible: true,
    minW: 2,
    minH: 1,
  },
];

// Grid configuration
export const GRID_CONFIG = {
  cols: { lg: 6, md: 4, sm: 2, xs: 1 },
  breakpoints: { lg: 1280, md: 768, sm: 640, xs: 0 },
  rowHeight: 80,
  margin: [12, 12] as [number, number],
  containerPadding: [12, 12] as [number, number],
};

// Default layouts for different breakpoints
// Heights are in row units (rowHeight = 80px)
// Layout: Left column (4 cols): Summary, Chart, Positions
//         Right column (2 cols): Quote, Trade, Watchlist
const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    // Left column - Summary at top
    { i: 'summary', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 1 },
    // Right column - Quote at top
    { i: 'quote', x: 4, y: 0, w: 2, h: 4, minW: 2, minH: 2 },
    // Left column - Chart (large)
    { i: 'chart', x: 0, y: 2, w: 4, h: 6, minW: 3, minH: 3 },
    // Right column - Trade form
    { i: 'trade', x: 4, y: 4, w: 2, h: 4, minW: 2, minH: 3 },
    // Left column - Positions table
    { i: 'positions', x: 0, y: 8, w: 4, h: 4, minW: 3, minH: 2 },
    // Right column - Watchlist
    { i: 'watchlist', x: 4, y: 8, w: 2, h: 4, minW: 2, minH: 2 },
    // Hidden by default
    { i: 'orders', x: 0, y: 12, w: 3, h: 3, minW: 3, minH: 2 },
    { i: 'options', x: 0, y: 12, w: 6, h: 5, minW: 4, minH: 3 },
    { i: 'heatmap', x: 3, y: 12, w: 3, h: 3, minW: 2, minH: 2 },
    { i: 'expirations', x: 0, y: 15, w: 3, h: 3, minW: 2, minH: 2 },
    { i: 'ivGauge', x: 3, y: 15, w: 3, h: 2, minW: 2, minH: 1 },
  ],
  md: [
    { i: 'summary', x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 1 },
    { i: 'quote', x: 0, y: 2, w: 2, h: 4, minW: 2, minH: 2 },
    { i: 'trade', x: 2, y: 2, w: 2, h: 4, minW: 2, minH: 3 },
    { i: 'chart', x: 0, y: 6, w: 4, h: 6, minW: 2, minH: 3 },
    { i: 'positions', x: 0, y: 12, w: 4, h: 4, minW: 2, minH: 2 },
    { i: 'watchlist', x: 0, y: 16, w: 2, h: 3, minW: 2, minH: 2 },
    { i: 'orders', x: 2, y: 16, w: 2, h: 3, minW: 2, minH: 2 },
    { i: 'options', x: 0, y: 19, w: 4, h: 5, minW: 2, minH: 3 },
    { i: 'heatmap', x: 0, y: 24, w: 2, h: 3, minW: 2, minH: 2 },
    { i: 'expirations', x: 2, y: 24, w: 2, h: 3, minW: 2, minH: 2 },
    { i: 'ivGauge', x: 0, y: 27, w: 2, h: 2, minW: 2, minH: 1 },
  ],
  sm: [
    { i: 'summary', x: 0, y: 0, w: 2, h: 2, minW: 1, minH: 1 },
    { i: 'quote', x: 0, y: 2, w: 2, h: 4, minW: 1, minH: 2 },
    { i: 'chart', x: 0, y: 6, w: 2, h: 5, minW: 1, minH: 3 },
    { i: 'trade', x: 0, y: 11, w: 2, h: 4, minW: 1, minH: 3 },
    { i: 'positions', x: 0, y: 15, w: 2, h: 4, minW: 1, minH: 2 },
    { i: 'watchlist', x: 0, y: 19, w: 2, h: 3, minW: 1, minH: 2 },
    { i: 'orders', x: 0, y: 22, w: 2, h: 3, minW: 1, minH: 2 },
    { i: 'options', x: 0, y: 25, w: 2, h: 5, minW: 1, minH: 3 },
    { i: 'heatmap', x: 0, y: 30, w: 2, h: 3, minW: 1, minH: 2 },
    { i: 'expirations', x: 0, y: 33, w: 2, h: 3, minW: 1, minH: 2 },
    { i: 'ivGauge', x: 0, y: 36, w: 2, h: 2, minW: 1, minH: 1 },
  ],
  xs: [
    { i: 'summary', x: 0, y: 0, w: 1, h: 2, minW: 1, minH: 1 },
    { i: 'quote', x: 0, y: 2, w: 1, h: 4, minW: 1, minH: 2 },
    { i: 'chart', x: 0, y: 6, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'trade', x: 0, y: 11, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'positions', x: 0, y: 16, w: 1, h: 4, minW: 1, minH: 2 },
    { i: 'watchlist', x: 0, y: 20, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'orders', x: 0, y: 23, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'options', x: 0, y: 26, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'heatmap', x: 0, y: 31, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'expirations', x: 0, y: 34, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'ivGauge', x: 0, y: 37, w: 1, h: 2, minW: 1, minH: 1 },
  ],
};

const DEFAULT_HIDDEN_WIDGETS: WidgetId[] = ['orders', 'options', 'heatmap', 'expirations', 'ivGauge'];

// Preset layouts
const PRESET_LAYOUTS: LayoutPreset[] = [
  {
    id: 'default',
    name: 'Default',
    layouts: DEFAULT_LAYOUTS,
    hiddenWidgets: DEFAULT_HIDDEN_WIDGETS,
  },
  {
    id: 'trading',
    name: 'Trading Focus',
    layouts: {
      lg: [
        { i: 'quote', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 1 },
        { i: 'ivGauge', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 1 },
        { i: 'chart', x: 0, y: 2, w: 4, h: 5, minW: 3, minH: 3 },
        { i: 'trade', x: 4, y: 2, w: 2, h: 4, minW: 2, minH: 3 },
        { i: 'positions', x: 0, y: 7, w: 6, h: 4, minW: 3, minH: 2 },
        { i: 'summary', x: 0, y: 11, w: 6, h: 2, minW: 2, minH: 1 },
        { i: 'watchlist', x: 0, y: 13, w: 2, h: 3, minW: 2, minH: 2 },
        { i: 'orders', x: 2, y: 13, w: 2, h: 3, minW: 2, minH: 2 },
        { i: 'options', x: 4, y: 13, w: 2, h: 3, minW: 2, minH: 2 },
        { i: 'heatmap', x: 0, y: 16, w: 2, h: 3, minW: 2, minH: 2 },
        { i: 'expirations', x: 2, y: 16, w: 2, h: 3, minW: 2, minH: 2 },
      ],
      md: DEFAULT_LAYOUTS.md,
      sm: DEFAULT_LAYOUTS.sm,
      xs: DEFAULT_LAYOUTS.xs,
    },
    hiddenWidgets: ['watchlist', 'orders', 'options', 'heatmap', 'expirations'],
  },
  {
    id: 'options',
    name: 'Options Trading',
    layouts: {
      lg: [
        { i: 'quote', x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 1 },
        { i: 'ivGauge', x: 2, y: 0, w: 2, h: 2, minW: 2, minH: 1 },
        { i: 'trade', x: 4, y: 0, w: 2, h: 4, minW: 2, minH: 3 },
        { i: 'chart', x: 0, y: 2, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'options', x: 0, y: 6, w: 6, h: 5, minW: 4, minH: 3 },
        { i: 'expirations', x: 0, y: 11, w: 3, h: 3, minW: 2, minH: 2 },
        { i: 'positions', x: 3, y: 11, w: 3, h: 4, minW: 3, minH: 2 },
        { i: 'summary', x: 0, y: 14, w: 2, h: 2, minW: 2, minH: 1 },
        { i: 'watchlist', x: 2, y: 15, w: 2, h: 3, minW: 2, minH: 2 },
        { i: 'orders', x: 4, y: 15, w: 2, h: 3, minW: 2, minH: 2 },
        { i: 'heatmap', x: 0, y: 16, w: 2, h: 3, minW: 2, minH: 2 },
      ],
      md: DEFAULT_LAYOUTS.md,
      sm: DEFAULT_LAYOUTS.sm,
      xs: DEFAULT_LAYOUTS.xs,
    },
    hiddenWidgets: ['summary', 'watchlist', 'orders', 'heatmap'],
  },
  {
    id: 'monitoring',
    name: 'Portfolio Monitor',
    layouts: {
      lg: [
        { i: 'summary', x: 0, y: 0, w: 6, h: 2, minW: 2, minH: 1 },
        { i: 'positions', x: 0, y: 2, w: 4, h: 5, minW: 3, minH: 2 },
        { i: 'watchlist', x: 4, y: 2, w: 2, h: 4, minW: 2, minH: 2 },
        { i: 'heatmap', x: 0, y: 7, w: 3, h: 3, minW: 2, minH: 2 },
        { i: 'orders', x: 3, y: 7, w: 3, h: 3, minW: 3, minH: 2 },
        { i: 'quote', x: 0, y: 10, w: 2, h: 2, minW: 2, minH: 1 },
        { i: 'chart', x: 2, y: 10, w: 4, h: 5, minW: 3, minH: 3 },
        { i: 'trade', x: 0, y: 12, w: 2, h: 4, minW: 2, minH: 3 },
        { i: 'options', x: 0, y: 16, w: 6, h: 5, minW: 4, minH: 3 },
        { i: 'expirations', x: 0, y: 21, w: 3, h: 3, minW: 2, minH: 2 },
        { i: 'ivGauge', x: 3, y: 21, w: 3, h: 2, minW: 2, minH: 1 },
      ],
      md: DEFAULT_LAYOUTS.md,
      sm: DEFAULT_LAYOUTS.sm,
      xs: DEFAULT_LAYOUTS.xs,
    },
    hiddenWidgets: ['quote', 'chart', 'trade', 'options', 'expirations', 'ivGauge'],
  },
];

interface LayoutState {
  layouts: Layouts;
  hiddenWidgets: WidgetId[];
  activePreset: string | null;
  isEditMode: boolean;
  isSyncing: boolean;
  currentBreakpoint: string;

  // Actions
  setLayouts: (layouts: Layouts) => void;
  updateLayoutsForBreakpoint: (breakpoint: string, layout: Layout[]) => void;
  toggleWidget: (id: WidgetId) => void;
  showWidget: (id: WidgetId) => void;
  hideWidget: (id: WidgetId) => void;
  applyPreset: (presetId: string) => void;
  resetToDefault: () => void;
  setEditMode: (enabled: boolean) => void;
  setCurrentBreakpoint: (breakpoint: string) => void;
  setSyncing: (syncing: boolean) => void;
}

// Migration function: Convert legacy format to new format
function migrateLegacyLayout(legacyWidgets: LegacyWidgetPosition[]): { layouts: Layouts; hiddenWidgets: WidgetId[] } {
  const hiddenWidgets: WidgetId[] = legacyWidgets
    .filter((w) => !w.visible)
    .map((w) => w.id);

  const lgLayout: Layout[] = legacyWidgets.map((w) => {
    const config = WIDGET_CONFIGS.find((c) => c.id === w.id);
    return {
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.width,
      h: w.height,
      minW: config?.minW || 1,
      minH: config?.minH || 1,
    };
  });

  return {
    layouts: {
      lg: lgLayout,
      md: DEFAULT_LAYOUTS.md,
      sm: DEFAULT_LAYOUTS.sm,
      xs: DEFAULT_LAYOUTS.xs,
    },
    hiddenWidgets,
  };
}

// Check if state has legacy format
function isLegacyFormat(state: unknown): state is { widgets: LegacyWidgetPosition[] } {
  return (
    typeof state === 'object' &&
    state !== null &&
    'widgets' in state &&
    Array.isArray((state as { widgets: unknown }).widgets) &&
    (state as { widgets: unknown[] }).widgets.length > 0 &&
    'width' in ((state as { widgets: unknown[] }).widgets[0] as object)
  );
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      layouts: DEFAULT_LAYOUTS,
      hiddenWidgets: DEFAULT_HIDDEN_WIDGETS,
      activePreset: 'default',
      isEditMode: false,
      isSyncing: false,
      currentBreakpoint: 'lg',

      setLayouts: (layouts) =>
        set({
          layouts,
          activePreset: null,
        }),

      updateLayoutsForBreakpoint: (breakpoint, layout) =>
        set((state) => ({
          layouts: {
            ...state.layouts,
            [breakpoint]: layout,
          },
          activePreset: null,
        })),

      toggleWidget: (id) =>
        set((state) => ({
          hiddenWidgets: state.hiddenWidgets.includes(id)
            ? state.hiddenWidgets.filter((w) => w !== id)
            : [...state.hiddenWidgets, id],
          activePreset: null,
        })),

      showWidget: (id) =>
        set((state) => ({
          hiddenWidgets: state.hiddenWidgets.filter((w) => w !== id),
          activePreset: null,
        })),

      hideWidget: (id) =>
        set((state) => ({
          hiddenWidgets: state.hiddenWidgets.includes(id)
            ? state.hiddenWidgets
            : [...state.hiddenWidgets, id],
          activePreset: null,
        })),

      applyPreset: (presetId) => {
        const preset = PRESET_LAYOUTS.find((p) => p.id === presetId);
        if (preset) {
          set({
            layouts: preset.layouts,
            hiddenWidgets: preset.hiddenWidgets,
            activePreset: presetId,
          });
        }
      },

      resetToDefault: () =>
        set({
          layouts: DEFAULT_LAYOUTS,
          hiddenWidgets: DEFAULT_HIDDEN_WIDGETS,
          activePreset: 'default',
        }),

      setEditMode: (enabled) => set({ isEditMode: enabled }),

      setCurrentBreakpoint: (breakpoint) => set({ currentBreakpoint: breakpoint }),

      setSyncing: (syncing) => set({ isSyncing: syncing }),
    }),
    {
      name: 'paperhands-layout',
      partialize: (state) => ({
        layouts: state.layouts,
        hiddenWidgets: state.hiddenWidgets,
        activePreset: state.activePreset,
      }),
      // Migrate legacy format on load
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('Error rehydrating layout state:', error);
          return;
        }
        // Migration is handled in merge
      },
      merge: (persistedState, currentState) => {
        // Handle legacy format migration
        if (isLegacyFormat(persistedState)) {
          console.log('Migrating legacy layout format...');
          const migrated = migrateLegacyLayout(persistedState.widgets);
          return {
            ...currentState,
            layouts: migrated.layouts,
            hiddenWidgets: migrated.hiddenWidgets,
            activePreset: null,
          };
        }

        // Normal merge
        return {
          ...currentState,
          ...(persistedState as Partial<LayoutState>),
        };
      },
    }
  )
);

// Export presets for UI
export const getPresets = () => PRESET_LAYOUTS;

// Helper to get visible widget IDs
export const getVisibleWidgetIds = (hiddenWidgets: WidgetId[]): WidgetId[] =>
  WIDGET_CONFIGS.map((c) => c.id).filter((id) => !hiddenWidgets.includes(id));

// Helper to get widget config by id
export const getWidgetConfig = (id: WidgetId) =>
  WIDGET_CONFIGS.find((c) => c.id === id);

// Helper to get layouts for visible widgets only
export const getVisibleLayouts = (layouts: Layouts, hiddenWidgets: WidgetId[]): Layouts => {
  const result: Layouts = {};
  for (const [breakpoint, layout] of Object.entries(layouts)) {
    result[breakpoint] = layout.filter((item) => !hiddenWidgets.includes(item.i as WidgetId));
  }
  return result;
};
