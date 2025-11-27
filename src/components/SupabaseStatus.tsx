import { useEffect, useState } from 'react';
import { isSupabaseConfigured, getSupabaseClient } from '@/integrations/supabase';
import { Card } from '@/components/ui/card';

export function SupabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    async function checkConnection() {
      try {
        if (!isSupabaseConfigured()) {
          setStatus('error');
          setMessage('❌ Supabase no está configurado. Verifica tus variables de entorno.');
          return;
        }

        const client = getSupabaseClient();

        // Probar conexión básica
        const { error } = await client.from('_empty').select('*').limit(0);
        
        if (error && error.code !== 'PGRST116') {
          setStatus('error');
          setMessage(`❌ Error: ${error.message}`);
        } else {
          setStatus('connected');
          setMessage('✅ Supabase conectado correctamente');
          
          // Obtener usuario si existe
          const { data: { user } } = await client.auth.getUser();
          setUser(user?.email || null);
        }
      } catch (err) {
        setStatus('error');
        setMessage(`❌ Error: ${err}`);
      }
    }

    checkConnection();
  }, []);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-2">Estado de Supabase</h3>
      <div className="space-y-2">
        <div className={status === 'connected' ? 'text-green-600' : 'text-red-600'}>
          {message}
        </div>
        {user && (
          <div className="text-sm text-gray-600">
            Usuario: {user}
          </div>
        )}
        {status === 'checking' && (
          <div className="text-blue-600 animate-pulse">
            Verificando...
          </div>
        )}
      </div>
    </Card>
  );
}
