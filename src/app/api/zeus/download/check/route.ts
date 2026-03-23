import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('ref'); // product_ID_TS

    if (!reference || !reference.startsWith('product_')) {
      return NextResponse.json({ error: 'Referencia inválida' }, { status: 400 });
    }

    const productId = reference.split('_')[1];

    // Buscar el token más reciente para este producto en los últimos 10 minutos
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

    const { data: tokenData, error } = await supabase
      .from('zeus_download_tokens')
      .select('token, expires_at')
      .eq('product_id', productId)
      .gt('created_at', tenMinutesAgo.toISOString())
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!tokenData) {
      return NextResponse.json({ ready: false, message: 'Pago aún en proceso o token no generado' });
    }

    return NextResponse.json({ 
      ready: true, 
      token: tokenData.token,
      expires_at: tokenData.expires_at
    });

  } catch (error: any) {
    console.error('Check download error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
