import { useState, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useSettings, useChangePassword } from '../../hooks/useSettings';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xl,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
  },
  description: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    color: theme.colors.textPrimary,
  },
  input: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    outline: 'none',
    transition: theme.transitions.fast,
  },
  inputDisabled: {
    backgroundColor: theme.colors.bgTertiary,
    color: theme.colors.textSecondary,
    cursor: 'not-allowed',
  },
  infoText: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    fontFamily: theme.typography.fontMono,
  },
  actions: {
    display: 'flex',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  button: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
    border: 'none',
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  loading: {
    padding: theme.spacing.xl,
    textAlign: 'center' as const,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    margin: `${theme.spacing.md} 0`,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.typography.sm,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: theme.radius.sm,
  },
  success: {
    color: theme.colors.success,
    fontSize: theme.typography.sm,
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderRadius: theme.radius.sm,
  },
};

export function AccountSettings() {
  const { data: settings, isLoading } = useSettings();
  const changePasswordMutation = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleChangePassword = () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setPasswordSuccess('Password changed successfully');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (error: Error) => {
          setPasswordError(error.message || 'Failed to change password');
        },
      },
    );
  };

  const canChangePassword = currentPassword && newPassword && confirmPassword && !changePasswordMutation.isPending;

  if (isLoading) {
    return <div style={styles.loading}>Loading account info...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Email Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Account Information</h3>
        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            style={{ ...styles.input, ...styles.inputDisabled }}
            value={settings?.account.email ?? ''}
            disabled
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Member Since</label>
          <span style={styles.infoText}>
            {settings?.account.createdAt
              ? new Date(settings.account.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : '--'}
          </span>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Password Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Change Password</h3>
        <p style={styles.description}>
          Enter your current password and a new password to update your credentials.
        </p>

        {passwordError && <div style={styles.error}>{passwordError}</div>}
        {passwordSuccess && <div style={styles.success}>{passwordSuccess}</div>}

        <div style={styles.field}>
          <label style={styles.label}>Current Password</label>
          <input
            type="password"
            style={styles.input}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>New Password</label>
          <input
            type="password"
            style={styles.input}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Confirm New Password</label>
          <input
            type="password"
            style={styles.input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
        </div>

        <div style={styles.actions}>
          <button
            style={{
              ...styles.button,
              ...styles.primaryButton,
              ...(!canChangePassword ? styles.buttonDisabled : {}),
            }}
            onClick={handleChangePassword}
            disabled={!canChangePassword}
          >
            {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
