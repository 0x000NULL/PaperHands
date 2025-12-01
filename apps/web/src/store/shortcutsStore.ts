import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Shortcut {
  id: string;
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description: string;
  action: string;
  enabled: boolean;
}

// Default keyboard shortcuts
const defaultShortcuts: Shortcut[] = [
  {
    id: 'search',
    key: 'k',
    modifiers: ['ctrl'],
    description: 'Focus symbol search',
    action: 'FOCUS_SEARCH',
    enabled: true,
  },
  {
    id: 'trade',
    key: 't',
    modifiers: ['ctrl'],
    description: 'Open quick trade panel',
    action: 'OPEN_TRADE',
    enabled: true,
  },
  {
    id: 'dashboard',
    key: '1',
    modifiers: ['ctrl'],
    description: 'Go to Dashboard',
    action: 'NAV_DASHBOARD',
    enabled: true,
  },
  {
    id: 'portfolio',
    key: '2',
    modifiers: ['ctrl'],
    description: 'Go to Portfolio',
    action: 'NAV_PORTFOLIO',
    enabled: true,
  },
  {
    id: 'orders',
    key: '3',
    modifiers: ['ctrl'],
    description: 'Go to Orders',
    action: 'NAV_ORDERS',
    enabled: true,
  },
  {
    id: 'analytics',
    key: '4',
    modifiers: ['ctrl'],
    description: 'Go to Analytics',
    action: 'NAV_ANALYTICS',
    enabled: true,
  },
  {
    id: 'greeks',
    key: '5',
    modifiers: ['ctrl'],
    description: 'Go to Greeks',
    action: 'NAV_GREEKS',
    enabled: true,
  },
  {
    id: 'watchlists',
    key: '6',
    modifiers: ['ctrl'],
    description: 'Go to Watchlists',
    action: 'NAV_WATCHLISTS',
    enabled: true,
  },
  {
    id: 'research',
    key: '7',
    modifiers: ['ctrl'],
    description: 'Go to Research',
    action: 'NAV_RESEARCH',
    enabled: true,
  },
  {
    id: 'settings',
    key: ',',
    modifiers: ['ctrl'],
    description: 'Open Settings',
    action: 'NAV_SETTINGS',
    enabled: true,
  },
  {
    id: 'help',
    key: '/',
    modifiers: ['ctrl'],
    description: 'Show keyboard shortcuts',
    action: 'SHOW_SHORTCUTS',
    enabled: true,
  },
  {
    id: 'theme',
    key: 'd',
    modifiers: ['ctrl', 'shift'],
    description: 'Toggle dark/light mode',
    action: 'TOGGLE_THEME',
    enabled: true,
  },
];

interface ShortcutsState {
  shortcuts: Shortcut[];
  shortcutsModalOpen: boolean;
  updateShortcut: (id: string, updates: Partial<Shortcut>) => void;
  resetToDefaults: () => void;
  toggleShortcut: (id: string) => void;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
}

export const useShortcutsStore = create<ShortcutsState>()(
  persist(
    (set) => ({
      shortcuts: defaultShortcuts,
      shortcutsModalOpen: false,

      updateShortcut: (id, updates) =>
        set((state) => ({
          shortcuts: state.shortcuts.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      resetToDefaults: () => set({ shortcuts: defaultShortcuts }),

      toggleShortcut: (id) =>
        set((state) => ({
          shortcuts: state.shortcuts.map((s) =>
            s.id === id ? { ...s, enabled: !s.enabled } : s
          ),
        })),

      openShortcutsModal: () => set({ shortcutsModalOpen: true }),
      closeShortcutsModal: () => set({ shortcutsModalOpen: false }),
    }),
    {
      name: 'paperhands-shortcuts',
      partialize: (state) => ({ shortcuts: state.shortcuts }),
    }
  )
);

// Helper to format shortcut display string
export function formatShortcut(shortcut: Shortcut): string {
  const parts: string[] = [];

  if (shortcut.modifiers.includes('ctrl')) {
    parts.push(navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl');
  }
  if (shortcut.modifiers.includes('alt')) {
    parts.push('Alt');
  }
  if (shortcut.modifiers.includes('shift')) {
    parts.push('Shift');
  }
  if (shortcut.modifiers.includes('meta')) {
    parts.push(navigator.platform.includes('Mac') ? 'Cmd' : 'Win');
  }

  parts.push(shortcut.key.toUpperCase());

  return parts.join(' + ');
}
