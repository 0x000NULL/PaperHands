import { Component, type ReactNode } from 'react';
import { theme } from '../theme/constants';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.bgPrimary,
          }}
        >
          <div
            style={{
              padding: theme.spacing.xl,
              textAlign: 'center',
              backgroundColor: theme.colors.bgSecondary,
              borderRadius: theme.radius.lg,
              border: `1px solid ${theme.colors.border}`,
              maxWidth: '400px',
            }}
          >
            <h2
              style={{
                color: theme.colors.negative,
                marginBottom: theme.spacing.md,
                fontSize: theme.typography.xl,
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing.lg,
                fontSize: theme.typography.sm,
              }}
            >
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                backgroundColor: theme.colors.accent,
                color: theme.colors.bgPrimary,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                fontWeight: theme.typography.semibold,
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
