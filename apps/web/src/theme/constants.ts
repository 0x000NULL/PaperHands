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
