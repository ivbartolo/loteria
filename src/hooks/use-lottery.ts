import { useState, useEffect } from 'react';
import { supabase, db } from '@/integrations/supabase';
import type { Database } from '@/integrations/supabase';
import type { User } from '@supabase/supabase-js';

type LotteryNumber = Database['public']['Tables']['lottery_numbers']['Row'];

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
    if (!user) return;
    
    async function loadNumbers() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('lottery_numbers')
          .select('*')
          .eq('user_id', user.id)
          .order('added_at', { ascending: false });

        if (error) throw error;
        setNumbers(data || []);
      } catch (err) {
        setError(err as Error);
        console.error('Error loading numbers:', err);
      } finally {
        setLoading(false);
      }
    }

    loadNumbers();
  }, [user]);

  // Añadir número
  const addNumber = async (number: string, name: string, prize?: number) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const { data, error } = await supabase
        .from('lottery_numbers')
        .insert({
          number: number.trim(),
          name: name.trim(),
          prize: prize || null,
          user_id: user.id,
        })
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
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const { error } = await supabase
        .from('lottery_numbers')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setNumbers(numbers.filter(n => n.id !== id));
      return { error: null };
    } catch (err) {
      console.error('Error removing number:', err);
      return { error: err as Error };
    }
  };

  // Actualizar número
  const updateNumber = async (id: string, updates: Partial<LotteryNumber>) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const { data, error } = await supabase
        .from('lottery_numbers')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
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
    if (!user) return;

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
      if (!user) return;
      const { data } = await supabase
        .from('lottery_numbers')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });
      if (data) setNumbers(data);
    },
  };
}


