import { createBrowserClient } from '@supabase/ssr';

const zeusSupabaseUrl = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL;
const zeusSupabaseAnonKey = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_ANON_KEY;

if (!zeusSupabaseUrl || !zeusSupabaseAnonKey) {
  throw new Error('Faltan variables ZEUS publicas para autenticación admin');
}

const ZEUS_SUPABASE_URL: string = zeusSupabaseUrl;
const ZEUS_SUPABASE_ANON_KEY: string = zeusSupabaseAnonKey;

export function createZeusBrowserClient() {
  return createBrowserClient(ZEUS_SUPABASE_URL, ZEUS_SUPABASE_ANON_KEY);
}
