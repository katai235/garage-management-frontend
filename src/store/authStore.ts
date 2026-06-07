import { create } from 'zustand';
import { authApi } from '../services/api';
import { User } from '../types';

// Web-safe storage that works on both browser and mobile
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const SecureStore = await import('expo-secure-store');
      return await SecureStore.getItemAsync(key);
    } catch {
      return localStorage.getItem(key);
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      const SecureStore = await import('expo-secure-store');
      await SecureStore.setItemAsync(key, value);
    } catch {
      localStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      const SecureStore = await import('expo-secure-store');
      await SecureStore.deleteItemAsync(key);
    } catch {
      localStorage.removeItem(key);
    }
  },
};

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(username, password);
      const { accessToken, refreshToken, user } = response.data;
      await storage.setItem('accessToken', accessToken);
      await storage.setItem('refreshToken', refreshToken);
      await storage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed. Please try again.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      const refreshToken = await storage.getItem('refreshToken');
      if (refreshToken) {
        await authApi.logout(refreshToken).catch(() => {});
      }
    } finally {
      await storage.removeItem('accessToken');
      await storage.removeItem('refreshToken');
      await storage.removeItem('user');
      set({ user: null, isAuthenticated: false });
    }
  },

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const [storedUser, accessToken] = await Promise.all([
        storage.getItem('user'),
        storage.getItem('accessToken'),
      ]);
      if (storedUser && accessToken) {
        set({ user: JSON.parse(storedUser), isAuthenticated: true });
      }
    } catch {
      await storage.removeItem('accessToken');
      await storage.removeItem('refreshToken');
      await storage.removeItem('user');
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
