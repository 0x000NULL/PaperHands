import { type CSSProperties, type ReactElement, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import type { Layout, Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { theme } from '../../theme/constants';
import {
  useLayoutStore,
  getPresets,
  getVisibleLayouts,
  getVisibleWidgetIds,
  WIDGET_CONFIGS,
  GRID_CONFIG,
  type WidgetId,
} from '../../store/layoutStore';
import '../../styles/responsive.css';
import '../../styles/dashboard.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

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
    backgroundColor: theme.colors.accent,
    color: '#fff',
    borderColor: theme.colors.accent,
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
    borderTop: `2px solid ${theme.colors.accent}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

interface WidgetGridProps {
  children: (visibleWidgetIds: WidgetId[]) => ReactElement[];
}

export function WidgetGrid({ children }: WidgetGridProps) {
  const {
    layouts,
    hiddenWidgets,
    activePreset,
    isEditMode,
    isSyncing,
    currentBreakpoint,
    setEditMode,
    applyPreset,
    showWidget,
    hideWidget,
    updateLayoutsForBreakpoint,
    setCurrentBreakpoint,
  } = useLayoutStore();

  const presets = getPresets();
  const visibleWidgetIds = getVisibleWidgetIds(hiddenWidgets);
  const visibleLayouts = getVisibleLayouts(layouts, hiddenWidgets);

  const handleLayoutChange = useCallback(
    (currentLayout: Layout[], _allLayouts: Layouts) => {
      // Only update if in edit mode to prevent layout changes from re-renders
      if (isEditMode) {
        updateLayoutsForBreakpoint(currentBreakpoint, currentLayout);
      }
    },
    [isEditMode, currentBreakpoint, updateLayoutsForBreakpoint]
  );

  const handleBreakpointChange = useCallback(
    (newBreakpoint: string) => {
      setCurrentBreakpoint(newBreakpoint);
    },
    [setCurrentBreakpoint]
  );

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      applyPreset(value);
    }
  };

  const toggleWidgetVisibility = (id: WidgetId) => {
    if (hiddenWidgets.includes(id)) {
      showWidget(id);
    } else {
      hideWidget(id);
    }
  };

  return (
    <div style={styles.container} className={isEditMode ? 'edit-mode' : ''}>
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
                const isVisible = !hiddenWidgets.includes(config.id);
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

      <div style={styles.grid}>
        <ResponsiveGridLayout
          layouts={visibleLayouts}
          breakpoints={GRID_CONFIG.breakpoints}
          cols={GRID_CONFIG.cols}
          rowHeight={GRID_CONFIG.rowHeight}
          margin={GRID_CONFIG.margin}
          containerPadding={GRID_CONFIG.containerPadding}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          compactType="vertical"
          preventCollision={false}
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={handleBreakpointChange}
          draggableHandle=".widget-drag-handle"
          resizeHandles={['se']}
          useCSSTransforms={true}
        >
          {children(visibleWidgetIds)}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
