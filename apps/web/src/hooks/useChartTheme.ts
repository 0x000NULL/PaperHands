import { useMemo } from 'react';
import { useThemeStore } from '../store/themeStore';
import { getTheme } from '../theme/themes';

/**
 * Hook that provides resolved hex color values for chart libraries.
 * Libraries like lightweight-charts cannot use CSS variables,
 * so this hook returns actual color values that update with theme changes.
 */
export function useChartTheme() {
  const { mode } = useThemeStore();

  const chartColors = useMemo(() => {
    const colors = getTheme(mode);

    return {
      // Main chart colors
      positive: colors.chartPositive,
      negative: colors.chartNegative,
      accent: colors.chartAccent,
      background: colors.chartBackground,
      text: colors.chartText,
      grid: colors.chartGrid,
      crosshair: colors.chartCrosshair,
      volumePositive: colors.chartVolumePositive,
      volumeNegative: colors.chartVolumeNegative,

      // Gauge/indicator scale colors
      gaugeVeryLow: colors.gaugeVeryLow,
      gaugeLow: colors.gaugeLow,
      gaugeModerate: colors.gaugeModerate,
      gaugeHigh: colors.gaugeHigh,
      gaugeVeryHigh: colors.gaugeVeryHigh,
      gaugeNeutral: colors.gaugeNeutral,

      // Heatmap colors
      heatmapPositive: colors.heatmapPositive,
      heatmapNegative: colors.heatmapNegative,
      heatmapNeutral: colors.heatmapNeutral,

      // Pie chart palette as array for easy iteration
      palette: [
        colors.chartPalette1,
        colors.chartPalette2,
        colors.chartPalette3,
        colors.chartPalette4,
        colors.chartPalette5,
        colors.chartPalette6,
        colors.chartPalette7,
        colors.chartPalette8,
      ],
    };
  }, [mode]);

  return chartColors;
}

/**
 * Helper function to get IV rank color from the gauge scale
 */
export function getGaugeColor(
  value: number | null,
  colors: ReturnType<typeof useChartTheme>
): string {
  if (value === null) return colors.gaugeNeutral;
  if (value <= 20) return colors.gaugeVeryLow;
  if (value <= 40) return colors.gaugeLow;
  if (value <= 60) return colors.gaugeModerate;
  if (value <= 80) return colors.gaugeHigh;
  return colors.gaugeVeryHigh;
}
