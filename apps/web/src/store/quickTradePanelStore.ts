import { create } from 'zustand';

// Quick trade panel store
interface QuickTradePanelState {
  isOpen: boolean;
  initialSymbol?: string;
  open: (symbol?: string) => void;
  close: () => void;
  toggle: () => void;
}

export const useQuickTradePanel = create<QuickTradePanelState>((set) => ({
  isOpen: false,
  initialSymbol: undefined,
  open: (symbol) => set({ isOpen: true, initialSymbol: symbol }),
  close: () => set({ isOpen: false, initialSymbol: undefined }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
