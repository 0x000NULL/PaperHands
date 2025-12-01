import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  minWidth?: number;
  minHeight?: number;
}

export interface WidgetPosition {
  id: WidgetId;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export interface LayoutPreset {
  id: string;
  name: string;
  widgets: WidgetPosition[];
}

// Widget definitions
export const WIDGET_CONFIGS: WidgetConfig[] = [
  {
    id: 'quote',
    title: 'Quote',
    description: 'Real-time price and quote data',
    defaultVisible: true,
    minWidth: 2,
    minHeight: 1,
  },
  {
    id: 'chart',
    title: 'Chart',
    description: 'Price chart with candlesticks',
    defaultVisible: true,
    minWidth: 3,
    minHeight: 2,
  },
  {
    id: 'trade',
    title: 'Trade',
    description: 'Order entry form',
    defaultVisible: true,
    minWidth: 2,
    minHeight: 2,
  },
  {
    id: 'positions',
    title: 'Positions',
    description: 'Current portfolio positions',
    defaultVisible: true,
    minWidth: 3,
    minHeight: 2,
  },
  {
    id: 'orders',
    title: 'Recent Orders',
    description: 'Recent order history',
    defaultVisible: false,
    minWidth: 3,
    minHeight: 2,
  },
  {
    id: 'watchlist',
    title: 'Watchlist',
    description: 'Tracked symbols',
    defaultVisible: true,
    minWidth: 2,
    minHeight: 2,
  },
  {
    id: 'options',
    title: 'Options Chain',
    description: 'Options chain data',
    defaultVisible: false,
    minWidth: 4,
    minHeight: 3,
  },
  {
    id: 'heatmap',
    title: 'Heat Map',
    description: 'Performance heatmap',
    defaultVisible: false,
    minWidth: 2,
    minHeight: 2,
  },
  {
    id: 'expirations',
    title: 'Expirations',
    description: 'Options expiration calendar',
    defaultVisible: false,
    minWidth: 2,
    minHeight: 2,
  },
  {
    id: 'ivGauge',
    title: 'IV Gauge',
    description: 'Implied volatility indicator',
    defaultVisible: false,
    minWidth: 2,
    minHeight: 1,
  },
  {
    id: 'summary',
    title: 'Portfolio Summary',
    description: 'Portfolio value and P&L',
    defaultVisible: true,
    minWidth: 2,
    minHeight: 1,
  },
];

// Default layout - grid positions (x, y are grid cells, width/height are spans)
const DEFAULT_LAYOUT: WidgetPosition[] = [
  { id: 'summary', x: 0, y: 0, width: 4, height: 1, visible: true },
  { id: 'quote', x: 4, y: 0, width: 2, height: 1, visible: true },
  { id: 'chart', x: 0, y: 1, width: 4, height: 3, visible: true },
  { id: 'trade', x: 4, y: 1, width: 2, height: 2, visible: true },
  { id: 'watchlist', x: 4, y: 3, width: 2, height: 2, visible: true },
  { id: 'positions', x: 0, y: 4, width: 4, height: 2, visible: true },
  { id: 'orders', x: 0, y: 6, width: 3, height: 2, visible: false },
  { id: 'options', x: 0, y: 6, width: 6, height: 3, visible: false },
  { id: 'heatmap', x: 3, y: 6, width: 3, height: 2, visible: false },
  { id: 'expirations', x: 0, y: 8, width: 3, height: 2, visible: false },
  { id: 'ivGauge', x: 3, y: 8, width: 3, height: 1, visible: false },
];

// Preset layouts
const PRESET_LAYOUTS: LayoutPreset[] = [
  {
    id: 'default',
    name: 'Default',
    widgets: DEFAULT_LAYOUT,
  },
  {
    id: 'trading',
    name: 'Trading Focus',
    widgets: [
      { id: 'quote', x: 0, y: 0, width: 3, height: 1, visible: true },
      { id: 'ivGauge', x: 3, y: 0, width: 3, height: 1, visible: true },
      { id: 'chart', x: 0, y: 1, width: 4, height: 3, visible: true },
      { id: 'trade', x: 4, y: 1, width: 2, height: 3, visible: true },
      { id: 'positions', x: 0, y: 4, width: 6, height: 2, visible: true },
      { id: 'summary', x: 0, y: 6, width: 6, height: 1, visible: true },
      { id: 'watchlist', x: 0, y: 0, width: 2, height: 2, visible: false },
      { id: 'orders', x: 0, y: 0, width: 2, height: 2, visible: false },
      { id: 'options', x: 0, y: 0, width: 2, height: 2, visible: false },
      { id: 'heatmap', x: 0, y: 0, width: 2, height: 2, visible: false },
      { id: 'expirations', x: 0, y: 0, width: 2, height: 2, visible: false },
    ],
  },
  {
    id: 'options',
    name: 'Options Trading',
    widgets: [
      { id: 'quote', x: 0, y: 0, width: 2, height: 1, visible: true },
      { id: 'ivGauge', x: 2, y: 0, width: 2, height: 1, visible: true },
      { id: 'chart', x: 0, y: 1, width: 4, height: 2, visible: true },
      { id: 'options', x: 0, y: 3, width: 6, height: 3, visible: true },
      { id: 'trade', x: 4, y: 0, width: 2, height: 3, visible: true },
      { id: 'expirations', x: 0, y: 6, width: 3, height: 2, visible: true },
      { id: 'positions', x: 3, y: 6, width: 3, height: 2, visible: true },
      { id: 'summary', x: 0, y: 0, width: 2, height: 1, visible: false },
      { id: 'watchlist', x: 0, y: 0, width: 2, height: 2, visible: false },
      { id: 'orders', x: 0, y: 0, width: 2, height: 2, visible: false },
      { id: 'heatmap', x: 0, y: 0, width: 2, height: 2, visible: false },
    ],
  },
  {
    id: 'monitoring',
    name: 'Portfolio Monitor',
    widgets: [
      { id: 'summary', x: 0, y: 0, width: 6, height: 1, visible: true },
      { id: 'positions', x: 0, y: 1, width: 4, height: 3, visible: true },
      { id: 'watchlist', x: 4, y: 1, width: 2, height: 3, visible: true },
      { id: 'heatmap', x: 0, y: 4, width: 3, height: 2, visible: true },
      { id: 'orders', x: 3, y: 4, width: 3, height: 2, visible: true },
      { id: 'quote', x: 0, y: 0, width: 2, height: 1, visible: false },
      { id: 'chart', x: 0, y: 0, width: 4, height: 3, visible: false },
      { id: 'trade', x: 0, y: 0, width: 2, height: 2, visible: false },
      { id: 'options', x: 0, y: 0, width: 6, height: 3, visible: false },
      { id: 'expirations', x: 0, y: 0, width: 3, height: 2, visible: false },
      { id: 'ivGauge', x: 0, y: 0, width: 3, height: 1, visible: false },
    ],
  },
];

interface LayoutState {
  widgets: WidgetPosition[];
  activePreset: string | null;
  isEditMode: boolean;
  isSyncing: boolean;

