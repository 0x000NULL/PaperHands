import { useRef, useEffect, useMemo } from 'react';
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
import { useChartTheme } from '../../hooks/useChartTheme';

export type ChartType = 'candlestick' | 'line';

interface ChartContainerProps {
  candles: Candle[];
  chartType: ChartType;
  height?: number;
}

function transformToCandlestickData(
  candles: Candle[]
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

export function ChartContainer({
  candles,
  chartType,
  height = 400,
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);

  // Get theme colors (re-renders when theme changes)
  const chartColors = useChartTheme();

  // Memoize chart theme config based on theme colors
  const chartThemeConfig = useMemo(
    () => ({
      layout: {
        background: { type: ColorType.Solid, color: chartColors.background },
        textColor: chartColors.text,
      },
      grid: {
        vertLines: { color: chartColors.grid },
        horzLines: { color: chartColors.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: chartColors.crosshair,
          width: 1 as const,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: chartColors.crosshair,
          width: 1 as const,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: chartColors.grid,
      },
      timeScale: {
        borderColor: chartColors.grid,
        timeVisible: true,
        secondsVisible: false,
      },
    }),
    [chartColors]
  );

  // Memoize series colors
  const candlestickColors = useMemo(
    () => ({
      upColor: chartColors.positive,
      downColor: chartColors.negative,
      borderUpColor: chartColors.positive,
      borderDownColor: chartColors.negative,
      wickUpColor: chartColors.positive,
      wickDownColor: chartColors.negative,
    }),
    [chartColors]
  );

  const lineColors = useMemo(
    () => ({
      color: chartColors.accent,
      lineWidth: 2 as const,
    }),
    [chartColors]
  );

  // Transform volume data with theme colors
  const transformToVolumeData = useMemo(
    () =>
      (data: Candle[]): HistogramData<UTCTimestamp>[] => {
        return data.map((candle, index) => ({
          time: candle.timestamp as UTCTimestamp,
          value: candle.volume,
          color:
            index > 0 && candle.close >= data[index - 1].close
              ? chartColors.volumePositive
              : chartColors.volumeNegative,
        }));
      },
    [chartColors]
  );

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
  }, [height, chartThemeConfig]);

  // Update chart theme when colors change
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions(chartThemeConfig);
  }, [chartThemeConfig]);

  // Update series when chart type or data changes
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;

    const chart = chartRef.current;

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
      const series = chart.addSeries(CandlestickSeries, candlestickColors);
      series.setData(candleData);
      seriesRef.current = series;
    } else {
      const lineData = transformToLineData(candles);
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
  }, [chartType, candles, candlestickColors, lineColors, transformToVolumeData]);

  return (
    <div
      ref={containerRef}
      className="chart-container"
      style={{
        width: '100%',
        height,
        backgroundColor: chartColors.background,
      }}
    />
  );
}
