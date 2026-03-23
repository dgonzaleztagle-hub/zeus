import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const zeusSupabaseUrl = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL;
const zeusServiceRoleKey = process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY;

if (!zeusSupabaseUrl || !zeusServiceRoleKey) {
  throw new Error('Faltan variables ZEUS de Supabase en el entorno');
}

const supabase = createClient(zeusSupabaseUrl, zeusServiceRoleKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('zeus_services')
      .select('id, type, title, description, price_label, price, icon, accent_color, sort_order')
      .neq('status', 'inactive') // Traer solo los que no están inactivos
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ services: data });
  } catch (error: any) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
