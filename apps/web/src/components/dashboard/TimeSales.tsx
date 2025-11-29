import { useEffect, useRef, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useDashboardStore } from '../../store/dashboardStore';
import { useStreamingStore, type StreamingTimesale } from '../../store/streamingStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Widget } from './Widget';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '300px',
  },
  header: {
    display: 'grid',
    gridTemplateColumns: '80px 80px 60px 1fr',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: `${theme.radius.md} ${theme.radius.md} 0 0`,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  scrollContainer: {
    flex: 1,
    overflow: 'auto',
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: `0 0 ${theme.radius.md} ${theme.radius.md}`,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '80px 80px 60px 1fr',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  priceAtBid: {
    color: theme.colors.negative,
  },
  priceAtAsk: {
    color: theme.colors.positive,
  },
  priceBetween: {
    color: theme.colors.textPrimary,
  },
  size: {
    color: theme.colors.textSecondary,
  },
  time: {
    color: theme.colors.textTertiary,
    textAlign: 'right',
  },
  exchange: {
    color: theme.colors.textTertiary,
    fontSize: theme.typography.xs,
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  noSymbol: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    padding: theme.spacing.lg,
    textAlign: 'center',
  },
};

const formatPrice = (price: number) => `$${price.toFixed(2)}`;

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const formatSize = (size: number) => {
  if (size >= 1000) {
    return `${(size / 1000).toFixed(1)}K`;
  }
  return size.toString();
};

interface TimeSaleRowProps {
  trade: StreamingTimesale;
}

function TimeSaleRow({ trade }: TimeSaleRowProps) {
  const priceStyle =
    trade.condition === 'at_bid'
      ? styles.priceAtBid
      : trade.condition === 'at_ask'
        ? styles.priceAtAsk
        : styles.priceBetween;

  return (
    <div style={styles.row}>
      <div style={priceStyle}>{formatPrice(trade.price)}</div>
      <div style={styles.size}>{formatSize(trade.size)}</div>
      <div style={styles.exchange}>{trade.exchange}</div>
      <div style={styles.time}>{formatTime(trade.timestamp)}</div>
    </div>
  );
}

export function TimeSales() {
  const selectedSymbol = useDashboardStore((state) => state.selectedSymbol);
  const { subscribe, unsubscribe, isConnected } = useWebSocket();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get timesales from store
  const timesales = useStreamingStore((state) =>
    selectedSymbol ? state.timesales.get(selectedSymbol.toUpperCase()) || [] : [],
  );

  // Subscribe to symbol when selected
  useEffect(() => {
    if (!selectedSymbol || !isConnected) {
      return;
    }

    subscribe([selectedSymbol.toUpperCase()]);

    return () => {
      unsubscribe([selectedSymbol.toUpperCase()]);
    };
  }, [selectedSymbol, isConnected, subscribe, unsubscribe]);

  // Auto-scroll to show new trades
  useEffect(() => {
    if (scrollRef.current && timesales.length > 0) {
      scrollRef.current.scrollTop = 0;
    }
  }, [timesales.length]);

  if (!selectedSymbol) {
    return (
      <Widget title="Time & Sales">
        <div style={styles.container}>
          <div style={styles.noSymbol}>
            Select a symbol to view real-time trades
          </div>
        </div>
      </Widget>
    );
  }

  return (
    <Widget title={`Time & Sales - ${selectedSymbol.toUpperCase()}`}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>Price</div>
          <div>Size</div>
          <div>Exch</div>
          <div style={{ textAlign: 'right' }}>Time</div>
        </div>
        <div ref={scrollRef} style={styles.scrollContainer}>
          {timesales.length === 0 ? (
            <div style={styles.empty}>
              {isConnected
                ? 'Waiting for trades...'
                : 'Connecting to stream...'}
            </div>
          ) : (
            timesales.map((trade, index) => (
              <TimeSaleRow key={`${trade.timestamp}-${index}`} trade={trade} />
            ))
          )}
        </div>
      </div>
    </Widget>
  );
}
