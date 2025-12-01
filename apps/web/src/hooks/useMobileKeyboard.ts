import { useState, useEffect, useCallback, useRef } from 'react';

interface UseMobileKeyboardReturn {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
  viewportHeight: number;
  scrollToInput: (element: HTMLElement | null) => void;
}

export function useMobileKeyboard(): UseMobileKeyboardReturn {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );
  const initialHeight = useRef(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Store initial viewport height
    initialHeight.current = window.innerHeight;

    // Use VisualViewport API if available (more accurate on mobile)
    if (window.visualViewport) {
      const handleResize = () => {
        const visualViewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const windowHeight = initialHeight.current;
        const kbHeight = Math.max(0, windowHeight - visualViewportHeight);

        setKeyboardHeight(kbHeight);
        setIsKeyboardVisible(kbHeight > 100); // 100px threshold for keyboard detection
        setViewportHeight(visualViewportHeight);
      };

      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);

      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
        window.visualViewport?.removeEventListener('scroll', handleResize);
      };
    }

    // Fallback for browsers without VisualViewport
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = initialHeight.current - currentHeight;

      setKeyboardHeight(Math.max(0, heightDiff));
      setIsKeyboardVisible(heightDiff > 100);
      setViewportHeight(currentHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToInput = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    // Small delay to let the keyboard fully appear
    setTimeout(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100);
  }, []);

  return { isKeyboardVisible, keyboardHeight, viewportHeight, scrollToInput };
}
