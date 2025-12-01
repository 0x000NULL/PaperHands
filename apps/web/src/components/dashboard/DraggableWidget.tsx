import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type CSSProperties, type ReactNode } from 'react';
import { theme } from '../../theme/constants';
import { useLayoutStore, getWidgetConfig, type WidgetId } from '../../store/layoutStore';

interface DraggableWidgetProps {
  id: WidgetId;
  children: ReactNode;
  className?: string;
}

const styles: Record<string, CSSProperties> = {
  widget: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderBottom: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.bgTertiary,
    minHeight: '36px',
  },
  title: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
    margin: 0,
  },
  dragHandle: {
    cursor: 'grab',
    padding: theme.spacing.xs,
    color: theme.colors.textTertiary,
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  dragHandleActive: {
    cursor: 'grabbing',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing.sm,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  hideButton: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    color: theme.colors.textTertiary,
    fontSize: theme.typography.sm,
    lineHeight: 1,
    borderRadius: theme.radius.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    pointerEvents: 'none',
    borderRadius: theme.radius.lg,
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '20px',
    height: '20px',
    cursor: 'se-resize',
    color: theme.colors.textTertiary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
  },
};

// Drag handle icon (6 dots)
function DragHandleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <circle cx="3" cy="2" r="1.5" />
      <circle cx="9" cy="2" r="1.5" />
      <circle cx="3" cy="6" r="1.5" />
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="3" cy="10" r="1.5" />
      <circle cx="9" cy="10" r="1.5" />
    </svg>
  );
}

export function DraggableWidget({ id, children, className }: DraggableWidgetProps) {
  const { isEditMode, hideWidget } = useLayoutStore();
  const config = getWidgetConfig(id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: !isEditMode,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={className}
    >
      <div style={styles.widget}>
        <div style={styles.header}>
          {isEditMode && (
            <div
              style={{
                ...styles.dragHandle,
                ...(isDragging ? styles.dragHandleActive : {}),
              }}
              {...attributes}
              {...listeners}
            >
              <DragHandleIcon />
            </div>
          )}
          <h3 style={styles.title}>{config?.title || id}</h3>
          <div style={styles.controls}>
            {isEditMode && (
              <button
                style={styles.hideButton}
                onClick={() => hideWidget(id)}
                title="Hide widget"
              >
                &times;
              </button>
            )}
          </div>
        </div>
        <div style={styles.content}>
          {children}
        </div>
        {isEditMode && <div style={styles.editOverlay} />}
      </div>
    </div>
  );
}

// Simplified widget wrapper without drag (for non-grid layouts)
interface WidgetWrapperProps {
  id: WidgetId;
  children: ReactNode;
  showHeader?: boolean;
}

export function WidgetWrapper({ id, children, showHeader = true }: WidgetWrapperProps) {
  const { isEditMode, hideWidget } = useLayoutStore();
  const config = getWidgetConfig(id);

  return (
    <div style={styles.widget}>
      {showHeader && (
        <div style={styles.header}>
          <h3 style={styles.title}>{config?.title || id}</h3>
          {isEditMode && (
            <button
              style={styles.hideButton}
              onClick={() => hideWidget(id)}
              title="Hide widget"
            >
              &times;
            </button>
          )}
        </div>
      )}
      <div style={styles.content}>
        {children}
      </div>
    </div>
  );
}
