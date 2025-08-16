import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,

      initialize: async () => {
        // Set up auth state listener
        supabase.auth.onAuthStateChange((event, session) => {
          set({
            session,
            user: session?.user ? {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name
            } : null,
            isAuthenticated: !!session?.user,
          });
        });

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        set({
          session,
          user: session?.user ? {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name
          } : null,
          isAuthenticated: !!session?.user,
        });
      },

      login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.session) {
          set({
            session: data.session,
            user: {
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.name
            },
            isAuthenticated: true,
          });
        }
      },

      signup: async (email: string, password: string, confirmPassword: string) => {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const redirectUrl = `${window.location.origin}/login`;
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.session) {
          set({
            session: data.session,
            user: {
              id: data.user!.id,
              email: data.user!.email || '',
              name: data.user!.user_metadata?.name
            },
            isAuthenticated: true,
          });
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          session: null,
          isAuthenticated: false,
        });
      },

      resetPassword: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) {
          throw new Error(error.message);
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);