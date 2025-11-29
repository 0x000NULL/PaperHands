import { useMemo, useEffect } from 'react';
import { useHistoricalData } from './useHistoricalData';
import { useWebSocket } from './useWebSocket';
import { useStreamingStore } from '../store/streamingStore';
import type { Candle, Timeframe } from '../types';

/**
 * Hook that combines historical candle data with real-time streaming updates.
 * Updates the most recent candle with live price data.
 */
export function useRealtimeCandles(
  symbol: string,
  timeframe: Timeframe,
  enabled = true,
) {
  const upperSymbol = symbol.toUpperCase();
  const { subscribe, unsubscribe, isConnected } = useWebSocket();

  // Fetch historical data
  const { data, isLoading, error, refetch } = useHistoricalData(
    symbol,
    timeframe,
    enabled,
  );

  // Get streaming quote and trade from store
  const streamingQuote = useStreamingStore((state) =>
    state.quotes.get(upperSymbol),
  );
  const streamingTrade = useStreamingStore((state) =>
    state.trades.get(upperSymbol),
  );

  // Subscribe to streaming data for this symbol
  useEffect(() => {
    if (!enabled || !symbol || !isConnected) {
      return;
    }

    subscribe([upperSymbol]);

    return () => {
      unsubscribe([upperSymbol]);
    };
  }, [symbol, upperSymbol, enabled, isConnected, subscribe, unsubscribe]);

  // Merge historical candles with real-time updates
  const realtimeCandles = useMemo((): Candle[] => {
    if (!data?.candles || data.candles.length === 0) {
      return [];
    }

    // Get the current price from streaming data
    const currentPrice =
      streamingTrade?.price ?? streamingQuote?.last ?? null;

    if (currentPrice === null) {
      return data.candles;
    }

    // Clone the candles array
    const candles = [...data.candles];
    const lastCandle = candles[candles.length - 1];

    if (!lastCandle) {
      return candles;
    }

    // Update the last candle with current price
    // We update high/low/close with real-time data
    const updatedCandle: Candle = {
      ...lastCandle,
      high: Math.max(lastCandle.high, currentPrice),
      low: Math.min(lastCandle.low, currentPrice),
      close: currentPrice,
      // Update volume if we have cumulative volume from trade
      volume: streamingTrade?.cumulativeVolume ?? lastCandle.volume,
    };

    candles[candles.length - 1] = updatedCandle;

    return candles;
  }, [data, streamingQuote, streamingTrade]);

  return {
    data: data
      ? {
          ...data,
          candles: realtimeCandles,
        }
      : undefined,
    isLoading,
    error,
    refetch,
    isStreaming: !!(streamingQuote || streamingTrade),
  };
}
