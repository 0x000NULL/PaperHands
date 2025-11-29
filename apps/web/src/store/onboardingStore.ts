import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tour stop IDs that correspond to elements on the Dashboard
export type TourStopId =
  | 'portfolio-summary'
  | 'quote-panel'
  | 'trade-form'
  | 'positions-table'
  | 'options-chain'
  | 'navigation';

export const TOUR_STOPS: { id: TourStopId; title: string; description: string }[] = [
  {
    id: 'portfolio-summary',
    title: 'Your Portfolio at a Glance',
    description:
      'Track your total value, daily P&L, cash balance, and open positions in real-time.',
  },
  {
    id: 'positions-table',
    title: 'Track Your Holdings',
    description:
      'See all your stock and option positions with real-time P&L. Click any row to view details or quickly sell.',
  },
  {
    id: 'quote-panel',
    title: 'Search Any Stock',
    description:
      'Type a symbol to see live quotes, bid/ask, and key statistics. The LIVE badge shows real-time streaming data.',
  },
  {
    id: 'trade-form',
    title: 'Place Your First Trade',
    description:
      "Select BUY or SELL, choose your order type, enter quantity, and execute. It's paper money, so experiment freely!",
  },
  {
    id: 'options-chain',
    title: 'Trade Options',
    description:
      'Explore calls and puts across different expirations. View Greeks, open interest, and click to trade directly.',
  },
  {
    id: 'navigation',
    title: 'Explore More',
    description:
      'Watchlists: Track your favorite symbols. Analytics: Tax lots, realized gains, dividends. Greeks: Portfolio risk analysis.',
  },
];

interface OnboardingState {
  // Wizard state
  isWizardOpen: boolean;
  currentStep: number;
  stepData: Record<number, unknown>;

  // Tour state
  isTourActive: boolean;
  tourStep: number;

  // Wizard actions
  openWizard: () => void;
  closeWizard: () => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setStepData: (step: number, data: unknown) => void;

  // Tour actions
  startTour: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  endTour: () => void;
  goToTourStep: (step: number) => void;

  // Reset
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      // Initial state
      isWizardOpen: false,
      currentStep: 1,
      stepData: {},
      isTourActive: false,
      tourStep: 0,

      // Wizard actions
      openWizard: () => set({ isWizardOpen: true }),
      closeWizard: () => set({ isWizardOpen: false }),
      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(1, state.currentStep - 1),
        })),
      setStepData: (step, data) =>
        set((state) => ({
          stepData: { ...state.stepData, [step]: data },
        })),

      // Tour actions
      startTour: () => set({ isTourActive: true, tourStep: 0, isWizardOpen: false }),
      nextTourStep: () => {
        const { tourStep } = get();
        if (tourStep >= TOUR_STOPS.length - 1) {
          set({ isTourActive: false, tourStep: 0 });
        } else {
          set({ tourStep: tourStep + 1 });
        }
      },
      prevTourStep: () =>
        set((state) => ({
          tourStep: Math.max(0, state.tourStep - 1),
        })),
      endTour: () => set({ isTourActive: false, tourStep: 0 }),
      goToTourStep: (step) =>
        set({ tourStep: Math.min(step, TOUR_STOPS.length - 1) }),

      // Reset for replaying
      reset: () =>
        set({
          isWizardOpen: true,
          currentStep: 1,
          stepData: {},
          isTourActive: false,
          tourStep: 0,
        }),
    }),
    {
      name: 'paperhands-onboarding',
      partialize: (state) => ({
        // Only persist tour completion state, not wizard open state
        stepData: state.stepData,
      }),
    },
  ),
);
