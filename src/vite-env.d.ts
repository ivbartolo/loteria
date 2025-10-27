/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_PUBLIC_API_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_GA_TRACKING_ID?: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_ENABLE_DEBUG_MODE?: string;
  readonly VITE_JWT_SECRET?: string;
  readonly VITE_ENCRYPTION_KEY?: string;
  readonly VITE_MAX_UPLOAD_SIZE?: string;
  readonly VITE_STORAGE_PROVIDER?: string;
  readonly VITE_STORAGE_BUCKET_NAME?: string;
  readonly VITE_STORAGE_REGION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
