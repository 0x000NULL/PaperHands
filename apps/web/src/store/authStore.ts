import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
}

// Memory-only store - no persistence for security
// Tokens are not stored in localStorage to prevent XSS attacks
export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  setAuth: (accessToken, refreshToken, user) =>
    set({ accessToken, refreshToken, user }),
  setTokens: (accessToken, refreshToken) =>
    set({ accessToken, refreshToken }),
  updateUser: (userData) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    })),
  logout: () => set({ accessToken: null, refreshToken: null, user: null }),
  isAuthenticated: () => !!get().accessToken,
  getAccessToken: () => get().accessToken,
  getRefreshToken: () => get().refreshToken,
}));

// Legacy compatibility - expose token as alias for accessToken
Object.defineProperty(useAuthStore.getState(), 'token', {
  get() {
    return useAuthStore.getState().accessToken;
  },
});
