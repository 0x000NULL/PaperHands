import { type CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { theme } from '../../theme/constants';
import type { ColumnConfig } from '../../store/watchlistStore';

interface ColumnSettingsItemProps {
  column: ColumnConfig;
  onToggle: () => void;
}

const styles: Record<string, CSSProperties> = {
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.bgSecondary,
    marginBottom: theme.spacing.xs,
    transition: theme.transitions.fast,
  },
  dragHandle: {
    cursor: 'grab',
    color: theme.colors.textTertiary,
    padding: theme.spacing.xs,
    display: 'flex',
    alignItems: 'center',
    fontSize: theme.typography.sm,
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: theme.colors.accent,
  },
  label: {
    flex: 1,
    fontSize: theme.typography.sm,
    color: theme.colors.textPrimary,
    cursor: 'pointer',
  },
};

export function ColumnSettingsItem({
  column,
  onToggle,
}: ColumnSettingsItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key });

  const style: CSSProperties = {
    ...styles.item,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    backgroundColor: isDragging ? theme.colors.bgHover : theme.colors.bgSecondary,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <span style={styles.dragHandle} {...attributes} {...listeners}>
        &#x2630;
      </span>
      <input
        type="checkbox"
        checked={column.visible}
        onChange={onToggle}
        style={styles.checkbox}
        id={`col-${column.key}`}
      />
      <label htmlFor={`col-${column.key}`} style={styles.label}>
        {column.label}
      </label>
    </div>
  );
}
