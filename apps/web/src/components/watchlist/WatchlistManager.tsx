import { useState, useEffect, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { Widget } from '../dashboard/Widget';
import { WatchlistTabs } from './WatchlistTabs';
import { WatchlistTable } from './WatchlistTable';
import { AddSymbolInput } from './AddSymbolInput';
import { CreateWatchlistModal } from './CreateWatchlistModal';
import {
  useWatchlists,
  useWatchlist,
  useCreateWatchlist,
  useDeleteWatchlist,
  useAddSymbol,
  useRemoveSymbol,
} from '../../hooks/useWatchlists';
import { useWatchlistStore } from '../../store/watchlistStore';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '500px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.base,
  },
  emptyButton: {
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    border: 'none',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['2xl'],
    color: theme.colors.textSecondary,
  },
  addRow: {
    padding: theme.spacing.md,
    borderTop: `1px solid ${theme.colors.border}`,
  },
};

export function WatchlistManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWatchlist, setEditingWatchlist] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { activeWatchlistId, setActiveWatchlistId } = useWatchlistStore();
  const { data: watchlists, isLoading: isLoadingLists } = useWatchlists();
  const { data: activeWatchlist, isLoading: isLoadingDetail } = useWatchlist(
    activeWatchlistId,
  );
  const createWatchlist = useCreateWatchlist();
  const deleteWatchlist = useDeleteWatchlist();
  const addSymbol = useAddSymbol();
  const removeSymbol = useRemoveSymbol();

  // Auto-select first watchlist if none selected
  useEffect(() => {
    if (!activeWatchlistId && watchlists && watchlists.length > 0) {
      setActiveWatchlistId(watchlists[0].id);
    }
  }, [watchlists, activeWatchlistId, setActiveWatchlistId]);

  const handleCreateWatchlist = async (name: string) => {
    const result = await createWatchlist.mutateAsync(name);
    setActiveWatchlistId(result.id);
    setIsModalOpen(false);
  };

  const handleDeleteWatchlist = async (id: string) => {
    if (confirm('Are you sure you want to delete this watchlist?')) {
      await deleteWatchlist.mutateAsync(id);
      if (activeWatchlistId === id) {
        const remaining = watchlists?.filter((w) => w.id !== id);
        setActiveWatchlistId(remaining?.[0]?.id ?? null);
      }
    }
  };

  const handleAddSymbol = async (symbol: string) => {
    if (!activeWatchlistId) return;
    await addSymbol.mutateAsync({ watchlistId: activeWatchlistId, symbol });
  };

  const handleRemoveSymbol = async (symbol: string) => {
    if (!activeWatchlistId) return;
    await removeSymbol.mutateAsync({ watchlistId: activeWatchlistId, symbol });
  };

  const handleEditWatchlist = (id: string, name: string) => {
    setEditingWatchlist({ id, name });
    setIsModalOpen(true);
  };

  const headerAction = (
    <button
      onClick={() => {
        setEditingWatchlist(null);
        setIsModalOpen(true);
      }}
      style={{
        backgroundColor: theme.colors.accent,
        color: theme.colors.bgPrimary,
        border: 'none',
        padding: `${theme.spacing.xs} ${theme.spacing.md}`,
        borderRadius: theme.radius.md,
        fontSize: theme.typography.xs,
        fontWeight: theme.typography.semibold,
        cursor: 'pointer',
      }}
    >
      + New List
    </button>
  );

  return (
    <>
      <Widget title="Watchlists" headerAction={headerAction} noPadding>
        <div style={styles.container}>
          {isLoadingLists ? (
            <div style={styles.loadingState}>Loading watchlists...</div>
          ) : !watchlists || watchlists.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No watchlists yet</p>
              <button
                onClick={() => setIsModalOpen(true)}
                style={styles.emptyButton}
              >
                Create Your First Watchlist
              </button>
            </div>
          ) : (
            <>
              <WatchlistTabs
                watchlists={watchlists}
                activeId={activeWatchlistId}
                onSelect={setActiveWatchlistId}
                onEdit={handleEditWatchlist}
                onDelete={handleDeleteWatchlist}
              />
              {isLoadingDetail ? (
                <div style={styles.loadingState}>Loading...</div>
              ) : activeWatchlist ? (
                <>
                  <WatchlistTable
                    items={activeWatchlist.items}
                    watchlistId={activeWatchlistId!}
                    onRemoveSymbol={handleRemoveSymbol}
                  />
                  <div style={styles.addRow}>
                    <AddSymbolInput
                      onAdd={handleAddSymbol}
                      isLoading={addSymbol.isPending}
                    />
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </Widget>

      <CreateWatchlistModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingWatchlist(null);
        }}
        onSubmit={handleCreateWatchlist}
        initialName={editingWatchlist?.name}
        isEditing={!!editingWatchlist}
      />
    </>
  );
}