  // Actions
  updateWidget: (id: WidgetId, updates: Partial<WidgetPosition>) => void;
  toggleWidget: (id: WidgetId) => void;
  showWidget: (id: WidgetId) => void;
  hideWidget: (id: WidgetId) => void;
  applyPreset: (presetId: string) => void;
  resetToDefault: () => void;
  setEditMode: (enabled: boolean) => void;
  moveWidget: (id: WidgetId, x: number, y: number) => void;
  resizeWidget: (id: WidgetId, width: number, height: number) => void;
  setWidgets: (widgets: WidgetPosition[]) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      widgets: DEFAULT_LAYOUT,
      activePreset: 'default',
      isEditMode: false,
      isSyncing: false,

      updateWidget: (id, updates) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
          activePreset: null, // Clear preset when manually edited
        })),

      toggleWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, visible: !w.visible } : w
          ),
          activePreset: null,
        })),

      showWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, visible: true } : w
          ),
          activePreset: null,
        })),

      hideWidget: (id) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, visible: false } : w
          ),
          activePreset: null,
        })),

      applyPreset: (presetId) => {
        const preset = PRESET_LAYOUTS.find((p) => p.id === presetId);
        if (preset) {
          set({
            widgets: preset.widgets,
            activePreset: presetId,
          });
        }
      },

      resetToDefault: () =>
        set({
          widgets: DEFAULT_LAYOUT,
          activePreset: 'default',
        }),

      setEditMode: (enabled) => set({ isEditMode: enabled }),

      moveWidget: (id, x, y) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, x, y } : w
          ),
          activePreset: null,
        })),

      resizeWidget: (id, width, height) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, width, height } : w
          ),
          activePreset: null,
        })),

      setWidgets: (widgets) => set({ widgets }),

      setSyncing: (syncing) => set({ isSyncing: syncing }),
    }),
    {
      name: 'paperhands-layout',
      partialize: (state) => ({
        widgets: state.widgets,
        activePreset: state.activePreset,
      }),
    }
  )
);

// Export presets for UI
export const getPresets = () => PRESET_LAYOUTS;

// Helper to get visible widgets
export const getVisibleWidgets = (widgets: WidgetPosition[]) =>
  widgets.filter((w) => w.visible);

// Helper to get widget config by id
export const getWidgetConfig = (id: WidgetId) =>
  WIDGET_CONFIGS.find((c) => c.id === id);
