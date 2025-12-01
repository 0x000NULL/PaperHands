import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import {
  useNotificationStore,
  getToastType,
  type ServerNotification,
} from '../store/notificationStore';

// Socket.io configuration - handles API behind path prefix
const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const getSocketConfig = () => {
  try {
    const url = new URL(rawApiUrl);
    const pathPrefix = url.pathname.replace(/\/+$/, '');
    return {
      origin: url.origin,
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

export function useNotifications() {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken: token, isAuthenticated } = useAuthStore();
  const {
    toasts,
    notifications,
    unreadCount,
    addToast,
    addNotification,
    setNotifications,
    setUnreadCount,
  } = useNotificationStore();

  const connect = useCallback(() => {
    if (!token || socketRef.current?.connected) {
      return;
    }

    const socket = io(`${socketConfig.origin}/notifications`, {
      auth: { token },
      path: socketConfig.path,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[Notifications] Connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Notifications] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Notifications] Connection error:', error.message);
    });

    // Handle incoming notifications
    socket.on('notification', (notification: ServerNotification) => {
      console.log('[Notifications] Received:', notification);

      // Add to notification history
      addNotification(notification);

      // Show toast
      addToast({
        type: getToastType(notification.type),
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
      });
    });

    socketRef.current = socket;
  }, [token, addNotification, addToast]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
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
    if (token) {
      if (socketRef.current?.connected) {
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
    toasts,
    notifications,
    unreadCount,
    setNotifications,
    setUnreadCount,
  };
}
