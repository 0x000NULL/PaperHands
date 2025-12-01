import { type CSSProperties, type ReactNode, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { theme } from '../../theme/constants';
import {
  useLayoutStore,
  getVisibleWidgets,
  getPresets,
  WIDGET_CONFIGS,
  type WidgetId,
  type WidgetPosition,
} from '../../store/layoutStore';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    gap: theme.spacing.md,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.border}`,
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  presetSelect: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.bgInput,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.sm,
    cursor: 'pointer',
  },
  editButton: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: 'transparent',
    color: theme.colors.textSecondary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.sm,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  editButtonActive: {
    backgroundColor: theme.colors.primary,
    color: '#fff',
    borderColor: theme.colors.primary,
  },
  widgetToggleButton: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: 'transparent',
    color: theme.colors.textTertiary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  widgetToggleButtonActive: {
    backgroundColor: theme.colors.bgTertiary,
    color: theme.colors.textPrimary,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: theme.spacing.md,
    flex: 1,
    overflow: 'auto',
    padding: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
    marginRight: theme.spacing.xs,
  },
  syncIndicator: {
    fontSize: theme.typography.xs,
    color: theme.colors.textTertiary,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  spinner: {
    width: '12px',
    height: '12px',
    border: `2px solid ${theme.colors.border}`,
    borderTop: `2px solid ${theme.colors.primary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

interface WidgetGridProps {
  children: (widgets: WidgetPosition[]) => ReactNode;
}

export function WidgetGrid({ children }: WidgetGridProps) {
  const {
    widgets,
    activePreset,
    isEditMode,
    isSyncing,
    setEditMode,
    applyPreset,
    showWidget,
    hideWidget,
  } = useLayoutStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const visibleWidgets = getVisibleWidgets(widgets);
  const presets = getPresets();

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        // For now, just reorder in the visible list
        // More complex grid repositioning could be added later
        const { moveWidget } = useLayoutStore.getState();
        const overWidget = widgets.find((w) => w.id === over.id);
        if (overWidget) {
          moveWidget(active.id as WidgetId, overWidget.x, overWidget.y);
        }
      }
    },
    [widgets],
  );

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      applyPreset(value);
    }
  };

  const toggleWidgetVisibility = (id: WidgetId) => {
    const widget = widgets.find((w) => w.id === id);
    if (widget?.visible) {
      hideWidget(id);
    } else {
      showWidget(id);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.toolbar} data-tour-id="tour-layout-toolbar">
        <div style={styles.toolbarLeft}>
          <span style={styles.label}>Layout:</span>
          <select
            style={styles.presetSelect}
            value={activePreset || ''}
            onChange={handlePresetChange}
          >
            <option value="">Custom</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>

          {isEditMode && (
            <>
              <span style={{ ...styles.label, marginLeft: theme.spacing.md }}>Widgets:</span>
              {WIDGET_CONFIGS.map((config) => {
                const isVisible = widgets.find((w) => w.id === config.id)?.visible;
                return (
                  <button
                    key={config.id}
                    style={{
                      ...styles.widgetToggleButton,
                      ...(isVisible ? styles.widgetToggleButtonActive : {}),
                    }}
                    onClick={() => toggleWidgetVisibility(config.id)}
                    title={config.description}
                  >
                    {config.title}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div style={styles.toolbarRight}>
          {isSyncing && (
            <div style={styles.syncIndicator}>
              <div style={styles.spinner} />
              <span>Saving...</span>
            </div>
          )}
          <button
            style={{
              ...styles.editButton,
              ...(isEditMode ? styles.editButtonActive : {}),
            }}
            onClick={() => setEditMode(!isEditMode)}
          >
            {isEditMode ? 'Done Editing' : 'Edit Layout'}
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets.map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div style={styles.grid}>
            {children(visibleWidgets)}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// Helper component to position widgets in a CSS Grid
interface GridWidgetProps {
  widget: WidgetPosition;
  children: ReactNode;
}

export function GridWidget({ widget, children }: GridWidgetProps) {
  const style: CSSProperties = {
    gridColumn: `${widget.x + 1} / span ${widget.width}`,
    gridRow: `${widget.y + 1} / span ${widget.height}`,
    minHeight: `${widget.height * 100}px`,
  };

  return <div style={style}>{children}</div>;
}
