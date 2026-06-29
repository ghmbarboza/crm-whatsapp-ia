/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_EVOLUTION_API_URL?: string
  readonly VITE_EVOLUTION_API_KEY?: string
  readonly VITE_EVOLUTION_INSTANCE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
