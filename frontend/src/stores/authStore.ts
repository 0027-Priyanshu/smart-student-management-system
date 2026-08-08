import { create } from 'zustand';
import api from '../utils/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUserLocal: (updatedUser: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false,
  loading: typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true, loading: false });
    } catch (error: any) {
      set({ loading: false });
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  register: async (name, email, password, role) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/register', { name, email, password, role });
      const { accessToken, refreshToken, user } = res.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true, loading: false });
    } catch (error: any) {
      set({ loading: false });
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  },

  logout: async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, isAuthenticated: false, loading: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ user: null, isAuthenticated: false, loading: false });
      return;
    }
    
    // Set loading to true initially
    set({ loading: true });

    try {
      // Race API check with a 2500ms timeout to avoid cold-start page locking
      const fetchAuth = api.get('/auth/me');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth check timeout')), 2500)
      );

      const res = (await Promise.race([fetchAuth, timeoutPromise])) as any;
      const { user } = res.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true, loading: false });
    } catch (error) {
      // If cached user exists and token is present, fall back to cached user state on timeout
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          set({ user: parsed, isAuthenticated: true, loading: false });
          return;
        } catch (e) {
          // invalid cache
        }
      }

      // Clean up on genuine auth failure
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },

  updateUserLocal: (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  }
}));
