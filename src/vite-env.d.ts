/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Público en el bundle (ADR 0012, restricción 2): solo la `anon key`, nunca `service_role`. */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
