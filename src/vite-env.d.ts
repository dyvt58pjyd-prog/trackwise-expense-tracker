/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SYNC_SERVER_URL?: string;
  readonly VITE_DATABASE_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
