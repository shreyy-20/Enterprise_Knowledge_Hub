import { create } from 'zustand';
import type { User, LoginCredentials, RegisterData } from '../types';
import { authApi } from '../api/auth';
import toast from 'react-hot-toast';

interface AuthStore {
  user: User | null;
  token: string | null;
  refreshTokenStr: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  refreshTokenStr: localStorage.getItem('refresh_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  login: async (credentials: LoginCredentials) => {
    try {
      set({ isLoading: true });
      const tokenResponse = await authApi.login(credentials);
      localStorage.setItem('access_token', tokenResponse.access_token);
      localStorage.setItem('refresh_token', tokenResponse.refresh_token);
      const user = await authApi.getProfile();
      set({
        user,
        token: tokenResponse.access_token,
        refreshTokenStr: tokenResponse.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
      toast.success(`Welcome back, ${user.full_name}!`);
    } catch (error: unknown) {
      set({ isLoading: false });
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    try {
      set({ isLoading: true });
      await authApi.register(data);
      toast.success('Account created! Please log in.');
      set({ isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false });
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast.error(message);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({
      user: null,
      token: null,
      refreshTokenStr: null,
      isAuthenticated: false,
    });
    toast.success('Logged out successfully');
  },

  refreshToken: async () => {
    const currentRefresh = get().refreshTokenStr;
    if (!currentRefresh) {
      get().logout();
      return;
    }
    try {
      const tokenResponse = await authApi.refreshToken(currentRefresh);
      localStorage.setItem('access_token', tokenResponse.access_token);
      localStorage.setItem('refresh_token', tokenResponse.refresh_token);
      set({
        token: tokenResponse.access_token,
        refreshTokenStr: tokenResponse.refresh_token,
        isAuthenticated: true,
      });
    } catch {
      get().logout();
    }
  },

  checkAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    try {
      set({ isLoading: true });
      const user = await authApi.getProfile();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ isLoading: false });
      get().logout();
    }
  },

  setUser: (user: User) => set({ user }),
}));
