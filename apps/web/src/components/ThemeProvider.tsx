import { useEffect, type ReactNode } from 'react';
import { useThemeStore } from '../store/themeStore';
import { getTheme, type ThemeColors } from '../theme/themes';

interface ThemeProviderProps {
  children: ReactNode;
}

function applyThemeToDocument(colors: ThemeColors) {
  const root = document.documentElement;

  // Apply all color values as CSS custom properties
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { mode } = useThemeStore();

  useEffect(() => {
    const colors = getTheme(mode);
    applyThemeToDocument(colors);

    // Also update body background for immediate visual feedback
    document.body.style.backgroundColor = colors.bgPrimary;
    document.body.style.color = colors.textPrimary;
  }, [mode]);

  return <>{children}</>;
}
