/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_EXECUTION_MODE?: 'mock' | 'api';
  readonly VITE_EXECUTION_API_BASE_URL?: string;
  readonly VITE_CREDITS_MODE?: 'stub' | 'live';
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
