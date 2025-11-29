import { create } from 'zustand';
import type { OrderType, OrderSide, TimeInForce } from '../types';

interface DashboardState {
  // Symbol linking
  selectedSymbol: string | null;
  setSelectedSymbol: (symbol: string | null) => void;

  // Trade form state
  tradeSide: OrderSide;
  setTradeSide: (side: OrderSide) => void;
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  timeInForce: TimeInForce;
  setTimeInForce: (tif: TimeInForce) => void;
  extendedHours: boolean;
  setExtendedHours: (enabled: boolean) => void;
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
  timeInForce: 'day' as TimeInForce,
  extendedHours: false,
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
  setTimeInForce: (tif) => set({ timeInForce: tif }),
  setExtendedHours: (enabled) => set({ extendedHours: enabled }),
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
      timeInForce: 'day',
      extendedHours: false,
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
      timeInForce: 'day',
      extendedHours: false,
      limitPrice: '',
      stopPrice: '',
      trailAmount: '',
    }),
}));
