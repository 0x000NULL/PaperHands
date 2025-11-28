import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { theme } from '../theme/constants';

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgPrimary,
  },
  card: {
    backgroundColor: theme.colors.bgSecondary,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    width: '100%',
    maxWidth: '400px',
    border: `1px solid ${theme.colors.border}`,
  },
  logo: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    color: theme.colors.accent,
    fontSize: theme.typography['2xl'],
    fontWeight: theme.typography.bold,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.semibold,
  },
  error: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    color: theme.colors.negative,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  fieldGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    display: 'block',
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  input: {
    width: '100%',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.bgInput,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.base,
    boxSizing: 'border-box',
    outline: 'none',
  },
  submitButton: {
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    border: 'none',
    borderRadius: theme.radius.md,
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  footer: {
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  link: {
    color: theme.colors.accent,
    textDecoration: 'none',
  },
};

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login(email, password);
      setAuth(response.token, response.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>PaperHands</h1>
        <h2 style={styles.title}>Login</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <div style={{ ...styles.fieldGroup, marginBottom: theme.spacing.xl }}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
