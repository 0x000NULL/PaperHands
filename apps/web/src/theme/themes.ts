// Theme color definitions for dark and light modes
// These colors are applied via CSS custom properties by ThemeProvider

export interface ThemeColors {
  // Backgrounds
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgHover: string;
  bgInput: string;

  // Accent colors
  accent: string;
  accentDim: string;
  accentGlow: string;

  // Semantic colors
  positive: string;
  negative: string;
  warning: string;
  info: string;
  success: string;
  error: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  // Borders
  border: string;
  borderFocus: string;

  // Chart colors (for lightweight-charts which needs hex values)
  chartPositive: string;
  chartNegative: string;
  chartAccent: string;
  chartBackground: string;
  chartText: string;
  chartGrid: string;
  chartCrosshair: string;
  chartVolumePositive: string;
  chartVolumeNegative: string;

  // Gauge/indicator colors (5-level scale)
  gaugeVeryLow: string;
  gaugeLow: string;
  gaugeModerate: string;
  gaugeHigh: string;
  gaugeVeryHigh: string;
  gaugeNeutral: string;

  // Heatmap colors
  heatmapPositive: string;
  heatmapNegative: string;
  heatmapNeutral: string;

  // Pie chart palette (for allocation charts)
  chartPalette1: string;
  chartPalette2: string;
  chartPalette3: string;
  chartPalette4: string;
  chartPalette5: string;
  chartPalette6: string;
  chartPalette7: string;
  chartPalette8: string;
}

export const darkTheme: ThemeColors = {
  // Backgrounds
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgTertiary: '#1a1a2e',
  bgHover: '#252538',
  bgInput: '#0d0d14',

  // Accent colors
  accent: '#00ff88',
  accentDim: '#00cc6a',
  accentGlow: 'rgba(0, 255, 136, 0.1)',

  // Semantic colors
  positive: '#00ff88',
  negative: '#ff4757',
  warning: '#ffa502',
  info: '#3498db',
  success: '#00ff88',
  error: '#ff4757',

  // Text colors
  textPrimary: '#ffffff',
  textSecondary: '#a0a0b0',
  textTertiary: '#606070',

  // Borders
  border: '#2a2a3e',
  borderFocus: '#00ff88',

  // Chart colors (for lightweight-charts which needs hex values)
  chartPositive: '#00FF88',
  chartNegative: '#FF4757',
  chartAccent: '#00D4FF',
  chartBackground: '#1a1a2e',
  chartText: '#888888',
  chartGrid: '#2d2d44',
  chartCrosshair: '#666666',
  chartVolumePositive: 'rgba(0, 255, 136, 0.3)',
  chartVolumeNegative: 'rgba(255, 71, 87, 0.3)',

  // Gauge/indicator colors (5-level scale)
  gaugeVeryLow: '#3B82F6',
  gaugeLow: '#10B981',
  gaugeModerate: '#F59E0B',
  gaugeHigh: '#F97316',
  gaugeVeryHigh: '#EF4444',
  gaugeNeutral: '#6B7280',

  // Heatmap colors
  heatmapPositive: '#22c55e',
  heatmapNegative: '#ef4444',
  heatmapNeutral: '#6b7280',

  // Pie chart palette (for allocation charts)
  chartPalette1: '#00FF88',
  chartPalette2: '#00D4FF',
  chartPalette3: '#FF6B6B',
  chartPalette4: '#FFE66D',
  chartPalette5: '#A855F7',
  chartPalette6: '#F97316',
  chartPalette7: '#EC4899',
  chartPalette8: '#14B8A6',
};

export const lightTheme: ThemeColors = {
  // Backgrounds
  bgPrimary: '#f5f5f7',
  bgSecondary: '#ffffff',
  bgTertiary: '#e8e8ec',
  bgHover: '#d8d8de',
  bgInput: '#ffffff',

  // Accent colors (slightly darker for light mode visibility)
  accent: '#00b865',
  accentDim: '#009952',
  accentGlow: 'rgba(0, 184, 101, 0.15)',

  // Semantic colors (adjusted for light mode)
  positive: '#00b865',
  negative: '#e03e4e',
  warning: '#e09000',
  info: '#2980b9',
  success: '#00b865',
  error: '#e03e4e',

  // Text colors
  textPrimary: '#1a1a1a',
  textSecondary: '#606070',
  textTertiary: '#909098',

  // Borders
  border: '#d0d0d8',
  borderFocus: '#00b865',

  // Chart colors (adjusted for light backgrounds)
  chartPositive: '#00b865',
  chartNegative: '#e03e4e',
  chartAccent: '#0099cc',
  chartBackground: '#ffffff',
  chartText: '#606070',
  chartGrid: '#e0e0e8',
  chartCrosshair: '#909098',
  chartVolumePositive: 'rgba(0, 184, 101, 0.3)',
  chartVolumeNegative: 'rgba(224, 62, 78, 0.3)',

  // Gauge/indicator colors (adjusted for light mode contrast)
  gaugeVeryLow: '#2563EB',
  gaugeLow: '#059669',
  gaugeModerate: '#D97706',
  gaugeHigh: '#EA580C',
  gaugeVeryHigh: '#DC2626',
  gaugeNeutral: '#6B7280',

  // Heatmap colors
  heatmapPositive: '#16a34a',
  heatmapNegative: '#dc2626',
  heatmapNeutral: '#6b7280',

  // Pie chart palette (adjusted for light mode visibility)
  chartPalette1: '#00b865',
  chartPalette2: '#0099cc',
  chartPalette3: '#e03e4e',
  chartPalette4: '#d4a000',
  chartPalette5: '#9333EA',
  chartPalette6: '#EA580C',
  chartPalette7: '#DB2777',
  chartPalette8: '#0D9488',
};

export function getTheme(mode: 'light' | 'dark'): ThemeColors {
  return mode === 'dark' ? darkTheme : lightTheme;
}
