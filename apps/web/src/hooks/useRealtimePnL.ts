import { useMemo } from 'react';
import { usePortfolio } from './usePortfolio';
import { useStreamingQuotes } from './useStreamingQuote';
import type { Position } from '../types';

export interface RealtimePosition extends Position {
  // Override with real-time values
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  // Additional real-time info
  isStreaming: boolean;
  bid?: number;
  ask?: number;
}

export interface RealtimePortfolio {
  cashBalance: number;
  positions: RealtimePosition[];
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  isLoading: boolean;
  hasStreamingData: boolean;
}

/**
 * Hook that combines portfolio data with real-time streaming prices.
 * - Fetches portfolio positions via REST
 * - Subscribes to streaming quotes for all position symbols
 * - Calculates real-time P&L
 */
export function useRealtimePnL(): RealtimePortfolio {
  const { data: portfolio, isLoading } = usePortfolio();

  // Get all symbols from positions
  const symbols = useMemo(
    () => portfolio?.positions.map((p) => p.symbol) ?? [],
    [portfolio],
  );

  // Subscribe to streaming quotes for all position symbols
  const streamingQuotes = useStreamingQuotes(symbols, { enabled: symbols.length > 0 });

  // Calculate real-time positions with streaming prices
  const realtimePositions = useMemo((): RealtimePosition[] => {
    if (!portfolio) return [];

    return portfolio.positions.map((position): RealtimePosition => {
      const quote = streamingQuotes.get(position.symbol.toUpperCase());

      // Use streaming price if available, otherwise use REST price
      const currentPrice = quote?.last ?? position.currentPrice;
      const marketValue = currentPrice * position.quantity;
      const costBasis = position.avgCostBasis * position.quantity;
      const gainLoss = marketValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      return {
        ...position,
        currentPrice,
        marketValue,
        gainLoss,
        gainLossPercent,
        isStreaming: quote?.isStreaming ?? false,
        bid: quote?.bid ?? undefined,
        ask: quote?.ask ?? undefined,
      };
    });
  }, [portfolio, streamingQuotes]);

  // Calculate totals
  const totals = useMemo(() => {
    const cashBalance = portfolio?.cashBalance ?? 0;
    const positionsValue = realtimePositions.reduce(
      (sum, p) => sum + p.marketValue,
      0,
    );
    const totalValue = cashBalance + positionsValue;

    const totalCostBasis = realtimePositions.reduce(
      (sum, p) => sum + p.avgCostBasis * p.quantity,
      0,
    );
    const totalGainLoss = positionsValue - totalCostBasis;
    const totalGainLossPercent =
      totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    const hasStreamingData = realtimePositions.some((p) => p.isStreaming);

    return {
      cashBalance,
      totalValue,
      totalGainLoss,
      totalGainLossPercent,
      hasStreamingData,
    };
  }, [portfolio, realtimePositions]);

  return {
    cashBalance: totals.cashBalance,
    positions: realtimePositions,
    totalValue: totals.totalValue,
    totalGainLoss: totals.totalGainLoss,
    totalGainLossPercent: totals.totalGainLossPercent,
    isLoading,
    hasStreamingData: totals.hasStreamingData,
  };
}
