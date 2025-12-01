import { useEffect, useCallback, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDrag } from '@use-gesture/react';
import { useAuthStore } from '../../store/authStore';
import '../../styles/navigation.css';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [dragOffset, setDragOffset] = useState(0);

  // Swipe-to-close gesture (swipe right to close)
  const bind = useDrag(
    ({ movement: [mx], direction: [dx], velocity: [vx], active }) => {
      // Only allow swiping right (positive direction)
      const offset = Math.max(0, mx);

      if (active) {
        setDragOffset(offset);
      } else {
        setDragOffset(0);
        // Close if swiped more than 100px or with high velocity
        if (dx > 0 && (mx > 100 || vx > 0.5)) {
          onClose();
        }
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      threshold: 10,
    }
  );

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('nav-open');
    } else {
      document.body.classList.remove('nav-open');
    }
    return () => document.body.classList.remove('nav-open');
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close on route change
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  const handleLogout = useCallback(() => {
    logout();
    onClose();
  }, [logout, onClose]);

  if (!isAuthenticated()) return null;

  const navLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/watchlists', label: 'Watchlists' },
    { to: '/portfolio', label: 'Portfolio' },
    { to: '/orders', label: 'Orders' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/greeks', label: 'Greeks' },
    { to: '/alerts', label: 'Alerts' },
    { to: '/research', label: 'Research' },
    { to: '/settings', label: 'Settings' },
  ];

  // Add admin link if user has admin role
  if (user?.role === 'admin' || user?.role === 'super_admin') {
    navLinks.push({ to: '/admin', label: 'Admin' });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`nav-backdrop ${isOpen ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <nav
        {...bind()}
        className={`nav-drawer ${isOpen ? 'is-open' : ''}`}
        aria-label="Mobile navigation"
        style={{
          transform: dragOffset > 0 ? `translateX(${dragOffset}px)` : undefined,
          transition: dragOffset > 0 ? 'none' : undefined,
        }}
      >
        {/* Header with close button */}
        <div className="nav-drawer-header">
          <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '1.125rem' }}>
            Menu
          </span>
          <button
            className="nav-close-button"
            onClick={onClose}
            aria-label="Close menu"
          >
            &times;
          </button>
        </div>

        {/* User info */}
        <div className="nav-drawer-user">
          <div style={{ fontSize: '0.875rem', color: 'var(--color-textSecondary)' }}>
            {user?.email}
          </div>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1 }}>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${isActive(link.to) ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Footer with logout */}
        <div className="nav-drawer-footer">
          <button
            onClick={handleLogout}
            className="btn-touch"
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              color: 'var(--color-textSecondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Logout
          </button>
        </div>
      </nav>
    </>
  );
}
