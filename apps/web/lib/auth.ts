import { create } from 'zustand';
import api from './api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  companyCode: string;
  companyName: string;
  employeeId?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (companyCode: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (companyCode: string, email: string, password: string) => {
    const { data } = await api.post('/auth/login', { companyCode, email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken || '');
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  hydrate: () => {
    if (globalThis.window === undefined) return;
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (userStr && token) {
      try {
        const user = JSON.parse(userStr);
        set({ user, isAuthenticated: true, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));

export function hasRole(user: User | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
