import { Link, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { useAuthStore } from '../store/authStore';
import { theme } from '../theme/constants';
import { MarketStatusBadge } from './common/MarketStatusBadge';
import { ConnectionStatusBadge } from './common/ConnectionStatus';
import { NotificationBell } from './notifications/NotificationBell';
import { ToastContainer } from './notifications/ToastContainer';
import { useNotifications } from '../hooks/useNotifications';

interface LayoutProps {
  children: React.ReactNode;
}

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: theme.colors.bgPrimary,
  },
  nav: {
    backgroundColor: theme.colors.bgSecondary,
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  logo: {
    color: theme.colors.accent,
    textDecoration: 'none',
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    letterSpacing: '-0.02em',
  },
  navLinks: {
    display: 'flex',
    gap: theme.spacing.lg,
    alignItems: 'center',
  },
  navLink: {
    color: theme.colors.textPrimary,
    textDecoration: 'none',
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.radius.md,
    transition: theme.transitions.fast,
  },
  userEmail: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    color: theme.colors.textSecondary,
    border: `1px solid ${theme.colors.border}`,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.radius.md,
    cursor: 'pointer',
    fontSize: theme.typography.sm,
    transition: theme.transitions.fast,
  },
  settingsLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.textSecondary,
    textDecoration: 'none',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    transition: theme.transitions.fast,
    fontSize: theme.typography.lg,
  },
  main: {
    padding: theme.spacing.xl,
    maxWidth: '1600px',
    margin: '0 auto',
  },
};

export function Layout({ children }: LayoutProps) {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // Initialize notifications WebSocket connection
  useNotifications();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <ToastContainer />
      <nav style={styles.nav}>
        <Link to="/" style={styles.logo}>
          PaperHands
        </Link>

        {isAuthenticated() && (
          <div style={styles.navLinks} data-tour-id="tour-navigation">
            <ConnectionStatusBadge />
            <MarketStatusBadge />
            <Link to="/" style={styles.navLink}>
              Dashboard
            </Link>
            <Link to="/watchlists" style={styles.navLink}>
              Watchlists
            </Link>
            <Link to="/analytics" style={styles.navLink}>
              Analytics
            </Link>
            <Link to="/greeks" style={styles.navLink}>
              Greeks
            </Link>
            {(user?.role === 'admin' || user?.role === 'super_admin') && (
              <Link to="/admin" style={styles.navLink}>
                Admin
              </Link>
            )}
            <Link to="/alerts" style={styles.navLink}>
              Alerts
            </Link>
            <Link to="/research" style={styles.navLink}>
              Research
            </Link>
            <span style={styles.userEmail}>{user?.email}</span>
            <NotificationBell />
            <Link to="/settings" style={styles.settingsLink} title="Settings">
              &#9881;
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        )}
      </nav>

      <main style={styles.main}>{children}</main>
    </div>
  );
}
