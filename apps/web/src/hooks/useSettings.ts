import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type SettingsResponse, type UpdateTradingPreferencesRequest, type UpdateThemeRequest, type ChangePasswordRequest } from '../api/client';
import { useThemeStore } from '../store/themeStore';

// Query keys
export const settingsKeys = {
  all: ['settings'] as const,
  details: () => [...settingsKeys.all, 'details'] as const,
};

// Fetch settings
export function useSettings() {
  const { setMode } = useThemeStore();

  return useQuery({
    queryKey: settingsKeys.details(),
    queryFn: async () => {
      const settings = await api.getSettings();
      // Sync theme from backend to local store
      if (settings.display?.theme) {
        setMode(settings.display.theme);
      }
      return settings;
    },
    staleTime: 300000, // 5 minutes
  });
}

// Update trading preferences
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateTradingPreferencesRequest) =>
      api.updateTradingPreferences(data),
    onSuccess: (data: SettingsResponse) => {
      queryClient.setQueryData(settingsKeys.details(), data);
    },
  });
}

// Update theme
export function useUpdateTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateThemeRequest) => api.updateTheme(data),
    onSuccess: (data: SettingsResponse) => {
      queryClient.setQueryData(settingsKeys.details(), data);
    },
  });
}

// Change password
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => api.changePassword(data),
  });
}
