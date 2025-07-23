import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { api } from '@/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    recoveryGoals?: string[];
    wellnessGoals?: string[];
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const { user, token: _token } = await api.login({ email, password });
          // The API service automatically saves the token
          set({
            user,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({
            error: message,
            isLoading: false
          });
          throw error;
        }
      },

            register: async (userData) => {
        set({ isLoading: true, error: null });

        try {
          const { user, token: _token } = await api.register(userData);
          // The API service automatically saves the token
          set({
            user,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Registration failed';
          set({
            error: message,
            isLoading: false
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });

        try {
          await api.logout();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        } catch (error) {
          // Even if logout fails, clear local state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) {
          throw new Error('No user logged in');
        }

        set({ isLoading: true, error: null });

        try {
          const updatedUser = await api.updateProfile(updates);
          set({
            user: updatedUser,
            isLoading: false
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Profile update failed';
          set({
            error: message,
            isLoading: false
          });
          throw error;
        }
      },

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user
        });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);