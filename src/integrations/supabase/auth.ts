import { getSupabaseClient } from './client';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// Auth utility functions
export const auth = {
  // Sign up with email and password
  async signUp(email: string, password: string) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  },

  // Sign in with OAuth provider (Google, GitHub, etc.)
  async signInWithProvider(provider: 'google' | 'github' | 'discord' = 'google') {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as AuthError };
    }
  },

  // Sign out
  async signOut() {
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  },

  // Get current session
  async getSession(): Promise<Session | null> {
    const client = getSupabaseClient();
    const { data: { session } } = await client.auth.getSession();
    return session;
  },

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const client = getSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    return user;
  },

  // Reset password
  async resetPassword(email: string) {
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  },

  // Update password
  async updatePassword(newPassword: string) {
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.updateUser({
        password: newPassword,
      });
      
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (user: User | null) => void) {
    const client = getSupabaseClient();
    return client.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null);
    });
  },
};

// Re-export commonly used types
export type { User, Session, AuthError };


