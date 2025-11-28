import { useState, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import type { WatchlistSummary } from '../../types';

interface WatchlistTabsProps {
  watchlists: WatchlistSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.border}`,
    overflowX: 'auto',
    backgroundColor: theme.colors.bgTertiary,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.radius.md,
    border: 'none',
    backgroundColor: 'transparent',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: theme.transitions.fast,
  },
  tabActive: {
    backgroundColor: theme.colors.bgSecondary,
    color: theme.colors.textPrimary,
  },
  count: {
    backgroundColor: theme.colors.bgHover,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    padding: `2px ${theme.spacing.xs}`,
    borderRadius: theme.radius.sm,
  },
  countActive: {
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
  },
  menu: {
    position: 'relative' as const,
  },
  menuButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: theme.colors.textTertiary,
    padding: theme.spacing.xs,
    cursor: 'pointer',
    fontSize: theme.typography.sm,
    lineHeight: 1,
  },
  menuDropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    backgroundColor: theme.colors.bgSecondary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    padding: theme.spacing.xs,
    zIndex: 100,
    minWidth: '100px',
  },
  menuItem: {
    display: 'block',
    width: '100%',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: 'transparent',
    border: 'none',
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    textAlign: 'left' as const,
    cursor: 'pointer',
    borderRadius: theme.radius.sm,
  },
  menuItemDanger: {
    color: theme.colors.negative,
  },
};

export function WatchlistTabs({
  watchlists,
  activeId,
  onSelect,
  onEdit,
  onDelete,
}: WatchlistTabsProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <div style={styles.container}>
      {watchlists.map((watchlist) => {
        const isActive = watchlist.id === activeId;
        return (
          <div
            key={watchlist.id}
            style={{
              ...styles.tab,
              ...(isActive ? styles.tabActive : {}),
            }}
            onClick={() => onSelect(watchlist.id)}
          >
            <span>{watchlist.name}</span>
            <span
              style={{
                ...styles.count,
                ...(isActive ? styles.countActive : {}),
              }}
            >
              {watchlist.itemCount}
            </span>
            <div
              style={styles.menu}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                style={styles.menuButton}
                onClick={() =>
                  setOpenMenu(openMenu === watchlist.id ? null : watchlist.id)
                }
              >
                ...
              </button>
              {openMenu === watchlist.id && (
                <div style={styles.menuDropdown}>
                  <button
                    style={styles.menuItem}
                    onClick={() => {
                      onEdit(watchlist.id, watchlist.name);
                      setOpenMenu(null);
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        theme.colors.bgHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    Rename
                  </button>
                  <button
                    style={{ ...styles.menuItem, ...styles.menuItemDanger }}
                    onClick={() => {
                      onDelete(watchlist.id);
                      setOpenMenu(null);
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        theme.colors.bgHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
