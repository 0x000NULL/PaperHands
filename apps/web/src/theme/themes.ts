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
};

export function getTheme(mode: 'light' | 'dark'): ThemeColors {
  return mode === 'dark' ? darkTheme : lightTheme;
}
