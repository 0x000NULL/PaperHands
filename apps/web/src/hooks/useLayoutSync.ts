import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type UserLayout, type WidgetPositionDto } from '../api/client';
import { useLayoutStore, type WidgetPosition } from '../store/layoutStore';
import { useAuthStore } from '../store/authStore';

// Convert between store format and API format
const toApiFormat = (widgets: WidgetPosition[]): WidgetPositionDto[] =>
  widgets.map((w) => ({
    id: w.id,
    x: w.x,
    y: w.y,
    width: w.width,
    height: w.height,
    visible: w.visible,
  }));

const fromApiFormat = (widgets: WidgetPositionDto[]): WidgetPosition[] =>
  widgets.map((w) => ({
    id: w.id as WidgetPosition['id'],
    x: w.x,
    y: w.y,
    width: w.width,
    height: w.height,
    visible: w.visible,
  }));

export function useLayoutSync() {
  const queryClient = useQueryClient();
  const { setWidgets, setSyncing } = useLayoutStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const lastSyncedRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch saved layouts from server
  const { data: layouts } = useQuery({
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
    if (defaultLayout && !isLoadingDefault) {
      const serverWidgetsHash = JSON.stringify(defaultLayout.widgets);
      if (lastSyncedRef.current !== serverWidgetsHash) {
        setWidgets(fromApiFormat(defaultLayout.widgets));
        lastSyncedRef.current = serverWidgetsHash;
      }
    }
  }, [defaultLayout, isLoadingDefault, setWidgets]);

  // Save layout mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; widgets: WidgetPosition[] }) => {
      // Check if we have a default layout to update
      if (defaultLayout?.id) {
        return api.updateLayout(defaultLayout.id, {
          widgets: toApiFormat(data.widgets),
        });
      }
      // Create a new default layout
      return api.createLayout(data.name, toApiFormat(data.widgets), true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layouts'] });
      queryClient.invalidateQueries({ queryKey: ['layouts', 'default'] });
    },
    onSettled: () => {
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
      const currentWidgets = useLayoutStore.getState().widgets;
      const currentHash = JSON.stringify(toApiFormat(currentWidgets));

      // Only save if actually changed
      if (lastSyncedRef.current !== currentHash) {
        lastSyncedRef.current = currentHash;
        saveMutation.mutate({ name: 'Default', widgets: currentWidgets });
      } else {
        setSyncing(false);
      }
    }, 2000);
  }, [isAuthenticated, saveMutation, setSyncing]);

  // Watch for local widget changes and sync
  useEffect(() => {
    const unsubscribe = useLayoutStore.subscribe((state, prevState) => {
      if (state.widgets !== prevState.widgets && isAuthenticated()) {
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
      widgets,
      isDefault,
    }: {
      name: string;
      widgets: WidgetPosition[];
      isDefault?: boolean;
    }) => api.createLayout(name, toApiFormat(widgets), isDefault),
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
      setWidgets(fromApiFormat(layout.widgets));
      lastSyncedRef.current = JSON.stringify(layout.widgets);
    },
    [setWidgets],
  );

  return {
    layouts: layouts ?? [],
    defaultLayout,
    isLoading: isLoadingDefault,
    isSaving: saveMutation.isPending,
    saveLayout,
    createLayout: createLayoutMutation.mutate,
    deleteLayout: deleteLayoutMutation.mutate,
    loadLayout,
  };
}
