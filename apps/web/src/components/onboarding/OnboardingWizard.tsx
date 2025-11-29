import { useCallback, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../api/client';
import { WizardProgress } from './WizardProgress';
import { WelcomeStep } from './steps/WelcomeStep';
import { CashSetupStep } from './steps/CashSetupStep';
import { WatchlistStep } from './steps/WatchlistStep';
import { PreferencesStep } from './steps/PreferencesStep';
import { TourIntroStep } from './steps/TourIntroStep';

const TOTAL_STEPS = 5;

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: theme.spacing.md,
  },
  modal: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
    maxWidth: '540px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: theme.shadows.lg,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  content: {
    padding: theme.spacing.md,
  },
};

export function OnboardingWizard() {
  const {
    isWizardOpen,
    currentStep,
    closeWizard,
    nextStep,
    prevStep,
    startTour,
    setStepData,
  } = useOnboardingStore();
  const { updateUser } = useAuthStore();

  const handleWelcomeNext = useCallback(
    async (data: { userIntent: string }) => {
      try {
        await api.completeOnboardingStep(1, { userIntent: data.userIntent as 'stocks' | 'options' | 'testing' | 'exploring' });
        setStepData(1, data);
        nextStep();
      } catch (error) {
        console.error('Failed to save welcome step:', error);
        // Continue anyway
        nextStep();
      }
    },
    [nextStep, setStepData],
  );

  const handleCashNext = useCallback(
    async (data: { startingCash: number }) => {
      try {
        await api.completeOnboardingStep(2, { cashSetup: data });
        updateUser({ cashBalance: data.startingCash });
        setStepData(2, data);
        nextStep();
      } catch (error) {
        console.error('Failed to save cash setup:', error);
        nextStep();
      }
    },
    [nextStep, setStepData, updateUser],
  );

  const handleWatchlistNext = useCallback(
    async (data: { watchlistName: string; symbols: string[] }) => {
      try {
        if (data.symbols.length > 0) {
          await api.completeOnboardingStep(3, { watchlistSetup: data });
        }
        setStepData(3, data);
        nextStep();
      } catch (error) {
        console.error('Failed to create watchlist:', error);
        nextStep();
      }
    },
    [nextStep, setStepData],
  );

  const handlePreferencesNext = useCallback(
    async (data: {
      defaultOrderType: string;
      defaultTimeInForce: string;
      defaultCostBasisMethod: string;
    }) => {
      try {
        await api.completeOnboardingStep(4, { preferences: data as any });
        setStepData(4, data);
        nextStep();
      } catch (error) {
        console.error('Failed to save preferences:', error);
        nextStep();
      }
    },
    [nextStep, setStepData],
  );

  const handleTakeTour = useCallback(async () => {
    // Update local state first to prevent wizard from re-opening
    updateUser({ onboardingCompleted: true });
    closeWizard();
    startTour();

    // Then persist to backend (non-blocking)
    try {
      await api.completeOnboarding();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  }, [closeWizard, startTour, updateUser]);

  const handleSkipStep = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const handleFinish = useCallback(async () => {
    // Update local state first to prevent wizard from re-opening
    updateUser({ onboardingCompleted: true });
    closeWizard();

    // Then persist to backend (non-blocking)
    try {
      await api.completeOnboarding();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  }, [closeWizard, updateUser]);

  if (!isWizardOpen) {
    return null;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep onNext={handleWelcomeNext} />;
      case 2:
        return (
          <CashSetupStep
            onNext={handleCashNext}
            onBack={prevStep}
            onSkip={handleSkipStep}
          />
        );
      case 3:
        return (
          <WatchlistStep
            onNext={handleWatchlistNext}
            onBack={prevStep}
            onSkip={handleSkipStep}
          />
        );
      case 4:
        return (
          <PreferencesStep
            onNext={handlePreferencesNext}
            onBack={prevStep}
            onSkip={handleSkipStep}
          />
        );
      case 5:
        return (
          <TourIntroStep
            onTakeTour={handleTakeTour}
            onSkip={handleFinish}
            onBack={prevStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {currentStep > 1 && (
          <div style={styles.header}>
            <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
          </div>
        )}
        <div style={styles.content}>{renderStep()}</div>
      </div>
    </div>
  );
}
