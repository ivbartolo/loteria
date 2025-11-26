# 🚀 Ejecutar Script SQL en Supabase

## Pasos Rápidos:

1. **Abre el Dashboard de Supabase**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - Click en "SQL Editor" en el menú lateral
   - Click en "New query"

3. **Copia el siguiente código SQL y pégalo**

-- ==========================================
-- LOTERÍA DE NAVIDAD - ESQUEMA DE BASE DE DATOS
-- ==========================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLA: lottery_numbers
-- Almacena los números de lotería y sus datos
-- ==========================================
CREATE TABLE IF NOT EXISTS lottery_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number VARCHAR(5) NOT NULL,
  name VARCHAR(255) NOT NULL,
  prize DECIMAL(10, 2),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Constraints
  CONSTRAINT unique_number_per_user UNIQUE(user_id, number),
  CONSTRAINT valid_number_format CHECK (number ~ '^[0-9]{5}$')
);

-- ==========================================
-- ÍNDICES
-- ==========================================

-- Índice para búsquedas por número
CREATE INDEX IF NOT EXISTS idx_lottery_numbers_number ON lottery_numbers(number);

-- Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_lottery_numbers_user_id ON lottery_numbers(user_id);

-- Índice para búsquedas por premio
CREATE INDEX IF NOT EXISTS idx_lottery_numbers_prize ON lottery_numbers(prize) WHERE prize IS NOT NULL;

-- Índice para ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_lottery_numbers_added_at ON lottery_numbers(added_at DESC);

-- ==========================================
-- POLÍTICAS DE SEGURIDAD (RLS - Row Level Security)
-- ==========================================

-- Habilitar RLS en la tabla
ALTER TABLE lottery_numbers ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propios números
CREATE POLICY "Users can view their own lottery numbers"
  ON lottery_numbers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden insertar sus propios números
CREATE POLICY "Users can insert their own lottery numbers"
  ON lottery_numbers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden actualizar sus propios números
CREATE POLICY "Users can update their own lottery numbers"
  ON lottery_numbers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden eliminar sus propios números
CREATE POLICY "Users can delete their own lottery numbers"
  ON lottery_numbers
  FOR DELETE
  USING (auth.uid() = user_id);

-- ==========================================
-- FUNCIONES Y TRIGGERS
-- ==========================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_lottery_numbers_updated_at ON lottery_numbers;
CREATE TRIGGER update_lottery_numbers_updated_at
  BEFORE UPDATE ON lottery_numbers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para asignar user_id automáticamente
CREATE OR REPLACE FUNCTION assign_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar user_id automáticamente
DROP TRIGGER IF EXISTS assign_user_id_trigger ON lottery_numbers;
CREATE TRIGGER assign_user_id_trigger
  BEFORE INSERT ON lottery_numbers
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_id();

-- ==========================================
-- VIEWS ÚTILES
-- ==========================================

-- Vista: Números premiados
CREATE OR REPLACE VIEW lottery_winners AS
SELECT 
  id,
  number,
  name,
  prize,
  added_at,
  updated_at,
  user_id
FROM lottery_numbers
WHERE prize IS NOT NULL AND prize > 0
ORDER BY prize DESC;

-- Vista: Estadísticas por usuario
CREATE OR REPLACE VIEW lottery_stats AS
SELECT 
  user_id,
  COUNT(*) as total_numbers,
  COUNT(prize) FILTER (WHERE prize IS NOT NULL AND prize > 0) as winning_numbers,
  COALESCE(SUM(prize), 0) as total_prize,
  MAX(added_at) as last_added
FROM lottery_numbers
GROUP BY user_id;

-- ==========================================
-- DATOS DE EJEMPLO (opcional, comentar si no se desea)
-- ==========================================

-- INSERT INTO lottery_numbers (number, name) VALUES
-- ('00001', 'Mi Número de Prueba');

-- ==========================================
-- FIN DEL ESQUEMA
-- ==========================================

-- Comentarios en la tabla
COMMENT ON TABLE lottery_numbers IS 'Almacena los números de lotería de los usuarios';
COMMENT ON COLUMN lottery_numbers.id IS 'ID único del registro';
COMMENT ON COLUMN lottery_numbers.number IS 'Número de lotería de 5 dígitos';
COMMENT ON COLUMN lottery_numbers.name IS 'Nombre o descripción del número';
COMMENT ON COLUMN lottery_numbers.prize IS 'Premio asociado al número en euros';
COMMENT ON COLUMN lottery_numbers.added_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN lottery_numbers.updated_at IS 'Fecha de última actualización';
COMMENT ON COLUMN lottery_numbers.user_id IS 'ID del usuario propietario';

4. **Ejecuta el script**
   - Click en el botón "Run" o presiona `Ctrl+Enter` (Windows/Linux) o `Cmd+Enter` (Mac)

5. **Verifica**
   - Ve a "Table Editor"
   - Deberías ver la tabla `lottery_numbers`

## ✅ Si todo salió bien:

Verás mensajes como:
- ✅ Table created successfully
- ✅ Index created successfully
- ✅ Policy created successfully

## ⚠️ Si hay errores:

- Si dice "relation already exists", es porque la tabla ya existe (está bien)
- Si hay errores de permisos, verifica que estés usando la cuenta correcta

