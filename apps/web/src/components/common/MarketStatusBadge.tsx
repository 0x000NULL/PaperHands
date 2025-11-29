import type { CSSProperties } from 'react';
import { useMarketStatus } from '../../hooks/useMarketStatus';
import { theme } from '../../theme/constants';
import type { TradingSession } from '../../types';

interface MarketStatusBadgeProps {
  showNextChange?: boolean;
}

const sessionConfig: Record<
  TradingSession,
  { label: string; color: string; bgColor: string }
> = {
  regular: {
    label: 'OPEN',
    color: theme.colors.positive,
    bgColor: 'rgba(0, 255, 136, 0.15)',
  },
  pre_market: {
    label: 'PRE-MARKET',
    color: theme.colors.warning,
    bgColor: 'rgba(255, 165, 2, 0.15)',
  },
  after_hours: {
    label: 'AFTER HOURS',
    color: '#ff9500',
    bgColor: 'rgba(255, 149, 0, 0.15)',
  },
  closed: {
    label: 'CLOSED',
    color: theme.colors.textSecondary,
    bgColor: 'rgba(160, 160, 176, 0.15)',
  },
};

function formatTimeUntil(dateString: string | null): string {
  if (!dateString) return '';

  const target = new Date(dateString);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) return '';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export function MarketStatusBadge({
  showNextChange = false,
}: MarketStatusBadgeProps) {
  const { data: status, isLoading } = useMarketStatus();

  if (isLoading || !status) {
    return (
      <div style={styles.badge}>
        <span style={styles.dot} />
        <span style={{ color: theme.colors.textSecondary }}>...</span>
      </div>
    );
  }

  const config = sessionConfig[status.session];
  const nextChangeTime = status.isOpen ? status.nextClose : status.nextOpen;
  const nextChangeLabel = status.isOpen ? 'Closes' : 'Opens';

  return (
    <div
      style={{
        ...styles.badge,
        backgroundColor: config.bgColor,
        borderColor: config.color,
      }}
      title={
        nextChangeTime
          ? `${nextChangeLabel} ${new Date(nextChangeTime).toLocaleTimeString()}`
          : undefined
      }
    >
      <span
        style={{
          ...styles.dot,
          backgroundColor: config.color,
          boxShadow: `0 0 6px ${config.color}`,
        }}
      />
      <span style={{ ...styles.label, color: config.color }}>
        {config.label}
      </span>
      {showNextChange && nextChangeTime && (
        <span style={styles.timeUntil}>
          {nextChangeLabel} in {formatTimeUntil(nextChangeTime)}
        </span>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: theme.radius.full,
    border: '1px solid',
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  label: {
    letterSpacing: '0.05em',
  },
  timeUntil: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    marginLeft: '4px',
  },
};
