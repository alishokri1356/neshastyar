import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // Mock login - replace with actual Supabase call
        if (email && password) {
          const mockUser = { id: '1', email };
          const mockToken = 'mock-jwt-token';
          
          set({
            user: mockUser,
            token: mockToken,
            isAuthenticated: true,
          });
        } else {
          throw new Error('Invalid credentials');
        }
      },

      signup: async (email: string, password: string, confirmPassword: string) => {
        // Mock signup - replace with actual Supabase call
        if (email && password && password === confirmPassword) {
          const mockUser = { id: '1', email };
          const mockToken = 'mock-jwt-token';
          
          set({
            user: mockUser,
            token: mockToken,
            isAuthenticated: true,
          });
        } else {
          throw new Error('Invalid signup data');
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      resetPassword: async (email: string) => {
        // Mock password reset - replace with actual Supabase call
        console.log('Password reset sent to:', email);
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);