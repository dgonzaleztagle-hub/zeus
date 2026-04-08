import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const zeusSupabaseUrl = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL;
const zeusSupabaseAnonKey = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_ANON_KEY;
const zeusServiceRoleKey = process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY;

if (!zeusSupabaseUrl || !zeusSupabaseAnonKey || !zeusServiceRoleKey) {
  throw new Error('Faltan variables ZEUS para autenticación admin');
}

const ZEUS_SUPABASE_URL: string = zeusSupabaseUrl;
const ZEUS_SUPABASE_ANON_KEY: string = zeusSupabaseAnonKey;
const ZEUS_SERVICE_ROLE_KEY: string = zeusServiceRoleKey;

const serviceClient = createClient(ZEUS_SUPABASE_URL, ZEUS_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function isAdminUser(user: any) {
  const role = String(user?.user_metadata?.role || '').toLowerCase();
  return role === 'admin' || role === 'master';
}

export function createZeusBrowserClient() {
  return createBrowserClient(ZEUS_SUPABASE_URL, ZEUS_SUPABASE_ANON_KEY);
}

async function getUserFromBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const { data, error } = await serviceClient.auth.getUser(token);
  if (error) return null;
  return data.user || null;
}

async function getUserFromCookies(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(ZEUS_SUPABASE_URL, ZEUS_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user || null;
}

export async function getAdminUserFromRequest(request: NextRequest) {
  const tokenUser = await getUserFromBearerToken(request);
  if (tokenUser) return isAdminUser(tokenUser) ? tokenUser : null;

  const cookieUser = await getUserFromCookies(request);
  return isAdminUser(cookieUser) ? cookieUser : null;
}

export async function requireAdminRequest(request: NextRequest) {
  const user = await getAdminUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  return null;
}
