import { create } from 'zustand';
import type { OrderType, OrderSide } from '../types';

interface DashboardState {
  // Symbol linking
  selectedSymbol: string | null;
  setSelectedSymbol: (symbol: string | null) => void;

  // Trade form state
  tradeSide: OrderSide;
  setTradeSide: (side: OrderSide) => void;
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  quantity: string;
  setQuantity: (qty: string) => void;
  limitPrice: string;
  setLimitPrice: (price: string) => void;
  stopPrice: string;
  setStopPrice: (price: string) => void;
  trailAmount: string;
  setTrailAmount: (amount: string) => void;

  // Actions
  resetTradeForm: () => void;
  prefillSell: (symbol: string, quantity: number) => void;
  prefillBuy: (symbol: string) => void;
}

const initialFormState = {
  tradeSide: 'buy' as OrderSide,
  orderType: 'market' as OrderType,
  quantity: '',
  limitPrice: '',
  stopPrice: '',
  trailAmount: '',
};

export const useDashboardStore = create<DashboardState>()((set) => ({
  // Symbol linking
  selectedSymbol: null,
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol?.toUpperCase() || null }),

  // Trade form state
  ...initialFormState,
  setTradeSide: (side) => set({ tradeSide: side }),
  setOrderType: (type) => set({ orderType: type }),
  setQuantity: (qty) => set({ quantity: qty }),
  setLimitPrice: (price) => set({ limitPrice: price }),
  setStopPrice: (price) => set({ stopPrice: price }),
  setTrailAmount: (amount) => set({ trailAmount: amount }),

  // Actions
  resetTradeForm: () => set(initialFormState),

  prefillSell: (symbol, quantity) =>
    set({
      selectedSymbol: symbol.toUpperCase(),
      tradeSide: 'sell',
      quantity: quantity.toString(),
      orderType: 'market',
      limitPrice: '',
      stopPrice: '',
      trailAmount: '',
    }),

  prefillBuy: (symbol) =>
    set({
      selectedSymbol: symbol.toUpperCase(),
      tradeSide: 'buy',
      quantity: '',
      orderType: 'market',
      limitPrice: '',
      stopPrice: '',
      trailAmount: '',
    }),
}));
