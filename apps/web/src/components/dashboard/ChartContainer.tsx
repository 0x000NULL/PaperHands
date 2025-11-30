import { useRef, useEffect } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type HistogramData,
  type UTCTimestamp,
  type SeriesType,
} from 'lightweight-charts';
import { theme } from '../../theme/constants';
import type { Candle } from '../../types';

export type ChartType = 'candlestick' | 'line';

interface ChartContainerProps {
  candles: Candle[];
  chartType: ChartType;
  height?: number;
}

const chartThemeConfig = {
  layout: {
    background: { type: ColorType.Solid, color: theme.colors.bgSecondary },
    textColor: theme.colors.textSecondary,
  },
  grid: {
    vertLines: { color: theme.colors.border },
    horzLines: { color: theme.colors.border },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: {
      color: theme.colors.textTertiary,
      width: 1 as const,
      style: LineStyle.Dashed,
    },
    horzLine: {
      color: theme.colors.textTertiary,
      width: 1 as const,
      style: LineStyle.Dashed,
    },
  },
  rightPriceScale: {
    borderColor: theme.colors.border,
  },
  timeScale: {
    borderColor: theme.colors.border,
    timeVisible: true,
    secondsVisible: false,
  },
};

const candlestickColors = {
  upColor: theme.colors.positive,
  downColor: theme.colors.negative,
  borderUpColor: theme.colors.positive,
  borderDownColor: theme.colors.negative,
  wickUpColor: theme.colors.positive,
  wickDownColor: theme.colors.negative,
};

const lineColors = {
  color: theme.colors.accent,
  lineWidth: 2 as const,
};

function transformToCandlestickData(
  candles: Candle[],
): CandlestickData<UTCTimestamp>[] {
  return candles.map((candle) => ({
    time: candle.timestamp as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  }));
}

function transformToLineData(candles: Candle[]): LineData<UTCTimestamp>[] {
  return candles.map((candle) => ({
    time: candle.timestamp as UTCTimestamp,
    value: candle.close,
  }));
}

function transformToVolumeData(candles: Candle[]): HistogramData<UTCTimestamp>[] {
  return candles.map((candle, index) => ({
    time: candle.timestamp as UTCTimestamp,
    value: candle.volume,
    color:
      index > 0 && candle.close >= candles[index - 1].close
        ? 'rgba(0, 255, 136, 0.3)'
        : 'rgba(255, 71, 87, 0.3)',
  }));
}

export function ChartContainer({
  candles,
  chartType,
  height = 400,
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      ...chartThemeConfig,
    });

    chartRef.current = chart;

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height]);

  // Update series when chart type or data changes
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;

    const chart = chartRef.current;

    // Remove existing price series
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    // Remove existing volume series to recreate with proper order
    if (volumeSeriesRef.current) {
      chart.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }

    // Create volume series FIRST on separate scale (so it renders behind price)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(transformToVolumeData(candles));
    volumeSeriesRef.current = volumeSeries;

    // Create new price series based on type (renders on top of volume)
    if (chartType === 'candlestick') {
      const series = chart.addSeries(CandlestickSeries, {
        ...candlestickColors,
        priceScaleId: 'right',
      });
      series.priceScale().applyOptions({
        scaleMargins: { top: 0.1, bottom: 0.3 },
      });
      series.setData(transformToCandlestickData(candles));
      seriesRef.current = series;
    } else {
      const series = chart.addSeries(LineSeries, {
        ...lineColors,
        priceScaleId: 'right',
      });
      series.priceScale().applyOptions({
        scaleMargins: { top: 0.1, bottom: 0.3 },
      });
      series.setData(transformToLineData(candles));
      seriesRef.current = series;
    }

    // Fit content
    chart.timeScale().fitContent();
  }, [chartType, candles]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height,
        backgroundColor: theme.colors.bgSecondary,
      }}
    />
  );
}
