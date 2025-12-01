import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Layouts } from 'react-grid-layout';
import { api, type UserLayout, type WidgetPositionDto } from '../api/client';
import { useLayoutStore, type WidgetId, WIDGET_CONFIGS } from '../store/layoutStore';
import { useAuthStore } from '../store/authStore';


// Convert store's Layouts format to API's legacy format
const toApiFormat = (layouts: Layouts, hiddenWidgets: WidgetId[]): WidgetPositionDto[] => {
  // Use the 'lg' breakpoint as the canonical layout for storage
  const lgLayout = layouts.lg || [];
  return lgLayout.map((item) => ({
    id: item.i,
    x: item.x,
    y: item.y,
    width: item.w,
    height: item.h,
    visible: !hiddenWidgets.includes(item.i as WidgetId),
  }));
};

// Convert API's legacy format to store's Layouts format
const fromApiFormat = (widgets: WidgetPositionDto[]): { layouts: Layouts; hiddenWidgets: WidgetId[] } => {
  const hiddenWidgets: WidgetId[] = widgets
    .filter((w) => !w.visible)
    .map((w) => w.id as WidgetId);

  const lgLayout = widgets.map((w) => {
    const config = WIDGET_CONFIGS.find((c) => c.id === w.id);
    return {
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.width,
      h: w.height,
      minW: config?.minW || 1,
      minH: config?.minH || 1,
    };
  });

  // Generate scaled-down layouts for smaller breakpoints
  const mdLayout = lgLayout.map((item) => ({
    ...item,
    w: Math.min(item.w, 4),
  }));

  const smLayout = lgLayout.map((item) => ({
    ...item,
    x: 0,
    w: Math.min(item.w, 2),
  }));

  const xsLayout = lgLayout.map((item) => ({
    ...item,
    x: 0,
    w: 1,
  }));

  return {
    layouts: {
      lg: lgLayout,
      md: mdLayout,
      sm: smLayout,
      xs: xsLayout,
    },
    hiddenWidgets,
  };
};

export function useLayoutSync() {
  const queryClient = useQueryClient();
  const { setLayouts, setSyncing, hiddenWidgets } = useLayoutStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const lastSyncedRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingServerLayout = useRef(false);

  // Fetch saved layouts from server
  const { data: savedLayouts } = useQuery({
    queryKey: ['layouts'],
    queryFn: api.getLayouts,
    enabled: isAuthenticated(),
    staleTime: 60000, // 1 minute
  });

  // Fetch default layout
  const { data: defaultLayout, isLoading: isLoadingDefault } = useQuery({
    queryKey: ['layouts', 'default'],
    queryFn: api.getDefaultLayout,
    enabled: isAuthenticated(),
  });

  // Apply default layout from server on initial load
  useEffect(() => {
    if (defaultLayout && !isLoadingDefault && defaultLayout.widgets?.length > 0) {
      const serverWidgetsHash = JSON.stringify(defaultLayout.widgets);
      if (lastSyncedRef.current !== serverWidgetsHash) {
        const { layouts: newLayouts, hiddenWidgets: serverHiddenWidgets } = fromApiFormat(defaultLayout.widgets);
        // Only apply if we have valid layouts
        if (newLayouts.lg && newLayouts.lg.length > 0) {
          // Mark that we're applying server layout to prevent save loop
          isApplyingServerLayout.current = true;
          setLayouts(newLayouts);
          // Also update hidden widgets from server
          useLayoutStore.setState({ hiddenWidgets: serverHiddenWidgets });
          lastSyncedRef.current = serverWidgetsHash;
          // Reset flag after a short delay to allow state to settle
          setTimeout(() => {
            isApplyingServerLayout.current = false;
          }, 100);
        }
      }
    }
  }, [defaultLayout, isLoadingDefault, setLayouts]);

  // Save layout mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; layouts: Layouts; hiddenWidgets: WidgetId[] }) => {
      const apiWidgets = toApiFormat(data.layouts, data.hiddenWidgets);
      // Check if we have a default layout to update
      if (defaultLayout?.id) {
        return api.updateLayout(defaultLayout.id, {
          widgets: apiWidgets,
        });
      }
      // Create a new default layout
      return api.createLayout(data.name, apiWidgets, true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layouts'] });
      queryClient.invalidateQueries({ queryKey: ['layouts', 'default'] });
      setSyncing(false);
    },
    onError: (error) => {
      console.error('Failed to save layout:', error);
      setSyncing(false);
    },
  });

  // Debounced save function
  const saveLayout = useCallback(() => {
    if (!isAuthenticated()) return;

    // Clear any existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setSyncing(true);

    // Debounce save by 2 seconds to avoid too many requests
    debounceRef.current = setTimeout(() => {
      const state = useLayoutStore.getState();
      const currentHash = JSON.stringify(toApiFormat(state.layouts, state.hiddenWidgets));

      // Only save if actually changed
      if (lastSyncedRef.current !== currentHash) {
        lastSyncedRef.current = currentHash;
        saveMutation.mutate({
          name: 'Default',
          layouts: state.layouts,
          hiddenWidgets: state.hiddenWidgets,
        });
      } else {
        setSyncing(false);
      }
    }, 2000);
  }, [isAuthenticated, saveMutation, setSyncing]);

  // Watch for local layout changes and sync
  useEffect(() => {
    const unsubscribe = useLayoutStore.subscribe((state, prevState) => {
      // Skip if we're applying server layout (avoid save loop)
      if (isApplyingServerLayout.current) return;

      const layoutsChanged = state.layouts !== prevState.layouts;
      const hiddenChanged = state.hiddenWidgets !== prevState.hiddenWidgets;
      if ((layoutsChanged || hiddenChanged) && isAuthenticated()) {
        saveLayout();
      }
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [isAuthenticated, saveLayout]);

  // Create layout mutation
  const createLayoutMutation = useMutation({
    mutationFn: ({
      name,
      layouts,
      hiddenWidgets: hidden,
      isDefault,
    }: {
      name: string;
      layouts: Layouts;
      hiddenWidgets: WidgetId[];
      isDefault?: boolean;
    }) => api.createLayout(name, toApiFormat(layouts, hidden), isDefault),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layouts'] });
    },
  });

  // Delete layout mutation
  const deleteLayoutMutation = useMutation({
    mutationFn: api.deleteLayout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layouts'] });
    },
  });

  // Load a specific layout
  const loadLayout = useCallback(
    (layout: UserLayout) => {
      const { layouts: newLayouts } = fromApiFormat(layout.widgets);
      setLayouts(newLayouts);
      lastSyncedRef.current = JSON.stringify(layout.widgets);
    },
    [setLayouts],
  );

  return {
    layouts: savedLayouts ?? [],
    defaultLayout,
    isLoading: isLoadingDefault,
    isSaving: saveMutation.isPending,
    saveLayout,
    createLayout: (name: string, isDefault?: boolean) =>
      createLayoutMutation.mutate({
        name,
        layouts: useLayoutStore.getState().layouts,
        hiddenWidgets,
        isDefault,
      }),
    deleteLayout: deleteLayoutMutation.mutate,
    loadLayout,
  };
}
