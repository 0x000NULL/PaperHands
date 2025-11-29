import { useState, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useDashboardStore } from '../../store/dashboardStore';
import { useRealtimeCandles } from '../../hooks';
import { Widget } from './Widget';
import { ChartContainer, type ChartType } from './ChartContainer';
import { TimeframeSelector } from './TimeframeSelector';
import { ChartTypeToggle } from './ChartTypeToggle';
import { OHLCVStats } from './OHLCVStats';
import type { Timeframe } from '../../types';

const styles: Record<string, CSSProperties> = {
  headerActions: {
    display: 'flex',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  chartWrapper: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '450px',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    color: theme.colors.textTertiary,
    fontSize: theme.typography.sm,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    color: theme.colors.negative,
    fontSize: theme.typography.sm,
  },
};

export function ChartPanel() {
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');

  const selectedSymbol = useDashboardStore((state) => state.selectedSymbol);

  const { data, isLoading, error, isStreaming } = useRealtimeCandles(
    selectedSymbol ?? '',
    timeframe,
    !!selectedSymbol,
  );

  const headerAction = (
    <div style={styles.headerActions}>
      <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
      <ChartTypeToggle chartType={chartType} onChange={setChartType} />
    </div>
  );

  // Build title with streaming indicator
  const chartTitle = selectedSymbol
    ? `${selectedSymbol} Chart${isStreaming ? ' \u25cf' : ''}`
    : 'Chart';

  return (
    <Widget
      title={chartTitle}
      headerAction={headerAction}
      noPadding
    >
      <div style={styles.chartWrapper}>
        {!selectedSymbol && (
          <div style={styles.empty}>Select a symbol to view chart</div>
        )}

        {selectedSymbol && isLoading && (
          <div style={styles.loading}>Loading chart data...</div>
        )}

        {selectedSymbol && error && (
          <div style={styles.error}>Failed to load chart data</div>
        )}

        {selectedSymbol && data && !isLoading && (
          <>
            <ChartContainer
              candles={data.candles}
              chartType={chartType}
              height={400}
            />
            <OHLCVStats candles={data.candles} isLoading={isLoading} />
          </>
        )}
      </div>
    </Widget>
  );
}
