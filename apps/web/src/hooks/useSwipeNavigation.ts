import { useDrag } from '@use-gesture/react';
import { useState } from 'react';

interface UseSwipeNavigationOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  velocityThreshold?: number;
  enabled?: boolean;
}

export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  velocityThreshold = 0.5,
  enabled = true,
}: UseSwipeNavigationOptions) {
  const [swiping, setSwiping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);

  const bind = useDrag(
    ({ active, movement: [mx], direction: [dx], velocity: [vx] }) => {
      if (!enabled) return;

      setSwiping(active);
      setProgress(Math.min(Math.abs(mx) / threshold, 1));

      if (active) {
        setDirection(dx > 0 ? 'right' : dx < 0 ? 'left' : null);
      }

      if (!active) {
        setProgress(0);
        setDirection(null);
        const swipeDistance = Math.abs(mx);
        const isSwipe = swipeDistance > threshold || vx > velocityThreshold;

        if (isSwipe) {
          if (dx > 0 && onSwipeRight) onSwipeRight();
          if (dx < 0 && onSwipeLeft) onSwipeLeft();
        }
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      threshold: 10,
    }
  );

  return { bind, swiping, progress, direction };
}
