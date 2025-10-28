import { useState, useEffect } from 'react';
import { supabase, db } from '@/integrations/supabase';
import type { Database } from '@/integrations/supabase';
import type { User } from '@supabase/supabase-js';

// Tipo simplificado para el modo demo
type LotteryNumber = {
  id: string;
  number: string;
  name: string;
  prize?: number | null;
  added_at: string;
  updated_at: string;
  user_id?: string | null;
};

export function useLottery() {
  const [numbers, setNumbers] = useState<LotteryNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Cargar usuario actual
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    getUser();
  }, []);

  // Cargar números de la lotería
  useEffect(() => {
    async function loadNumbers() {
      try {
        setLoading(true);
        
        // Modo demo: usar datos locales si no hay conexión a Supabase
        if (!supabase) {
          console.log('Modo demo: usando datos locales');
          setNumbers([]);
          setLoading(false);
          return;
        }

        // Si hay usuario, cargar sus números específicos
        if (user) {
          const { data, error } = await supabase
            .from('lottery_numbers')
            .select('*')
            .eq('user_id', user.id)
            .order('added_at', { ascending: false });

          if (error) throw error;
          setNumbers(data || []);
        } else {
          // Si no hay usuario, cargar todos los números (modo demo)
          const { data, error } = await supabase
            .from('lottery_numbers')
            .select('*')
            .order('added_at', { ascending: false });

          if (error) throw error;
          setNumbers(data || []);
        }
      } catch (err) {
        setError(err as Error);
        console.error('Error loading numbers:', err);
        // En caso de error, mostrar array vacío para que la app funcione
        setNumbers([]);
      } finally {
        setLoading(false);
      }
    }

    loadNumbers();
  }, [user]);

  // Añadir número
  const addNumber = async (number: string, name: string, prize?: number) => {
    try {
      // Modo demo: agregar localmente si no hay Supabase
      if (!supabase) {
        const newNumber: LotteryNumber = {
          id: Date.now().toString(),
          number: number.trim(),
          name: name.trim(),
          prize: prize || null,
          added_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: null,
        };
        setNumbers([newNumber, ...numbers]);
        return { data: newNumber, error: null };
      }

      const { data, error } = await supabase
        .from('lottery_numbers')
        .insert({
          number: number.trim(),
          name: name.trim(),
          prize: prize || null,
          user_id: user?.id || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      setNumbers([data, ...numbers]);
      return { data, error: null };
    } catch (err) {
      console.error('Error adding number:', err);
      return { data: null, error: err as Error };
    }
  };

  // Eliminar número
  const removeNumber = async (id: string) => {
    try {
      // Modo demo: eliminar localmente si no hay Supabase
      if (!supabase) {
        setNumbers(numbers.filter(n => n.id !== id));
        return { error: null };
      }

      // Eliminar usando solo el ID, sin filtrar por user_id
      const { error } = await supabase
        .from('lottery_numbers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error from Supabase:', error);
        throw error;
      }

      // Actualizar el estado local
      setNumbers(numbers.filter(n => n.id !== id));
      return { error: null };
    } catch (err) {
      console.error('Error removing number:', err);
      return { error: err as Error };
    }
  };

  // Actualizar número
  const updateNumber = async (id: string, updates: Partial<LotteryNumber>) => {
    try {
      // Modo demo: actualizar localmente si no hay Supabase
      if (!supabase) {
        setNumbers(numbers.map(n => n.id === id ? { ...n, ...updates } : n));
        return { data: { ...numbers.find(n => n.id === id)!, ...updates }, error: null };
      }

      const { data, error } = await (supabase as any)
        .from('lottery_numbers')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id || null)
        .select()
        .single();

      if (error) throw error;

      setNumbers(numbers.map(n => n.id === id ? data : n));
      return { data, error: null };
    } catch (err) {
      console.error('Error updating number:', err);
      return { data: null, error: err as Error };
    }
  };

  // Actualizar premios desde un Map
  const updatePrizes = async (prizeResults: Map<string, number>) => {
    try {
      const updates = numbers.map(async (num) => {
        const prize = prizeResults.get(num.number);
        if (prize !== undefined && prize !== num.prize) {
          return updateNumber(num.id, { prize });
        }
        return null;
      });

      await Promise.all(updates.filter(Boolean));
    } catch (err) {
      console.error('Error updating prizes:', err);
    }
  };

  // Obtener números premiados
  const winners = numbers.filter(n => n.prize && n.prize > 0);

  return {
    numbers,
    loading,
    error,
    user,
    winners,
    addNumber,
    removeNumber,
    updateNumber,
    updatePrizes,
    refetch: async () => {
      const { data } = await supabase
        .from('lottery_numbers')
        .select('*')
        .eq('user_id', user?.id || null)
        .order('added_at', { ascending: false });
      if (data) setNumbers(data);
    },
  };
}


