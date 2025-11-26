# 🗄️ Guía para Crear las Tablas en Supabase

## 📋 Pasos para crear las tablas en tu proyecto de Supabase

### Opción 1: Desde el Dashboard de Supabase (Recomendado)

1. **Inicia sesión en Supabase**
   - Ve a https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en **"SQL Editor"**
   - Click en **"New query"**

3. **Copia y pega el esquema SQL**
   - Abre el archivo `supabase-schema.sql` en tu proyecto
   - Copia todo el contenido
   - Pégalo en el editor SQL
   - Click en **"Run"** o presiona `Ctrl+Enter` (o `Cmd+Enter` en Mac)

4. **Verifica que se crearon las tablas**
   - Ve a **"Table Editor"** en el menú lateral
   - Deberías ver la tabla `lottery_numbers`

### Opción 2: Desde la CLI de Supabase

Si tienes la CLI de Supabase instalada:

```bash
# Conectarse a tu proyecto
supabase link --project-ref tu-project-ref

# Ejecutar el archivo SQL
supabase db push
```

### Opción 3: Desde el Table Editor (Interfaz Gráfica)

1. **Abre el Table Editor**
   - En el Dashboard, ve a **"Table Editor"**
   - Click en **"New table"**

2. **Crea la tabla manualmente con estos datos:**
   - Table name: `lottery_numbers`
   - Agrega las siguientes columnas:

| Column | Type | Default | Nullable |
|--------|------|---------|----------|
| id | uuid | `uuid_generate_v4()` | ❌ |
| number | varchar(5) | - | ❌ |
| name | varchar(255) | - | ❌ |
| prize | decimal(10,2) | - | ✅ |
| added_at | timestamptz | `now()` | ❌ |
| updated_at | timestamptz | `now()` | ❌ |
| user_id | uuid | - | ✅ |

3. **Configura las Foreign Keys**
   - En `user_id`, haz click en "Foreign Key"
   - Referencia: `auth.users`
   - Column: `id`
   - On delete: `Cascade`

4. **Agrega las políticas RLS**
   - Click en la tabla → "Policies"
   - Agrega las siguientes políticas:

#### Policy 1: SELECT
```sql
CREATE POLICY "Users can view their own lottery numbers"
  ON lottery_numbers
  FOR SELECT
  USING (auth.uid() = user_id);
```

#### Policy 2: INSERT
```sql
CREATE POLICY "Users can insert their own lottery numbers"
  ON lottery_numbers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

#### Policy 3: UPDATE
```sql
CREATE POLICY "Users can update their own lottery numbers"
  ON lottery_numbers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### Policy 4: DELETE
```sql
CREATE POLICY "Users can delete their own lottery numbers"
  ON lottery_numbers
  FOR DELETE
  USING (auth.uid() = user_id);
```

---

## ✅ Verificar que todo está configurado

Después de crear las tablas, ejecuta esta consulta en el SQL Editor:

```sql
-- Verificar que la tabla existe
SELECT * FROM lottery_numbers;

-- Verificar las políticas
SELECT * FROM pg_policies WHERE tablename = 'lottery_numbers';
```

---

## 🔍 Estructura de la tabla creada

### Tabla: `lottery_numbers`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único (generado automáticamente) |
| `number` | VARCHAR(5) | Número de lotería (5 dígitos) |
| `name` | VARCHAR(255) | Nombre o descripción |
| `prize` | DECIMAL(10,2) | Premio en euros (opcional) |
| `added_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización |
| `user_id` | UUID | ID del usuario (autoasignado) |

### Características implementadas:

✅ **Seguridad (RLS)**: Los usuarios solo pueden ver/editar sus propios números  
✅ **Validación**: El número debe tener exactamente 5 dígitos  
✅ **Unicidad**: No se pueden duplicar números por usuario  
✅ **Foreign Key**: Relación con tabla de usuarios de Supabase Auth  
✅ **Auto-update**: El campo `updated_at` se actualiza automáticamente  
✅ **Índices**: Optimización para búsquedas rápidas  
✅ **Triggers**: Asignación automática de `user_id`  

---

## 📊 Views creadas

### `lottery_winners`
Muestra solo los números que tienen premio:
```sql
SELECT * FROM lottery_winners;
```

### `lottery_stats`
Estadísticas por usuario:
```sql
SELECT * FROM lottery_stats WHERE user_id = auth.uid();
```

---

## 🚀 Próximos pasos

1. ✅ Crear las tablas en Supabase
2. ✅ Verificar que funcionan correctamente
3. 📝 Actualizar el código de la app para usar Supabase en lugar de localStorage
4. 🔐 Implementar autenticación si es necesario

---

## ⚠️ Troubleshooting

### Error: "relation already exists"
Si ya existe la tabla, elimínala primero:
```sql
DROP TABLE IF EXISTS lottery_numbers CASCADE;
```
Luego vuelve a ejecutar el script.

### Error: "permission denied"
Asegúrate de estar usando el rol correcto. En el SQL Editor, verifica que tienes permisos de admin.

### Error: "function auth.uid() does not exist"
Este error puede ocurrir si RLS no está habilitado. Ejecuta:
```sql
ALTER TABLE lottery_numbers ENABLE ROW LEVEL SECURITY;
```

---

¿Necesitas ayuda? Revisa la documentación de Supabase: https://supabase.com/docs
