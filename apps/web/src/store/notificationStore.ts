import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'alert';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  duration?: number; // auto-dismiss time in ms, default 5000
}

export interface ServerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  // Toasts for immediate display
  toasts: Toast[];
  // Server notifications for history
  notifications: ServerNotification[];
  unreadCount: number;

  // Toast actions
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Server notification actions
  setNotifications: (notifications: ServerNotification[]) => void;
  addNotification: (notification: ServerNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setUnreadCount: (count: number) => void;
  removeNotification: (id: string) => void;
}

let toastIdCounter = 0;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],
  notifications: [],
  unreadCount: 0,

  addToast: (toast) => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`;
    const newToast: Toast = {
      ...toast,
      id,
      createdAt: new Date(),
      duration: toast.duration ?? 5000,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }

    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),

  setNotifications: (notifications) => set({ notifications }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 100),
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(
        0,
        state.unreadCount -
          (state.notifications.find((n) => n.id === id && !n.isRead) ? 1 : 0)
      ),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  setUnreadCount: (count) => set({ unreadCount: count }),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));

// Helper function to convert server notification type to toast type
export function getToastType(serverType: string): ToastType {
  const typeMap: Record<string, ToastType> = {
    ALERT_TRIGGERED: 'alert',
    ORDER_FILLED: 'success',
    ORDER_CANCELLED: 'warning',
    ORDER_REJECTED: 'error',
    OPTION_EXPIRED: 'info',
    OPTION_EXERCISED: 'info',
    OPTION_ASSIGNED: 'info',
    DIVIDEND_RECEIVED: 'success',
    SYSTEM: 'info',
  };
  return typeMap[serverType] || 'info';
}
