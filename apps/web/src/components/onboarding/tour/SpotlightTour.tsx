import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { useOnboardingStore, TOUR_STOPS, type TourStopId } from '../../../store/onboardingStore';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../../api/client';
import { TourSpotlight } from './TourSpotlight';
import { TourTooltip } from './TourTooltip';

// Map tour stop IDs to data-tour-id attributes on Dashboard elements
const TOUR_ELEMENT_IDS: Record<TourStopId, string> = {
  'portfolio-summary': 'tour-portfolio-summary',
  'quote-panel': 'tour-quote-panel',
  'trade-form': 'tour-trade-form',
  'positions-table': 'tour-positions-table',
  'options-chain': 'tour-options-chain',
  'navigation': 'tour-navigation',
};

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'auto',
  },
};

export function SpotlightTour() {
  const { isTourActive, tourStep, nextTourStep, prevTourStep, endTour } =
    useOnboardingStore();
  const { updateUser } = useAuthStore();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const currentStop = TOUR_STOPS[tourStep];

  // Find and position the spotlight on the target element
  useEffect(() => {
    if (!isTourActive || !currentStop) return;

    const elementId = TOUR_ELEMENT_IDS[currentStop.id];
    const element = document.querySelector(`[data-tour-id="${elementId}"]`);

    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);

      // Calculate tooltip position (below the element by default)
      const tooltipWidth = 320;
      const tooltipHeight = 180;
      const padding = 16;

      let top = rect.bottom + padding;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;

      // Keep tooltip in viewport
      if (left < padding) left = padding;
      if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding;
      }

      // If tooltip would go below viewport, position it above
      if (top + tooltipHeight > window.innerHeight - padding) {
        top = rect.top - tooltipHeight - padding;
      }

      // If still out of bounds, position to the side
      if (top < padding) {
        top = rect.top;
        left = rect.right + padding;
        if (left + tooltipWidth > window.innerWidth - padding) {
          left = rect.left - tooltipWidth - padding;
        }
      }

      setTooltipPosition({ top, left });

      // Scroll element into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setTargetRect(null);
      setTooltipPosition({ top: window.innerHeight / 2 - 90, left: window.innerWidth / 2 - 160 });
    }
  }, [isTourActive, tourStep, currentStop]);

  const handleNext = useCallback(async () => {
    if (tourStep >= TOUR_STOPS.length - 1) {
      // Last step - mark tour as complete
      try {
        await api.completeOnboardingStep(5, {});
        updateUser({ onboardingCompleted: true });
      } catch (error) {
        console.error('Failed to complete tour:', error);
      }
      endTour();
    } else {
      nextTourStep();
    }
  }, [tourStep, nextTourStep, endTour, updateUser]);

  const handleSkip = useCallback(async () => {
    try {
      await api.completeOnboarding();
      updateUser({ onboardingCompleted: true });
    } catch (error) {
      console.error('Failed to skip tour:', error);
    }
    endTour();
  }, [endTour, updateUser]);

  if (!isTourActive || !currentStop) {
    return null;
  }

  return (
    <div style={styles.container} onClick={(e) => e.stopPropagation()}>
      <TourSpotlight targetRect={targetRect} />
      <TourTooltip
        title={currentStop.title}
        description={currentStop.description}
        currentStep={tourStep}
        totalSteps={TOUR_STOPS.length}
        position={tooltipPosition}
        onNext={handleNext}
        onPrev={prevTourStep}
        onSkip={handleSkip}
        isFirst={tourStep === 0}
        isLast={tourStep === TOUR_STOPS.length - 1}
      />
    </div>
  );
}
