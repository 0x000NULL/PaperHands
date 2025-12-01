import { type CSSProperties } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { Toast } from './Toast';
import { theme } from '../../theme/constants';

export function ToastContainer() {
  const toasts = useNotificationStore((state) => state.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      <div style={styles.container}>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'fixed',
    top: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
};
