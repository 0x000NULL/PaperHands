import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useWebSocket } from './useWebSocket';
import { useStreamingStore } from '../store/streamingStore';

export const streamingQuoteKeys = {
  all: ['streamingQuotes'] as const,
  detail: (symbol: string) => [...streamingQuoteKeys.all, symbol] as const,
};

export interface StreamingQuoteResult {
  // Core quote data
  symbol: string;
  bid: number | null;
  ask: number | null;
  last: number | null;
  bidSize?: number;
  askSize?: number;
  change?: number;
  changePercent?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  volume?: number;

  // Metadata
  isStreaming: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  lastUpdate: Date | null;
}

/**
 * Hook that combines REST API quote with WebSocket streaming updates.
 * - Fetches initial quote data via REST
 * - Subscribes to WebSocket for real-time updates
 * - Merges streaming data with REST data
 */
export function useStreamingQuote(
  symbol: string,
  options: { enabled?: boolean } = {},
): StreamingQuoteResult {
  const { enabled = true } = options;
  const upperSymbol = symbol.toUpperCase();
  const { subscribe, unsubscribe, isConnected } = useWebSocket();

  // Fetch initial quote via REST API
  const {
    data: restQuote,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: streamingQuoteKeys.detail(upperSymbol),
    queryFn: () => api.getQuote(upperSymbol),
    enabled: enabled && symbol.length > 0,
    staleTime: 30000, // 30 seconds - we rely on streaming for fresh data
    retry: 1,
  });

  // Get streaming quote from store
  const streamingQuote = useStreamingStore((state) =>
    state.quotes.get(upperSymbol),
  );

  // Subscribe to symbol when connected
  useEffect(() => {
    if (!enabled || !symbol || !isConnected) {
      return;
    }

    subscribe([upperSymbol]);

    return () => {
      unsubscribe([upperSymbol]);
    };
  }, [symbol, upperSymbol, enabled, isConnected, subscribe, unsubscribe]);

  // Merge REST and streaming data
  const mergedQuote = useMemo((): StreamingQuoteResult => {
    const isStreaming = !!streamingQuote;

    // Base from REST data
    const base: StreamingQuoteResult = {
      symbol: upperSymbol,
      bid: restQuote?.bid ?? null,
      ask: restQuote?.ask ?? null,
      last: restQuote?.last ?? null,
      change: restQuote?.change,
      changePercent: restQuote?.change_percentage,
      high: restQuote?.high,
      low: restQuote?.low,
      open: restQuote?.open,
      previousClose: restQuote?.close ?? undefined,
      volume: restQuote?.volume,
      isStreaming,
      isLoading,
      isError,
      error: error as Error | null,
      lastUpdate: restQuote ? new Date() : null,
    };

    // Override with streaming data if available
    if (streamingQuote) {
      return {
        ...base,
        bid: streamingQuote.bid,
        ask: streamingQuote.ask,
        last: streamingQuote.last,
        bidSize: streamingQuote.bidSize,
        askSize: streamingQuote.askSize,
        lastUpdate: new Date(streamingQuote.timestamp),
      };
    }

    return base;
  }, [restQuote, streamingQuote, upperSymbol, isLoading, isError, error]);

  return mergedQuote;
}

/**
 * Hook for subscribing to multiple symbols at once
 */
export function useStreamingQuotes(
  symbols: string[],
  options: { enabled?: boolean } = {},
): Map<string, StreamingQuoteResult> {
  const { enabled = true } = options;
  const { subscribe, unsubscribe, isConnected } = useWebSocket();

  // Create a stable key from sorted symbols to avoid dependency array issues
  const symbolsKey = useMemo(
    () =>
      symbols
        .map((s) => s.toUpperCase())
        .sort()
        .join(','),
    [symbols],
  );

  // Parse the stable key back to an array
  const upperSymbols = useMemo(
    () => (symbolsKey ? symbolsKey.split(',') : []),
    [symbolsKey],
  );

  // Fetch initial quotes via REST API
  const { data: restQuotes, isLoading } = useQuery({
    queryKey: ['quotes', upperSymbols.join(',')],
    queryFn: () => api.getQuotes(upperSymbols),
    enabled: enabled && upperSymbols.length > 0,
    staleTime: 30000,
    retry: 1,
  });

  // Get streaming quotes from store
  const streamingQuotes = useStreamingStore((state) => state.quotes);

  // Subscribe to all symbols when connected
  useEffect(() => {
    if (!enabled || upperSymbols.length === 0 || !isConnected) {
      return;
    }

    subscribe(upperSymbols);

    return () => {
      unsubscribe(upperSymbols);
    };
  }, [upperSymbols, enabled, isConnected, subscribe, unsubscribe]);

  // Build result map
  const result = useMemo(() => {
    const map = new Map<string, StreamingQuoteResult>();

    for (const symbol of upperSymbols) {
      const rest = restQuotes?.find(
        (q) => q.symbol.toUpperCase() === symbol,
      );
      const streaming = streamingQuotes.get(symbol);

      const quote: StreamingQuoteResult = {
        symbol,
        bid: streaming?.bid ?? rest?.bid ?? null,
        ask: streaming?.ask ?? rest?.ask ?? null,
        last: streaming?.last ?? rest?.last ?? null,
        bidSize: streaming?.bidSize,
        askSize: streaming?.askSize,
        change: rest?.change,
        changePercent: rest?.change_percentage,
        high: rest?.high,
        low: rest?.low,
        open: rest?.open,
        previousClose: rest?.close ?? undefined,
        volume: rest?.volume,
        isStreaming: !!streaming,
        isLoading,
        isError: false,
        error: null,
        lastUpdate: streaming
          ? new Date(streaming.timestamp)
          : rest
            ? new Date()
            : null,
      };

      map.set(symbol, quote);
    }

    return map;
  }, [upperSymbols, restQuotes, streamingQuotes, isLoading]);

  return result;
}
