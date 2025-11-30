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
import type { Candle } from '../../types';

export type ChartType = 'candlestick' | 'line';

interface ChartContainerProps {
  candles: Candle[];
  chartType: ChartType;
  height?: number;
}

// Chart colors - must use actual hex values, not CSS variables
// (lightweight-charts can't interpret CSS variables)
const CHART_COLORS = {
  positive: '#00FF88',      // green for up
  negative: '#FF4757',      // red for down
  accent: '#00D4FF',        // blue accent
  bgSecondary: '#1a1a2e',   // dark background
  textSecondary: '#888888', // muted text
  border: '#2d2d44',        // border color
  textTertiary: '#666666',  // crosshair
};

const chartThemeConfig = {
  layout: {
    background: { type: ColorType.Solid, color: CHART_COLORS.bgSecondary },
    textColor: CHART_COLORS.textSecondary,
  },
  grid: {
    vertLines: { color: CHART_COLORS.border },
    horzLines: { color: CHART_COLORS.border },
  },
  crosshair: {
    mode: CrosshairMode.Normal,
    vertLine: {
      color: CHART_COLORS.textTertiary,
      width: 1 as const,
      style: LineStyle.Dashed,
    },
    horzLine: {
      color: CHART_COLORS.textTertiary,
      width: 1 as const,
      style: LineStyle.Dashed,
    },
  },
  rightPriceScale: {
    borderColor: CHART_COLORS.border,
  },
  timeScale: {
    borderColor: CHART_COLORS.border,
    timeVisible: true,
    secondsVisible: false,
  },
};

const candlestickColors = {
  upColor: CHART_COLORS.positive,
  downColor: CHART_COLORS.negative,
  borderUpColor: CHART_COLORS.positive,
  borderDownColor: CHART_COLORS.negative,
  wickUpColor: CHART_COLORS.positive,
  wickDownColor: CHART_COLORS.negative,
};

const lineColors = {
  color: CHART_COLORS.accent,
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
    console.log('[ChartContainer] Effect triggered', {
      hasChart: !!chartRef.current,
      candlesLength: candles.length,
      chartType,
    });

    if (!chartRef.current || candles.length === 0) return;

    const chart = chartRef.current;

    // Debug: log sample candle data with full details
    console.log('[ChartContainer] Sample candle (first):', JSON.stringify(candles[0]));
    console.log('[ChartContainer] Sample candle (last):', JSON.stringify(candles[candles.length - 1]));

    // Remove existing price series
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    // Remove existing volume series
    if (volumeSeriesRef.current) {
      chart.removeSeries(volumeSeriesRef.current);
      volumeSeriesRef.current = null;
    }

    // Create price series FIRST (default right scale)
    if (chartType === 'candlestick') {
      const candleData = transformToCandlestickData(candles);
      console.log('[ChartContainer] Transformed candlestick (first):', JSON.stringify(candleData[0]));
      const series = chart.addSeries(CandlestickSeries, candlestickColors);
      series.setData(candleData);
      seriesRef.current = series;
    } else {
      const lineData = transformToLineData(candles);
      console.log('[ChartContainer] Transformed line (first):', JSON.stringify(lineData[0]));
      const series = chart.addSeries(LineSeries, lineColors);
      series.setData(lineData);
      seriesRef.current = series;
    }

    // Create volume series on separate scale at bottom
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(transformToVolumeData(candles));
    volumeSeriesRef.current = volumeSeries;

    // Fit content
    chart.timeScale().fitContent();
  }, [chartType, candles]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height,
        backgroundColor: CHART_COLORS.bgSecondary,
      }}
    />
  );
}
