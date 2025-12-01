import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShortcutsStore, type Shortcut } from '../store/shortcutsStore';
import { useThemeStore } from '../store/themeStore';

interface ShortcutCallbacks {
  onFocusSearch?: () => void;
  onOpenTrade?: () => void;
}

export function useKeyboardShortcuts(callbacks: ShortcutCallbacks = {}) {
  const navigate = useNavigate();
  const { shortcuts, openShortcutsModal } = useShortcutsStore();
  const { toggleMode } = useThemeStore();

  // Use refs for callbacks to avoid re-registering event listeners
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'FOCUS_SEARCH':
          callbacksRef.current.onFocusSearch?.();
          break;
        case 'OPEN_TRADE':
          callbacksRef.current.onOpenTrade?.();
          break;
        case 'NAV_DASHBOARD':
          navigate('/');
          break;
        case 'NAV_PORTFOLIO':
          navigate('/portfolio');
          break;
        case 'NAV_ORDERS':
          navigate('/orders');
          break;
        case 'NAV_ANALYTICS':
          navigate('/analytics');
          break;
        case 'NAV_GREEKS':
          navigate('/greeks');
          break;
        case 'NAV_WATCHLISTS':
          navigate('/watchlists');
          break;
        case 'NAV_RESEARCH':
          navigate('/research');
          break;
        case 'NAV_SETTINGS':
          navigate('/settings');
          break;
        case 'SHOW_SHORTCUTS':
          openShortcutsModal();
          break;
        case 'TOGGLE_THEME':
          toggleMode();
          break;
      }
    },
    [navigate, openShortcutsModal, toggleMode]
  );

  const matchesShortcut = useCallback(
    (event: KeyboardEvent, shortcut: Shortcut): boolean => {
      // Check if the key matches (case-insensitive)
      if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
        return false;
      }

      // Check modifiers
      const isMac = navigator.platform.includes('Mac');

      const ctrlRequired = shortcut.modifiers.includes('ctrl');
      const altRequired = shortcut.modifiers.includes('alt');
      const shiftRequired = shortcut.modifiers.includes('shift');
      const metaRequired = shortcut.modifiers.includes('meta');

      // On Mac, use Cmd (metaKey) instead of Ctrl
      const ctrlMatch = isMac
        ? event.metaKey === ctrlRequired
        : event.ctrlKey === ctrlRequired;

      const altMatch = event.altKey === altRequired;
      const shiftMatch = event.shiftKey === shiftRequired;
      const metaMatch = !isMac
        ? event.metaKey === metaRequired
        : true; // Ignore meta on Mac as we use it for ctrl

      return ctrlMatch && altMatch && shiftMatch && metaMatch;
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to always work
        if (event.key !== 'Escape') {
          return;
        }
      }

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        if (!shortcut.enabled) continue;

        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          handleAction(shortcut.action);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, matchesShortcut, handleAction]);
}

// Hook for registering custom actions (e.g., from components)
export function useRegisterShortcutAction(
  action: string,
  callback: () => void
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const handleAction = (event: CustomEvent<{ action: string }>) => {
      if (event.detail.action === action) {
        callbackRef.current();
      }
    };

    window.addEventListener(
      'shortcut-action' as keyof WindowEventMap,
      handleAction as EventListener
    );
    return () => {
      window.removeEventListener(
        'shortcut-action' as keyof WindowEventMap,
        handleAction as EventListener
      );
    };
  }, [action]);
}
