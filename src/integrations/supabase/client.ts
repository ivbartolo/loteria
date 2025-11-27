import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Obtener URL y clave desde variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Variables de entorno ausentes. ' +
    'La aplicación funcionará en modo demo sin conexión a Supabase.'
  );
}

// Crear cliente solo si hay configuración válida
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
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
    })
  : null;

// Helper para saber si Supabase está listo
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

export const getSupabaseClient = () => {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Revisa SUPABASE_SETUP.md para añadir VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
    );
  }

  return supabase;
};

// Exportar tipos
export type { Database } from './types';
