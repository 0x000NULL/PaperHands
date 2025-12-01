export const theme = {
  colors: {
    // Backgrounds - using CSS variables for theme switching
    bgPrimary: 'var(--color-bgPrimary)',
    bgSecondary: 'var(--color-bgSecondary)',
    bgTertiary: 'var(--color-bgTertiary)',
    bgHover: 'var(--color-bgHover)',
    bgInput: 'var(--color-bgInput)',

    // Accent colors
    accent: 'var(--color-accent)',
    accentDim: 'var(--color-accentDim)',
    accentGlow: 'var(--color-accentGlow)',

    // Semantic colors
    positive: 'var(--color-positive)',
    negative: 'var(--color-negative)',
    warning: 'var(--color-warning)',
    info: 'var(--color-info)',
    success: 'var(--color-success)',
    error: 'var(--color-error)',

    // Text colors
    textPrimary: 'var(--color-textPrimary)',
    textSecondary: 'var(--color-textSecondary)',
    textTertiary: 'var(--color-textTertiary)',

    // Borders
    border: 'var(--color-border)',
    borderFocus: 'var(--color-borderFocus)',

    // Chart colors (note: lightweight-charts needs actual hex values via useChartTheme hook)
    chartPositive: 'var(--color-chartPositive)',
    chartNegative: 'var(--color-chartNegative)',
    chartAccent: 'var(--color-chartAccent)',
    chartBackground: 'var(--color-chartBackground)',
    chartText: 'var(--color-chartText)',
    chartGrid: 'var(--color-chartGrid)',
    chartCrosshair: 'var(--color-chartCrosshair)',
    chartVolumePositive: 'var(--color-chartVolumePositive)',
    chartVolumeNegative: 'var(--color-chartVolumeNegative)',

    // Gauge/indicator colors (5-level scale)
    gaugeVeryLow: 'var(--color-gaugeVeryLow)',
    gaugeLow: 'var(--color-gaugeLow)',
    gaugeModerate: 'var(--color-gaugeModerate)',
    gaugeHigh: 'var(--color-gaugeHigh)',
    gaugeVeryHigh: 'var(--color-gaugeVeryHigh)',
    gaugeNeutral: 'var(--color-gaugeNeutral)',

    // Heatmap colors
    heatmapPositive: 'var(--color-heatmapPositive)',
    heatmapNegative: 'var(--color-heatmapNegative)',
    heatmapNeutral: 'var(--color-heatmapNeutral)',

    // Pie chart palette
    chartPalette1: 'var(--color-chartPalette1)',
    chartPalette2: 'var(--color-chartPalette2)',
    chartPalette3: 'var(--color-chartPalette3)',
    chartPalette4: 'var(--color-chartPalette4)',
    chartPalette5: 'var(--color-chartPalette5)',
    chartPalette6: 'var(--color-chartPalette6)',
    chartPalette7: 'var(--color-chartPalette7)',
    chartPalette8: 'var(--color-chartPalette8)',
  },

  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",

    // Font sizes
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '2rem',     // 32px
    '4xl': '2.5rem',   // 40px

    // Font weights
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },

  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
    glow: '0 0 20px rgba(0, 255, 136, 0.15)',
  },

  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease',
  },

  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },
} as const;

export type Theme = typeof theme;
