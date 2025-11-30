import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import {
  useStreamingStore,
  type StreamingQuote,
  type StreamingTrade,
  type StreamingTimesale,
} from '../store/streamingStore';

// Socket.io configuration - handles API behind path prefix (e.g., /api)
const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Parse the API URL to get origin and path separately
const getSocketConfig = () => {
  try {
    const url = new URL(rawApiUrl);
    const pathPrefix = url.pathname.replace(/\/+$/, '');
    return {
      // Socket.io connects to origin only, namespace is separate
      origin: url.origin,
      // Transport path includes the API prefix
      path: pathPrefix ? `${pathPrefix}/socket.io` : '/socket.io',
    };
  } catch {
    return {
      origin: rawApiUrl.replace(/\/+$/, ''),
      path: '/socket.io',
    };
  }
};

const socketConfig = getSocketConfig();

interface StreamEventPayload<T> {
  symbol: string;
  data: T;
  timestamp: string;
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const { accessToken: token, isAuthenticated } = useAuthStore();
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

    // Connect to origin with /streaming namespace
    // The path option handles the API prefix (e.g., /api/socket.io)
    const socket = io(`${socketConfig.origin}/streaming`, {
      auth: { token },
      path: socketConfig.path,
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

  // Reconnect when token changes (important for token refresh)
  useEffect(() => {
    if (token) {
      // If we have a token and socket exists with old token, reconnect
      if (socketRef.current?.connected) {
        // Disconnect and reconnect to use new token
        socketRef.current.disconnect();
        socketRef.current = null;
        connect();
      } else if (!socketRef.current) {
        connect();
      }
    } else if (socketRef.current) {
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
