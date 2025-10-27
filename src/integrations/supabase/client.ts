import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get Supabase URL and Anon Key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that required environment variables are set
if (!supabaseUrl) {
  throw new Error(
    'Missing env.VITE_SUPABASE_URL. ' +
    'Please add it to your .env.local file or check your environment configuration.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing env.VITE_SUPABASE_ANON_KEY. ' +
    'Please add it to your .env.local file or check your environment configuration.'
  );
}

// Create and export the Supabase client with type safety
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // More secure OAuth flow
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'loteria-app',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Export types for use throughout the app
export type { Database } from './types';
