import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { issueDownloadToken } from '@/modules/digital-access/tokens';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!
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

    const issued = await issueDownloadToken({
      supabase,
      productId: product_id,
      clientEmail: client_email || null,
    });

    return NextResponse.json({ token: issued.token, expires_at: issued.expiresAt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
