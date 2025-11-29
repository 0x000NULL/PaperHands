import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useStreamingStore, type ConnectionStatus as ConnectionStatusType } from '../../store/streamingStore';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.medium,
    borderRadius: theme.radius.full,
    cursor: 'default',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
};

const statusConfig: Record<
  ConnectionStatusType,
  { label: string; color: string; bgColor: string }
> = {
  connected: {
    label: 'Live',
    color: theme.colors.positive,
    bgColor: 'rgba(46, 204, 113, 0.15)',
  },
  connecting: {
    label: 'Connecting',
    color: theme.colors.warning,
    bgColor: 'rgba(241, 196, 15, 0.15)',
  },
  disconnected: {
    label: 'Offline',
    color: theme.colors.textTertiary,
    bgColor: theme.colors.bgTertiary,
  },
  error: {
    label: 'Error',
    color: theme.colors.negative,
    bgColor: 'rgba(255, 71, 87, 0.15)',
  },
};

export function ConnectionStatusBadge() {
  const connectionStatus = useStreamingStore((state) => state.connectionStatus);
  const error = useStreamingStore((state) => state.error);
  const config = statusConfig[connectionStatus];

  return (
    <div
      style={{
        ...styles.container,
        color: config.color,
        backgroundColor: config.bgColor,
      }}
      title={error || undefined}
    >
      <span
        style={{
          ...styles.dot,
          backgroundColor: config.color,
          boxShadow:
            connectionStatus === 'connected'
              ? `0 0 8px ${config.color}`
              : undefined,
        }}
      />
      {config.label}
    </div>
  );
}
