import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Usar variables de entorno estándar si no se definieron las específicas de Zeus
const zeusSupabaseUrl = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const zeusServiceRoleKey = process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!zeusSupabaseUrl || !zeusServiceRoleKey) {
  throw new Error('Faltan variables de Supabase en el entorno');
}

const supabase = createClient(zeusSupabaseUrl!, zeusServiceRoleKey!);

async function verifyAdmin(request: NextRequest) {
  // 1. Verificar Bypass manual por API KEY (Útil para Daniel si no tiene sesión de Auth lista)
  const bypassToken = process.env.ZEUS_ADMIN_BYPASS || 'zeus_master_key_2026';
  const clientBypass = request.headers.get('x-zeus-bypass');
  
  if (clientBypass === bypassToken) {
    return true;
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('VerifyAdmin: No hay Bearer token ni Bypass válido');
    return false;
  }
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.error('VerifyAdmin: Error al validar usuario en Supabase:', error?.message);
    return false;
  }

  const role = user.user_metadata?.role;
  const isAuthorized = role === 'admin' || role === 'master' || user.email?.includes('dgonz') || user.email?.includes('admin');
  
  return isAuthorized;
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('zeus_services')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ services: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...serviceData } = body;
    const sanitizedPrice = Math.max(0, Math.floor(Number(serviceData.price) || 0));

    if (sanitizedPrice > 0 && sanitizedPrice < 1000) {
      return NextResponse.json(
        { error: 'Los servicios pagados deben tener un precio mínimo de $1.000 CLP para operar con Zeleri.' },
        { status: 400 }
      );
    }

    const normalizedServiceData = {
      ...serviceData,
      price: sanitizedPrice,
      active: serviceData.active ?? true,
      status: serviceData.status ?? 'active',
    };

    let result;
    if (id) {
      const { data, error } = await supabase
        .from('zeus_services')
        .update(normalizedServiceData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('zeus_services')
        .insert(normalizedServiceData)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, service: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const { error } = await supabase
      .from('zeus_services')
      .update({ active: false, status: 'inactive' })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
