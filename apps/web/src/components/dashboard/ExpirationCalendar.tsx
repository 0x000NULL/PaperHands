import { useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../../theme/constants';
import { api } from '../../api/client';
import { Widget } from './Widget';
import type { ExpirationCalendarItem, OptionPosition } from '../../types';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  loading: {
    padding: theme.spacing.xl,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  empty: {
    padding: theme.spacing.xl,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  expirationCard: {
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  expirationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  dateContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 50,
  },
  dateMonth: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: theme.typography.semibold,
  },
  dateDay: {
    fontSize: theme.typography['2xl'],
    fontWeight: theme.typography.bold,
    color: theme.colors.textPrimary,
  },
  expirationInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
  },
  expirationLabel: {
    fontSize: theme.typography.sm,
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.medium,
  },
  daysLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  contractCount: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  contractNumber: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.textPrimary,
  },
  contractLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  expandIcon: {
    fontSize: theme.typography.lg,
    color: theme.colors.textSecondary,
    transition: 'transform 0.2s ease',
  },
  positionsContainer: {
    borderTop: `1px solid ${theme.colors.border}`,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgSecondary,
  },
  positionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.sm} 0`,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  positionRowLast: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.sm} 0`,
  },
  positionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  optionTypeBadge: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase',
  },
  callBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    color: theme.colors.positive,
  },
  putBadge: {
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    color: theme.colors.negative,
  },
  positionDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  positionSymbol: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.textPrimary,
  },
  positionStrike: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  positionRight: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  quantityContainer: {
    textAlign: 'center',
  },
  quantity: {
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
    fontWeight: theme.typography.medium,
  },
  quantityLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  valueContainer: {
    textAlign: 'right',
    minWidth: 80,
  },
  marketValue: {
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.textPrimary,
  },
  gainLoss: {
    fontSize: theme.typography.xs,
    fontFamily: theme.typography.fontMono,
  },
  urgencyIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  cardWrapper: {
    position: 'relative',
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
};

const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value >= 0 ? '' : '-';
  return `${sign}$${absValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPercent = (value: number): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const getValueColor = (value: number): string => {
  if (value > 0) return theme.colors.positive;
  if (value < 0) return theme.colors.negative;
  return theme.colors.textPrimary;
};

const getUrgencyColor = (daysToExpiration: number): string => {
  if (daysToExpiration <= 3) return theme.colors.negative;
  if (daysToExpiration <= 7) return theme.colors.warning;
  if (daysToExpiration <= 14) return '#FFA500';
  return theme.colors.accent;
};

const getDaysLabel = (days: number): string => {
  if (days === 0) return 'Expires today!';
  if (days === 1) return 'Expires tomorrow';
  return `${days} days`;
};

interface ExpirationCardProps {
  item: ExpirationCalendarItem;
  isExpanded: boolean;
  onToggle: () => void;
}

function ExpirationCard({ item, isExpanded, onToggle }: ExpirationCardProps) {
  const date = new Date(item.expirationDate);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const urgencyColor = getUrgencyColor(item.daysToExpiration);

  return (
    <div style={styles.cardWrapper}>
      <div
        style={{
          ...styles.urgencyIndicator,
          backgroundColor: urgencyColor,
        }}
      />
      <div style={{ ...styles.expirationCard, marginLeft: 4 }}>
        <div style={styles.expirationHeader} onClick={onToggle}>
          <div style={styles.headerLeft}>
            <div style={styles.dateContainer}>
              <span style={styles.dateMonth}>{month}</span>
              <span style={styles.dateDay}>{day}</span>
            </div>
            <div style={styles.expirationInfo}>
              <span style={styles.expirationLabel}>
                {date.toLocaleDateString('en-US', { weekday: 'long' })}
              </span>
              <span
                style={{
                  ...styles.daysLabel,
                  color:
                    item.daysToExpiration <= 7
                      ? urgencyColor
                      : theme.colors.textSecondary,
                }}
              >
                {getDaysLabel(item.daysToExpiration)}
              </span>
            </div>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.contractCount}>
              <span style={styles.contractNumber}>{item.totalContracts}</span>
              <span style={styles.contractLabel}>
                contract{item.totalContracts !== 1 ? 's' : ''}
              </span>
            </div>
            <span
              style={{
                ...styles.expandIcon,
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▼
            </span>
          </div>
        </div>

        {isExpanded && item.positions.length > 0 && (
          <PositionsList positions={item.positions} />
        )}
      </div>
    </div>
  );
}

function PositionsList({ positions }: { positions: OptionPosition[] }) {
  return (
    <div style={styles.positionsContainer}>
      {positions.map((position, index) => (
        <div
          key={position.id}
          style={
            index === positions.length - 1
              ? styles.positionRowLast
              : styles.positionRow
          }
        >
          <div style={styles.positionLeft}>
            <span
              style={{
                ...styles.optionTypeBadge,
                ...(position.optionType === 'call'
                  ? styles.callBadge
                  : styles.putBadge),
              }}
            >
              {position.optionType}
            </span>
            <div style={styles.positionDetails}>
              <span style={styles.positionSymbol}>
                {position.underlyingSymbol}
              </span>
              <span style={styles.positionStrike}>
                ${position.strikePrice.toFixed(2)} strike
              </span>
            </div>
          </div>
          <div style={styles.positionRight}>
            <div style={styles.quantityContainer}>
              <span
                style={{
                  ...styles.quantity,
                  color:
                    position.quantity > 0
                      ? theme.colors.positive
                      : theme.colors.negative,
                }}
              >
                {position.quantity > 0 ? '+' : ''}
                {position.quantity}
              </span>
              <span style={styles.quantityLabel}>
                {position.quantity > 0 ? 'long' : 'short'}
              </span>
            </div>
            <div style={styles.valueContainer}>
              <span style={styles.marketValue}>
                {formatCurrency(position.marketValue)}
              </span>
              <span
                style={{
                  ...styles.gainLoss,
                  color: getValueColor(position.gainLoss),
                }}
              >
                {formatPercent(position.gainLossPercent)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ExpirationCalendar() {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const { data: expirations, isLoading } = useQuery({
    queryKey: ['portfolio', 'options', 'expirations'],
    queryFn: () => api.getOptionExpirations(),
    staleTime: 30000,
  });

  const toggleExpanded = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Widget title="Upcoming Expirations">
        <div style={styles.loading}>Loading expirations...</div>
      </Widget>
    );
  }

  if (!expirations || expirations.length === 0) {
    return (
      <Widget title="Upcoming Expirations">
        <div style={styles.empty}>No option positions with upcoming expirations</div>
      </Widget>
    );
  }

  // Sort by expiration date
  const sortedExpirations = [...expirations].sort(
    (a, b) =>
      new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
  );

  return (
    <Widget title="Upcoming Expirations">
      <div style={styles.container}>
        {sortedExpirations.map((item) => (
          <ExpirationCard
            key={item.expirationDate}
            item={item}
            isExpanded={expandedDates.has(item.expirationDate)}
            onToggle={() => toggleExpanded(item.expirationDate)}
          />
        ))}
      </div>
    </Widget>
  );
}
