import { createClient } from '@supabase/supabase-js';

const zeusSupabaseUrl = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL;
const zeusServiceRoleKey = process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY;
const zeusSetupSecret = (process.env.ZEUS_SETUP_SECRET || '').trim();

if (!zeusSupabaseUrl || !zeusServiceRoleKey) {
  throw new Error('Faltan variables ZEUS de Supabase: NEXT_PUBLIC_ZEUS_SUPABASE_URL y/o ZEUS_SUPABASE_SERVICE_ROLE_KEY');
}

const ZEUS_SUPABASE_URL: string = zeusSupabaseUrl;
const ZEUS_SERVICE_ROLE_KEY: string = zeusServiceRoleKey;

export async function POST(request: Request) {
  try {
    if (!zeusSetupSecret) {
      return Response.json(
        { error: 'Endpoint deshabilitado' },
        { status: 403 },
      );
    }

    const providedSecret = request.headers.get('x-zeus-setup-secret')?.trim() || '';
    if (providedSecret !== zeusSetupSecret) {
      return Response.json(
        { error: 'No autorizado' },
        { status: 401 },
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    const supabase = createClient(
      ZEUS_SUPABASE_URL,
      ZEUS_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'admin',
      },
    });

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 400 },
      );
    }

    return Response.json(
      {
        message: 'Admin user created successfully',
        user: data.user,
      },
      { status: 201 },
    );
  } catch (error: any) {
    return Response.json(
      { error: error.message },
      { status: 500 },
    );
  }
}
