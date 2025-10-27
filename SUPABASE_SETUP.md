# 🚀 Guía de Configuración de Supabase

## Tabla de Contenidos
1. [Instalación](#instalación)
2. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
3. [Configuración en Supabase Dashboard](#configuración-en-supabase-dashboard)
4. [Uso en el Código](#uso-en-el-código)
5. [Autenticación](#autenticación)
6. [Base de Datos](#base-de-datos)
7. [Storage](#storage)

---

## Instalación

El paquete de Supabase ya está instalado en este proyecto:

```bash
npm install @supabase/supabase-js
```

---

## Configuración de Variables de Entorno

### 1. Copiar el archivo de ejemplo

```bash
cp .env.example .env.local
```

### 2. Configurar las variables

Edita `.env.local` y añade tus credenciales de Supabase:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### ⚠️ IMPORTANTE
- **NUNCA** commits el archivo `.env.local` 
- Este archivo está en `.gitignore` por seguridad
- Solo comparte las credenciales con miembros del equipo autorizados

---

## Configuración en Supabase Dashboard

### 1. Crear un proyecto

1. Ve a [supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Click en "New Project"
4. Completa los detalles del proyecto

### 2. Obtener credenciales

1. En el Dashboard, ve a **Settings** > **API**
2. Copia los siguientes valores:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### 3. Configurar autenticación

1. Ve a **Authentication** > **Providers**
2. Habilita los proveedores que necesites:
   - Email/Password
   - Google OAuth
   - GitHub OAuth
   - etc.

3. Para OAuth, configura las URLs de redirección:
   - Development: `http://localhost:8080/auth/callback`
   - Production: `https://tu-dominio.com/auth/callback`

### 4. Configurar Storage (opcional)

1. Ve a **Storage**
2. Crea buckets según tus necesidades
3. Configura políticas de acceso (RLS)

---

## Uso en el Código

### Importación básica

```typescript
import { supabase, auth, db } from '@/integrations/supabase';
```

### Verificar configuración

```typescript
import { isSupabaseConfigured } from '@/integrations/supabase';

if (!isSupabaseConfigured()) {
  console.error('Supabase no está configurado correctamente');
}
```

---

## Autenticación

### Usar el hook de autenticación

Primero, envuelve tu app con el `AuthProvider`:

```tsx
import { AuthProvider } from '@/hooks/use-auth';

function App() {
  return (
    <AuthProvider>
      {/* Tu aplicación */}
    </AuthProvider>
  );
}
```

### Usar en componentes

```tsx
import { useAuth } from '@/hooks/use-auth';

function MyComponent() {
  const { user, signIn, signOut, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!user) return <div>No autenticado</div>;

  return (
    <div>
      <p>Usuario: {user.email}</p>
      <button onClick={() => signOut()}>Cerrar sesión</button>
    </div>
  );
}
```

### Ejemplo: Login

```tsx
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';

function LoginForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
      // Redireccionar o mostrar éxito
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Iniciar sesión</button>
    </form>
  );
}
```

### Autenticación con proveedores OAuth

```tsx
const { signInWithProvider } = useAuth();

// Login con Google
await signInWithProvider('google');

// Login con GitHub
await signInWithProvider('github');
```

---

## Base de Datos

### Operaciones básicas

```typescript
import { db } from '@/integrations/supabase';

// Insertar
const { data, error } = await db.insert('tu_tabla', {
  column1: 'value1',
  column2: 'value2',
});

// Seleccionar
const { data } = await db.select('tu_tabla', { column1: 'value1' });

// Actualizar
const { data } = await db.update('tu_tabla', 'id', { column1: 'new_value' });

// Eliminar
const { data } = await db.delete('tu_tabla', 'id');

// Obtener por ID
const { data } = await db.getById('tu_tabla', 'id');
```

### Consultas avanzadas

```typescript
import { supabase } from '@/integrations/supabase';

// Consulta con múltiples filtros
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('status', 'active')
  .gte('created_at', '2024-01-01')
  .order('created_at', { ascending: false })
  .limit(10);
```

---

## Storage

### Subir archivos

```typescript
import { db } from '@/integrations/supabase';

const file = event.target.files[0];
const { data, error } = await db.uploadFile(
  'bucket-name',
  'path/to/file.jpg',
  file
);

if (data) {
  console.log('URL pública:', data.publicUrl);
}
```

### Obtener URL pública

```typescript
const url = db.getPublicUrl('bucket-name', 'path/to/file.jpg');
```

### Eliminar archivos

```typescript
const { error } = await db.deleteFile('bucket-name', 'path/to/file.jpg');
```

---

## Generar Tipos de TypeScript

Para generar tipos de TypeScript desde tu esquema de Supabase:

```bash
npx supabase gen types typescript --project-id tu-project-id > src/integrations/supabase/types.ts
```

O instala la CLI de Supabase:

```bash
npm install -g supabase
supabase gen types typescript --project-id tu-project-id > src/integrations/supabase/types.ts
```

---

## Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de autenticación](https://supabase.com/docs/guides/auth)
- [Guía de database](https://supabase.com/docs/guides/database)
- [Guía de storage](https://supabase.com/docs/guides/storage)

---

## Troubleshooting

### Error: "Missing env.VITE_SUPABASE_URL"

**Solución**: Verifica que las variables de entorno estén configuradas en `.env.local`

### Error: "Invalid API key"

**Solución**: Verifica que copiaste correctamente la clave anon de Supabase

### Error: "User not authenticated"

**Solución**: Asegúrate de que el usuario esté autenticado antes de realizar operaciones que requieren autenticación

---

## Soporte

Si tienes problemas, revisa:
1. Las variables de entorno están configuradas
2. Las políticas RLS en Supabase permiten las operaciones
3. La configuración de OAuth (si usas providers externos)
