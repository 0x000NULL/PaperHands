import { useState, useEffect, type CSSProperties, type FormEvent } from 'react';
import { theme } from '../../theme/constants';

interface CreateWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  initialName?: string;
  isEditing?: boolean;
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: '400px',
    boxShadow: theme.shadows.lg,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    marginBottom: theme.spacing.lg,
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: theme.spacing.lg,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  input: {
    padding: `${theme.spacing.md}`,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.base,
  },
  buttons: {
    display: 'flex',
    gap: theme.spacing.md,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: 'transparent',
    color: theme.colors.textSecondary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  submitButton: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    border: 'none',
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  error: {
    color: theme.colors.negative,
    fontSize: theme.typography.sm,
  },
};

export function CreateWatchlistModal({
  isOpen,
  onClose,
  onSubmit,
  initialName = '',
  isEditing = false,
}: CreateWatchlistModalProps) {
  const [name, setName] = useState(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(initialName);
    setError('');
  }, [initialName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }

    if (trimmed.length > 100) {
      setError('Name must be 100 characters or less');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save watchlist');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal}>
        <h2 style={styles.title}>
          {isEditing ? 'Rename Watchlist' : 'Create Watchlist'}
        </h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g., Tech Stocks"
              style={styles.input}
              maxLength={100}
              autoFocus
            />
          </div>
          {error && <span style={styles.error}>{error}</span>}
          <div style={styles.buttons}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...styles.submitButton,
                ...(isSubmitting || !name.trim()
                  ? styles.submitButtonDisabled
                  : {}),
              }}
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting
                ? 'Saving...'
                : isEditing
                  ? 'Save'
                  : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
