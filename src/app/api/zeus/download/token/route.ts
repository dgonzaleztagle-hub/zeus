import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { product_id, client_email } = await request.json();

    if (!product_id) {
      return NextResponse.json({ error: 'product_id es requerido' }, { status: 400 });
    }

    // Verificar que el producto existe
    const { data: product } = await supabase
      .from('zeus_products')
      .select('id, is_free')
      .eq('id', product_id)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // En un flujo real, aquí verificaríamos si el usuario pagó si !product.is_free
    // Por ahora, generamos el token directamente

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 horas
    
    const { error } = await supabase
      .from('zeus_download_tokens')
      .insert({
        product_id,
        token,
        client_email: client_email || null,
        expires_at: expiresAt,
        used: false
      });

    if (error) throw error;

    return NextResponse.json({ token, expires_at: expiresAt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
