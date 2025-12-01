import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { theme } from '../../theme/constants';
import { api, type Notification } from '../../api/client';
import { useNotificationStore } from '../../store/notificationStore';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { unreadCount, setUnreadCount, setNotifications } = useNotificationStore();

  // Fetch notifications
  const { data } = useQuery({
    queryKey: ['notifications', { limit: 10 }],
    queryFn: () => api.getNotifications({ limit: 10 }),
    staleTime: 30000,
    refetchInterval: 60000, // Refetch every minute
  });

  // Update store when data changes
  useEffect(() => {
    if (data) {
      setNotifications(data.notifications as any);
      setUnreadCount(data.unreadCount);
    }
  }, [data, setNotifications, setUnreadCount]);

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: (id: string) => api.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsRead = useMutation({
    mutationFn: () => api.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setUnreadCount(0);
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }

    // Navigate based on notification type
    if (notification.metadata?.orderId) {
      navigate('/orders');
    } else if (notification.metadata?.alertId) {
      navigate('/alerts');
    }

    setIsOpen(false);
  };

  const notifications = data?.notifications || [];

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        style={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <span style={styles.bellIcon}>{'\uD83D\uDD14'}</span>
        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <span style={styles.dropdownTitle}>Notifications</span>
            {unreadCount > 0 && (
              <button
                style={styles.markAllButton}
                onClick={() => markAllAsRead.mutate()}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={styles.notificationList}>
            {notifications.length === 0 ? (
              <div style={styles.emptyState}>No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  style={{
                    ...styles.notificationItem,
                    backgroundColor: notification.isRead
                      ? 'transparent'
                      : 'rgba(0, 255, 136, 0.05)',
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div style={styles.notificationIcon}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div style={styles.notificationContent}>
                    <div style={styles.notificationTitle}>{notification.title}</div>
                    <div style={styles.notificationMessage}>{notification.message}</div>
                    <div style={styles.notificationTime}>
                      {formatTimeAgo(notification.createdAt)}
                    </div>
                  </div>
                  {!notification.isRead && <div style={styles.unreadDot} />}
                </div>
              ))
            )}
          </div>

          <div style={styles.dropdownFooter}>
            <button
              style={styles.viewAllButton}
              onClick={() => {
                navigate('/alerts');
                setIsOpen(false);
              }}
            >
              View All Alerts
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    ALERT_TRIGGERED: '\uD83D\uDD14',
    ORDER_FILLED: '\u2713',
    ORDER_CANCELLED: '\u2717',
    ORDER_REJECTED: '\u26D4',
    OPTION_EXPIRED: '\u23F0',
    OPTION_EXERCISED: '\uD83C\uDFAF',
    OPTION_ASSIGNED: '\uD83D\uDCCB',
    DIVIDEND_RECEIVED: '\uD83D\uDCB0',
    SYSTEM: '\u2139',
  };
  return icons[type] || '\u2022';
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'relative',
  },
  bellButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: theme.radius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: `background ${theme.transitions.fast}`,
  },
  bellIcon: {
    fontSize: '1.25rem',
  },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    backgroundColor: theme.colors.negative,
    color: 'white',
    fontSize: '10px',
    fontWeight: theme.typography.bold,
    padding: '2px 5px',
    borderRadius: theme.radius.full,
    minWidth: '16px',
    textAlign: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    width: '360px',
    backgroundColor: theme.colors.bgSecondary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.lg,
    boxShadow: theme.shadows.lg,
    overflow: 'hidden',
    zIndex: 1000,
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  dropdownTitle: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
  },
  markAllButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.accent,
    fontSize: theme.typography.xs,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: theme.radius.sm,
  },
  notificationList: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    cursor: 'pointer',
    borderBottom: `1px solid ${theme.colors.border}`,
    transition: `background ${theme.transitions.fast}`,
    position: 'relative',
  },
  notificationIcon: {
    fontSize: '1rem',
    flexShrink: 0,
    marginTop: '2px',
  },
  notificationContent: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitle: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.textPrimary,
    marginBottom: '2px',
  },
  notificationMessage: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    lineHeight: 1.4,
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  notificationTime: {
    fontSize: '10px',
    color: theme.colors.textTertiary,
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: theme.colors.accent,
    flexShrink: 0,
    marginTop: '4px',
  },
  emptyState: {
    padding: theme.spacing.xl,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  dropdownFooter: {
    padding: theme.spacing.sm,
    borderTop: `1px solid ${theme.colors.border}`,
    textAlign: 'center',
  },
  viewAllButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.accent,
    fontSize: theme.typography.sm,
    cursor: 'pointer',
    padding: '8px 16px',
    width: '100%',
    borderRadius: theme.radius.md,
    transition: `background ${theme.transitions.fast}`,
  },
};
