import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { useOnboardingStore } from './store/onboardingStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './components/ThemeProvider';
import { OnboardingWizard } from './components/onboarding';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Watchlists } from './pages/Watchlists';
import { Analytics } from './pages/Analytics';
import { Greeks } from './pages/Greeks';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 5000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const { openWizard, isWizardOpen, isTourActive } = useOnboardingStore();

  useEffect(() => {
    // Open onboarding wizard for new users who haven't completed it
    // Don't re-open if tour is active (user clicked "Take the Tour")
    if (user && !user.onboardingCompleted && !isWizardOpen && !isTourActive) {
      openWizard();
    }
  }, [user, openWizard, isWizardOpen, isTourActive]);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {children}
      <OnboardingWizard />
    </>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/watchlists"
              element={
                <ProtectedRoute>
                  <Watchlists />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/greeks"
              element={
                <ProtectedRoute>
                  <Greeks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            {/* Redirect old routes to dashboard */}
            <Route path="/trade" element={<Navigate to="/" replace />} />
            <Route path="/history" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
