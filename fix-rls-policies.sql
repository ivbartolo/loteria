-- ==========================================
-- FIX RLS POLICIES FOR DEMO MODE
-- ==========================================

-- Eliminar políticas existentes que requieren autenticación
DROP POLICY IF EXISTS "Users can view their own lottery numbers" ON lottery_numbers;
DROP POLICY IF EXISTS "Users can insert their own lottery numbers" ON lottery_numbers;
DROP POLICY IF EXISTS "Users can update their own lottery numbers" ON lottery_numbers;
DROP POLICY IF EXISTS "Users can delete their own lottery numbers" ON lottery_numbers;

-- Crear políticas que permiten operaciones sin autenticación (modo demo)
-- Política: Permitir ver todos los números (modo demo público)
CREATE POLICY "Allow public read access for demo"
  ON lottery_numbers
  FOR SELECT
  USING (true);

-- Política: Permitir insertar números sin autenticación (modo demo)
CREATE POLICY "Allow public insert for demo"
  ON lottery_numbers
  FOR INSERT
  WITH CHECK (true);

-- Política: Permitir actualizar números sin autenticación (modo demo)
CREATE POLICY "Allow public update for demo"
  ON lottery_numbers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política: Permitir eliminar números sin autenticación (modo demo)
CREATE POLICY "Allow public delete for demo"
  ON lottery_numbers
  FOR DELETE
  USING (true);

-- ==========================================
-- ALTERNATIVA: Deshabilitar RLS completamente
-- ==========================================
-- Si prefieres deshabilitar RLS completamente, descomenta la siguiente línea:
-- ALTER TABLE lottery_numbers DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- NOTAS IMPORTANTES
-- ==========================================
-- ⚠️  Estas políticas permiten acceso público a la tabla
-- ⚠️  Solo usar para modo demo/desarrollo
-- ⚠️  Para producción, implementar autenticación adecuada
-- ⚠️  Considerar límites de rate limiting


