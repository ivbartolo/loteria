-- ==========================================
-- SIMPLE FIX: DISABLE RLS FOR DEMO MODE
-- ==========================================

-- Deshabilitar Row Level Security para permitir operaciones sin autenticación
ALTER TABLE lottery_numbers DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- INSTRUCCIONES DE USO
-- ==========================================
-- 1. Ejecuta este script en tu consola de Supabase SQL Editor
-- 2. Esto permitirá que la aplicación funcione sin autenticación
-- 3. Para producción, deberás implementar autenticación adecuada
-- 4. Considera habilitar RLS nuevamente cuando agregues autenticación

-- ==========================================
-- VERIFICACIÓN
-- ==========================================
-- Para verificar que RLS está deshabilitado:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'lottery_numbers';


