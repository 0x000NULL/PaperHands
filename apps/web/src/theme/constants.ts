export const theme = {
  colors: {
    // Backgrounds
    bgPrimary: '#0a0a0f',      // Main page background (near black)
    bgSecondary: '#12121a',    // Widget/card background
    bgTertiary: '#1a1a2e',     // Header/elevated elements
    bgHover: '#252538',        // Hover states
    bgInput: '#0d0d14',        // Input field backgrounds

    // Accent colors
    accent: '#00ff88',         // Neon green (primary accent - gains, buy)
    accentDim: '#00cc6a',      // Dimmed accent for hover
    accentGlow: 'rgba(0, 255, 136, 0.1)', // Glow effect

    // Semantic colors
    positive: '#00ff88',       // Gains (neon green)
    negative: '#ff4757',       // Losses/Sell (red)
    warning: '#ffa502',        // Warnings (orange)
    info: '#3498db',           // Info (blue)

    // Text colors
    textPrimary: '#ffffff',    // Primary text (white)
    textSecondary: '#a0a0b0',  // Secondary text (muted)
    textTertiary: '#606070',   // Tertiary text (very muted)

    // Borders
    border: '#2a2a3e',         // Default border
    borderFocus: '#00ff88',    // Focus state border
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
