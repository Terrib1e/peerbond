import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Member } from '@/types';
import { api } from '@/lib/api';

interface AuthState {
  member: Member | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (memberData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    recoveryGoals?: string[];
    wellnessGoals?: string[];
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Member>) => Promise<void>;
  setMember: (member: Member | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      member: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const { member, token: _token } = await api.login({ email, password });
          // The API service automatically saves the token
          set({
            member,
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

            register: async (memberData) => {
        set({ isLoading: true, error: null });

        try {
          const { member, token: _token } = await api.register(memberData);
          // The API service automatically saves the token
          set({
            member,
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
            member: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        } catch (error) {
          // Even if logout fails, clear local state
          set({
            member: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      updateProfile: async (updates) => {
        const { member } = get();
        if (!member) {
          throw new Error('No member logged in');
        }

        set({ isLoading: true, error: null });

        try {
          const updatedMember = await api.updateProfile(updates);
          set({
            member: updatedMember,
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

      setMember: (member) => {
        set({
          member,
          isAuthenticated: !!member
        });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        member: state.member,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);