import { supabase } from './client';
import type { Database } from './types';
import type { PostgrestError } from '@supabase/supabase-js';

// Generic database helper functions
export const db = {
  // Generic query helper with error handling
  async query<T>(
    queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>
  ) {
    try {
      const { data, error } = await queryFn();
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: error as PostgrestError 
      };
    }
  },

  // Insert a row into a table
  async insert<T extends keyof Database['public']['Tables']>(
    table: T,
    values: Database['public']['Tables'][T]['Insert']
  ) {
    return this.query(() => 
      supabase
        .from(table)
        .insert(values)
        .select()
        .single()
    );
  },

  // Insert multiple rows
  async insertMany<T extends keyof Database['public']['Tables']>(
    table: T,
    values: Database['public']['Tables'][T]['Insert'][]
  ) {
    return this.query(() => 
      supabase
        .from(table)
        .insert(values)
        .select()
    );
  },

  // Select rows from a table
  async select<T extends keyof Database['public']['Tables']>(
    table: T,
    filters?: Partial<Database['public']['Tables'][T]['Row']>
  ) {
    let query = supabase.from(table).select('*');
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    return this.query(() => query);
  },

  // Update rows in a table
  async update<T extends keyof Database['public']['Tables']>(
    table: T,
    id: string,
    values: Database['public']['Tables'][T]['Update']
  ) {
    return this.query(() => 
      supabase
        .from(table)
        .update(values)
        .eq('id', id)
        .select()
        .single()
    );
  },

  // Delete a row from a table
  async delete<T extends keyof Database['public']['Tables']>(
    table: T,
    id: string
  ) {
    return this.query(() => 
      supabase
        .from(table)
        .delete()
        .eq('id', id)
        .select()
        .single()
    );
  },

  // Get a single row by ID
  async getById<T extends keyof Database['public']['Tables']>(
    table: T,
    id: string
  ) {
    return this.query(() => 
      supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()
    );
  },

  // Upload a file to Supabase Storage
  async uploadFile(
    bucket: string,
    path: string,
    file: File
  ) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return { data: { ...data, publicUrl: urlData.publicUrl }, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  // Delete a file from Supabase Storage
  async deleteFile(bucket: string, path: string) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as PostgrestError };
    }
  },

  // Get public URL for a file
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  },
};


