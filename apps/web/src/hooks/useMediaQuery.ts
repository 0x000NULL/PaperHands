import { useCallback, useSyncExternalStore } from 'react';
import { theme } from '../theme/constants';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Hook to check if a media query matches
 * Uses useSyncExternalStore for proper React 18+ integration
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', callback);
      return () => mediaQuery.removeEventListener('change', callback);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback(() => {
    // Default to false on server (assume mobile-first)
    return false;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hook to check if viewport is at or above a breakpoint
 * @param breakpoint - Breakpoint name from theme
 * @returns boolean indicating if viewport >= breakpoint
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(`(min-width: ${theme.breakpoints[breakpoint]}px)`);
}

/**
 * Hook to check if viewport is mobile (<640px)
 */
export function useIsMobile(): boolean {
  return !useBreakpoint('sm');
}

/**
 * Hook to check if viewport is tablet (>=640px and <1024px)
 */
export function useIsTablet(): boolean {
  const isSmUp = useBreakpoint('sm');
  const isLgUp = useBreakpoint('lg');
  return isSmUp && !isLgUp;
}

/**
 * Hook to check if viewport is desktop (>=1024px)
 */
export function useIsDesktop(): boolean {
  return useBreakpoint('lg');
}
