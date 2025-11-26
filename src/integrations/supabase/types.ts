// This file will be used to define TypeScript types for your Supabase database
// It's typically generated from your Supabase schema, but for now we'll create a placeholder

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      lottery_numbers: {
        Row: {
          id: string
          number: string
          name: string
          prize: number | null
          added_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          number: string
          name: string
          prize?: number | null
          added_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          number?: string
          name?: string
          prize?: number | null
          added_at?: string
          updated_at?: string
          user_id?: string | null
        }
      }
    }
    Views: {
      // Add your view definitions here
      _empty: never
    }
    Functions: {
      // Add your function definitions here
      _empty: never
    }
    Enums: {
      // Add your enum definitions here
      _empty: never
    }
  }
}

// You can regenerate these types by running:
// npx supabase gen types typescript --project-id your-project-id > src/integrations/supabase/types.ts
