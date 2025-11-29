import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import {
  useStreamingStore,
  type StreamingQuote,
  type StreamingTrade,
  type StreamingTimesale,
} from '../store/streamingStore';

// Socket.io URL - uses HTTP for initial handshake, handles upgrade internally
const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const socketUrl = rawApiUrl.replace(/\/+$/, '');

// Extract the path prefix from the API URL (e.g., '/api' from 'https://example.com/api')
const getSocketPath = () => {
  try {
    const url = new URL(rawApiUrl);
    const pathPrefix = url.pathname.replace(/\/+$/, '');
    // Socket.io path must include the prefix if API is behind a path
    return pathPrefix ? `${pathPrefix}/socket.io` : '/socket.io';
  } catch {
    return '/socket.io';
  }
};

interface StreamEventPayload<T> {
  symbol: string;
  data: T;
  timestamp: string;
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const { token, isAuthenticated } = useAuthStore();
  const {
    connectionStatus,
    setConnectionStatus,
    setError,
    updateQuote,
    updateTrade,
    addTimesale,
    clearSubscriptions,
    getSubscribedSymbols,
  } = useStreamingStore();

  const connect = useCallback(() => {
    if (!token || socketRef.current?.connected) {
      return;
    }

    setConnectionStatus('connecting');
    setError(null);

    const socket = io(`${socketUrl}/streaming`, {
      auth: { token },
      path: getSocketPath(),
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setConnectionStatus('connected');
      setError(null);

      // Resubscribe to previously subscribed symbols
      const symbols = getSubscribedSymbols();
      if (symbols.length > 0) {
        socket.emit('subscribe', { symbols });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        setConnectionStatus('disconnected');
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message);
      setConnectionStatus('error');
      setError(error.message);
    });

    socket.on('quote', (payload: StreamEventPayload<StreamingQuote>) => {
      updateQuote({
        ...payload.data,
        symbol: payload.symbol,
        timestamp: payload.timestamp,
      });
    });

    socket.on('trade', (payload: StreamEventPayload<StreamingTrade>) => {
      updateTrade({
        ...payload.data,
        symbol: payload.symbol,
        timestamp: payload.timestamp,
      });
    });

    socket.on('timesale', (payload: StreamEventPayload<StreamingTimesale>) => {
      addTimesale({
        ...payload.data,
        symbol: payload.symbol,
        timestamp: payload.timestamp,
      });
    });

    socketRef.current = socket;
  }, [
    token,
    setConnectionStatus,
    setError,
    updateQuote,
    updateTrade,
    addTimesale,
    getSubscribedSymbols,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setConnectionStatus('disconnected');
    clearSubscriptions();
  }, [setConnectionStatus, clearSubscriptions]);

  const subscribe = useCallback((symbols: string[]) => {
    const upperSymbols = symbols.map((s) => s.toUpperCase());

    // Only add to server subscription for symbols that are newly subscribed (count 0->1)
    const newSymbols = upperSymbols.filter((symbol) =>
      useStreamingStore.getState().addSubscription(symbol)
    );

    if (newSymbols.length === 0) {
      return; // No new symbols to subscribe to
    }

    if (!socketRef.current?.connected) {
      console.warn('[WebSocket] Cannot subscribe - not connected (symbols added to store for reconnect)');
      return;
    }

    socketRef.current.emit('subscribe', { symbols: newSymbols });
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    const upperSymbols = symbols.map((s) => s.toUpperCase());

    // Only remove from server for symbols that no longer have subscribers (count 1->0)
    const removedSymbols = upperSymbols.filter((symbol) =>
      useStreamingStore.getState().removeSubscription(symbol)
    );

    if (removedSymbols.length === 0) {
      return; // Still have other subscribers for these symbols
    }

    if (!socketRef.current?.connected) {
      return;
    }

    socketRef.current.emit('unsubscribe', { symbols: removedSymbols });
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated() && !socketRef.current) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  // Reconnect when token changes
  useEffect(() => {
    if (token && !socketRef.current?.connected) {
      connect();
    } else if (!token && socketRef.current) {
      disconnect();
    }
  }, [token, connect, disconnect]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    connect,
    disconnect,
    subscribe,
    unsubscribe,
  };
}
