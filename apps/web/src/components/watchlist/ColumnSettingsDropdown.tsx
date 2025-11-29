import { useState, useRef, useEffect, type CSSProperties } from 'react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { theme } from '../../theme/constants';
import { useWatchlistStore } from '../../store/watchlistStore';
import { ColumnSettingsItem } from './ColumnSettingsItem';

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'relative',
    display: 'inline-block',
  },
  button: {
    backgroundColor: 'transparent',
    border: 'none',
    color: theme.colors.textTertiary,
    cursor: 'pointer',
    padding: theme.spacing.xs,
    fontSize: theme.typography.base,
    borderRadius: theme.radius.sm,
    transition: theme.transitions.fast,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    zIndex: 1000,
    minWidth: '220px',
    maxHeight: '400px',
    overflowY: 'auto',
    backgroundColor: theme.colors.bgPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    boxShadow: theme.shadows.lg,
    padding: theme.spacing.sm,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  title: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
  },
  resetButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: theme.colors.accent,
    cursor: 'pointer',
    fontSize: theme.typography.xs,
    padding: theme.spacing.xs,
  },
  columnList: {
    display: 'flex',
    flexDirection: 'column',
  },
};

export function ColumnSettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { columns, toggleColumn, reorderColumns, resetColumns } =
    useWatchlistStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.key === active.id);
      const newIndex = columns.findIndex((col) => col.key === over.id);
      reorderColumns(oldIndex, newIndex);
    }
  };

  return (
    <div style={styles.container} ref={dropdownRef}>
      <button
        style={{
          ...styles.button,
          color: isOpen ? theme.colors.accent : theme.colors.textTertiary,
        }}
        onClick={() => setIsOpen(!isOpen)}
        title="Column settings"
      >
        &#x2699;
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <span style={styles.title}>Columns</span>
            <button style={styles.resetButton} onClick={resetColumns}>
              Reset
            </button>
          </div>

          <div style={styles.columnList as CSSProperties}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columns.map((c) => c.key)}
                strategy={verticalListSortingStrategy}
              >
                {columns.map((column) => (
                  <ColumnSettingsItem
                    key={column.key}
                    column={column}
                    onToggle={() => toggleColumn(column.key)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}
    </div>
  );
}
