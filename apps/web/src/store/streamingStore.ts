import { create } from 'zustand';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface StreamingQuote {
  symbol: string;
  bid: number;
  bidSize: number;
  ask: number;
  askSize: number;
  last: number;
  timestamp: string;
}

export interface StreamingTrade {
  symbol: string;
  price: number;
  size: number;
  timestamp: string;
  exchange: string;
  cumulativeVolume: number;
}

export interface StreamingTimesale {
  symbol: string;
  price: number;
  size: number;
  timestamp: string;
  exchange: string;
  bid: number;
  ask: number;
  condition: 'at_bid' | 'at_ask' | 'between';
}

interface StreamingState {
  connectionStatus: ConnectionStatus;
  // Reference counting: symbol -> count of subscribers
  subscriptionCounts: Map<string, number>;
  quotes: Map<string, StreamingQuote>;
  trades: Map<string, StreamingTrade>;
  timesales: Map<string, StreamingTimesale[]>;
  error: string | null;

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setError: (error: string | null) => void;
  // Returns true if this is a new subscription (count went from 0 to 1)
  addSubscription: (symbol: string) => boolean;
  // Returns true if subscription should be removed (count went from 1 to 0)
  removeSubscription: (symbol: string) => boolean;
  clearSubscriptions: () => void;
  updateQuote: (quote: StreamingQuote) => void;
  updateTrade: (trade: StreamingTrade) => void;
  addTimesale: (timesale: StreamingTimesale) => void;
  getQuote: (symbol: string) => StreamingQuote | undefined;
  getTrade: (symbol: string) => StreamingTrade | undefined;
  getTimesales: (symbol: string) => StreamingTimesale[];
  getSubscribedSymbols: () => string[];
}

const MAX_TIMESALES_PER_SYMBOL = 100;

export const useStreamingStore = create<StreamingState>((set, get) => ({
  connectionStatus: 'disconnected',
  subscriptionCounts: new Map(),
  quotes: new Map(),
  trades: new Map(),
  timesales: new Map(),
  error: null,

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setError: (error) => set({ error }),

  addSubscription: (symbol) => {
    const upperSymbol = symbol.toUpperCase();
    const currentCount = get().subscriptionCounts.get(upperSymbol) || 0;
    const isNew = currentCount === 0;

    set((state) => {
      const newCounts = new Map(state.subscriptionCounts);
      newCounts.set(upperSymbol, currentCount + 1);
      return { subscriptionCounts: newCounts };
    });

    return isNew;
  },

  removeSubscription: (symbol) => {
    const upperSymbol = symbol.toUpperCase();
    const currentCount = get().subscriptionCounts.get(upperSymbol) || 0;

    if (currentCount <= 0) {
      return false;
    }

    const shouldRemove = currentCount === 1;

    set((state) => {
      const newCounts = new Map(state.subscriptionCounts);
      if (shouldRemove) {
        newCounts.delete(upperSymbol);
      } else {
        newCounts.set(upperSymbol, currentCount - 1);
      }
      return { subscriptionCounts: newCounts };
    });

    return shouldRemove;
  },

  clearSubscriptions: () =>
    set({
      subscriptionCounts: new Map(),
      quotes: new Map(),
      trades: new Map(),
      timesales: new Map(),
    }),

  getSubscribedSymbols: () => Array.from(get().subscriptionCounts.keys()),

  updateQuote: (quote) =>
    set((state) => {
      const newQuotes = new Map(state.quotes);
      newQuotes.set(quote.symbol.toUpperCase(), quote);
      return { quotes: newQuotes };
    }),

  updateTrade: (trade) =>
    set((state) => {
      const newTrades = new Map(state.trades);
      newTrades.set(trade.symbol.toUpperCase(), trade);
      return { trades: newTrades };
    }),

  addTimesale: (timesale) =>
    set((state) => {
      const symbol = timesale.symbol.toUpperCase();
      const newTimesales = new Map(state.timesales);
      const existing = newTimesales.get(symbol) || [];
      const updated = [timesale, ...existing].slice(0, MAX_TIMESALES_PER_SYMBOL);
      newTimesales.set(symbol, updated);
      return { timesales: newTimesales };
    }),

  getQuote: (symbol) => get().quotes.get(symbol.toUpperCase()),

  getTrade: (symbol) => get().trades.get(symbol.toUpperCase()),

  getTimesales: (symbol) => get().timesales.get(symbol.toUpperCase()) || [],
}));
