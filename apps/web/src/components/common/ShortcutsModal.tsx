import { useEffect, type CSSProperties } from 'react';
import { useShortcutsStore, formatShortcut } from '../../store/shortcutsStore';
import { theme } from '../../theme/constants';

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadows.xl,
    width: '100%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  title: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.textSecondary,
    cursor: 'pointer',
    padding: theme.spacing.xs,
    fontSize: theme.typography.lg,
    lineHeight: 1,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: theme.spacing.sm,
  },
  shortcutRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.xs} 0`,
  },
  shortcutDescription: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  shortcutKey: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  kbd: {
    display: 'inline-block',
    padding: '2px 6px',
    backgroundColor: theme.colors.bgTertiary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    fontFamily: theme.typography.fontMono,
    fontSize: theme.typography.xs,
    color: theme.colors.textPrimary,
    minWidth: '24px',
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing.sm,
    borderTop: `1px solid ${theme.colors.border}`,
    textAlign: 'center',
  },
  footerText: {
    color: theme.colors.textTertiary,
    fontSize: theme.typography.xs,
  },
};

export function ShortcutsModal() {
  const { shortcuts, shortcutsModalOpen, closeShortcutsModal } = useShortcutsStore();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && shortcutsModalOpen) {
        closeShortcutsModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [shortcutsModalOpen, closeShortcutsModal]);

  if (!shortcutsModalOpen) return null;

  // Group shortcuts by category
  const navigationShortcuts = shortcuts.filter((s) =>
    s.action.startsWith('NAV_')
  );
  const actionShortcuts = shortcuts.filter(
    (s) => !s.action.startsWith('NAV_')
  );

  const renderShortcut = (shortcut: typeof shortcuts[0]) => {
    const keys = formatShortcut(shortcut).split(' + ');
    return (
      <div key={shortcut.id} style={styles.shortcutRow}>
        <span style={styles.shortcutDescription}>{shortcut.description}</span>
        <span style={styles.shortcutKey}>
          {keys.map((key, i) => (
            <span key={i}>
              <kbd style={styles.kbd}>{key}</kbd>
              {i < keys.length - 1 && <span style={{ color: theme.colors.textTertiary }}> + </span>}
            </span>
          ))}
        </span>
      </div>
    );
  };

  return (
    <div style={styles.overlay} onClick={closeShortcutsModal}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Keyboard Shortcuts</h2>
          <button
            style={styles.closeButton}
            onClick={closeShortcutsModal}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Actions</div>
            {actionShortcuts.map(renderShortcut)}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Navigation</div>
            {navigationShortcuts.map(renderShortcut)}
          </div>
        </div>

        <div style={styles.footer}>
          <span style={styles.footerText}>
            Press <kbd style={styles.kbd}>Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
