# 🔧 SOLUCIÓN: Error RLS "new row violates row level security policy"

## 🚨 Problema identificado
El error `"new row violates row level security policy for table lottery_numbers"` ocurre porque:
- Supabase tiene Row Level Security (RLS) habilitado
- Las políticas requieren autenticación de usuario
- La aplicación funciona en modo demo sin autenticación

## ✅ Solución rápida

### Opción 1: Deshabilitar RLS (Recomendado para demo)
1. Ve a tu **Supabase Dashboard**
2. Abre **SQL Editor**
3. Ejecuta este comando:
```sql
ALTER TABLE lottery_numbers DISABLE ROW LEVEL SECURITY;
```

### Opción 2: Usar el archivo SQL incluido
1. Ve a tu **Supabase Dashboard**
2. Abre **SQL Editor**
3. Copia y pega el contenido de `disable-rls-simple.sql`
4. Ejecuta el script

## 🔍 Verificación
Después de ejecutar el fix, verifica que funciona:
1. Recarga tu aplicación en Vercel
2. Intenta añadir un número
3. Debería funcionar sin errores

## ⚠️ Consideraciones de seguridad
- **Modo Demo:** Esta solución es perfecta para desarrollo/demo
- **Producción:** Cuando implementes autenticación, deberás:
  - Habilitar RLS nuevamente
  - Crear políticas específicas para usuarios autenticados
  - Implementar autenticación en la aplicación

## 📁 Archivos incluidos
- `disable-rls-simple.sql` - Solución simple (recomendada)
- `fix-rls-policies.sql` - Solución con políticas públicas

## 🚀 Próximos pasos
1. Ejecuta el fix en Supabase
2. Prueba la aplicación
3. ¡Disfruta tu app de lotería funcionando!
