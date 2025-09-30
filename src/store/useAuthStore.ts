import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  email: string;
  name?: string;
}

interface Session {
  token: string;
  expiresAt: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,

      initialize: async () => {
        // Check for existing session
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          set({
            session: data.session,
            user: data.session.user || null,
            isAuthenticated: !!data.session.user,
          });
        } else {
          set({
            session: null,
            user: null,
            isAuthenticated: false,
          });
        }
      },

      login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw new Error(error.error || error.message || 'Login failed');
        }

        set({
          session: data.session,
          user: data.user,
          isAuthenticated: true,
        });
      },

      signup: async (email: string, password: string, confirmPassword: string) => {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {}
        });

        if (error) {
          throw new Error(error.error || error.message || 'Signup failed');
        }

        set({
          session: data.session,
          user: data.user,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          session: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);