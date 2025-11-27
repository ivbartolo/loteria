// Main Supabase client
export { supabase, isSupabaseConfigured, getSupabaseClient } from './client';

// Auth utilities
export { auth } from './auth';
export type { User, Session, AuthError } from './auth';

// Database utilities
export { db } from './database';

// Types
export type { Database } from './types';

// Re-export commonly used types from supabase-js
export type {
  SupabaseClient,
  PostgrestError,
  PostgrestFilterBuilder,
  PostgrestQueryBuilder,
  PostgrestResponse,
} from '@supabase/supabase-js';


