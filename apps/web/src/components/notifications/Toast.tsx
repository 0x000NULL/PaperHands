import { type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useNotificationStore, type Toast as ToastType, type ToastType as ToastVariant } from '../../store/notificationStore';

interface ToastProps {
  toast: ToastType;
}

const typeConfig: Record<
  ToastVariant,
  { icon: string; color: string; bgColor: string; borderColor: string }
> = {
  success: {
    icon: '\u2713', // checkmark
    color: theme.colors.positive,
    bgColor: 'rgba(0, 255, 136, 0.1)',
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  error: {
    icon: '\u2717', // x mark
    color: theme.colors.negative,
    bgColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  warning: {
    icon: '\u26A0', // warning triangle
    color: theme.colors.warning,
    bgColor: 'rgba(255, 165, 2, 0.1)',
    borderColor: 'rgba(255, 165, 2, 0.3)',
  },
  info: {
    icon: '\u2139', // info
    color: theme.colors.info,
    bgColor: 'rgba(10, 132, 255, 0.1)',
    borderColor: 'rgba(10, 132, 255, 0.3)',
  },
  alert: {
    icon: '\uD83D\uDD14', // bell
    color: '#FFD60A',
    bgColor: 'rgba(255, 214, 10, 0.1)',
    borderColor: 'rgba(255, 214, 10, 0.3)',
  },
};

export function Toast({ toast }: ToastProps) {
  const removeToast = useNotificationStore((state) => state.removeToast);
  const config = typeConfig[toast.type];

  return (
    <div
      style={{
        ...styles.toast,
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
      }}
      onClick={() => removeToast(toast.id)}
      role="alert"
    >
      <div style={{ ...styles.icon, color: config.color }}>{config.icon}</div>
      <div style={styles.content}>
        <div style={{ ...styles.title, color: config.color }}>{toast.title}</div>
        <div style={styles.message}>{toast.message}</div>
      </div>
      <button
        style={styles.closeButton}
        onClick={(e) => {
          e.stopPropagation();
          removeToast(toast.id);
        }}
        aria-label="Dismiss notification"
      >
        \u2715
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  toast: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    border: '1px solid',
    boxShadow: theme.shadows.lg,
    minWidth: '300px',
    maxWidth: '400px',
    cursor: 'pointer',
    animation: 'slideIn 0.3s ease-out',
  },
  icon: {
    fontSize: '1.25rem',
    flexShrink: 0,
    marginTop: '2px',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    marginBottom: '4px',
  },
  message: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.textSecondary,
    cursor: 'pointer',
    padding: '4px',
    fontSize: theme.typography.sm,
    lineHeight: 1,
    opacity: 0.6,
    transition: `opacity ${theme.transitions.fast}`,
  },
};
