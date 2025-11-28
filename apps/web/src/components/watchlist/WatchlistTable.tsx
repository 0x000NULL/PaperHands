import { useMemo, type CSSProperties } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { theme } from '../../theme/constants';
import { WatchlistRow } from './WatchlistRow';
import { useWatchlistQuotes, useReorderItems } from '../../hooks/useWatchlists';
import { useWatchlistStore } from '../../store/watchlistStore';
import type { WatchlistItem, Quote } from '../../types';

interface WatchlistTableProps {
  items: WatchlistItem[];
  watchlistId: string;
  onRemoveSymbol: (symbol: string) => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    flex: 1,
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headerRow: {
    backgroundColor: theme.colors.bgTertiary,
  },
  headerCell: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    textAlign: 'left' as const,
    color: theme.colors.textTertiary,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  headerCellRight: {
    textAlign: 'right' as const,
  },
  emptyState: {
    padding: theme.spacing.xl,
    textAlign: 'center' as const,
    color: theme.colors.textSecondary,
  },
};

export function WatchlistTable({
  items,
  watchlistId,
  onRemoveSymbol,
}: WatchlistTableProps) {
  const { columns } = useWatchlistStore();
  const reorderItems = useReorderItems();

  // Get symbols for quote fetching
  const symbols = useMemo(() => items.map((item) => item.symbol), [items]);
  const { data: quotes } = useWatchlistQuotes(symbols);

  // Create a map of symbol to quote for easy lookup
  const quoteMap = useMemo(() => {
    const map = new Map<string, Quote>();
    quotes?.forEach((quote) => map.set(quote.symbol, quote));
    return map;
  }, [quotes]);

  // Get visible columns
  const visibleColumns = useMemo(
    () => columns.filter((col) => col.visible),
    [columns],
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newOrder = arrayMove(items, oldIndex, newIndex);
      const itemIds = newOrder.map((item) => item.id);

      reorderItems.mutate({ watchlistId, itemIds });
    }
  };

  if (items.length === 0) {
    return (
      <div style={styles.container}>
        <p style={styles.emptyState}>
          No symbols in this watchlist. Add some below!
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={{ ...styles.headerCell, width: '30px' }}></th>
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                style={{
                  ...styles.headerCell,
                  ...(col.key !== 'symbol' && col.key !== 'description'
                    ? styles.headerCellRight
                    : {}),
                }}
              >
                {col.label}
              </th>
            ))}
            <th style={{ ...styles.headerCell, width: '40px' }}></th>
          </tr>
        </thead>
        <tbody>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <WatchlistRow
                  key={item.id}
                  item={item}
                  quote={quoteMap.get(item.symbol)}
                  visibleColumns={visibleColumns}
                  onRemove={() => onRemoveSymbol(item.symbol)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </tbody>
      </table>
    </div>
  );
}
