import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('ref'); // product_ID_TS

    if (!reference || !reference.startsWith('product_')) {
      return NextResponse.json({ error: 'Referencia inválida' }, { status: 400 });
    }

    const [, productId, rawTs] = reference.split('_');
    const referenceTs = Number(rawTs || 0);
    const createdAfter = Number.isFinite(referenceTs) && referenceTs > 0
      ? new Date(referenceTs - 60 * 1000).toISOString()
      : new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: tokenData, error } = await supabase
      .from('zeus_download_tokens')
      .select('token, expires_at, created_at')
      .eq('product_id', productId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .gt('created_at', createdAfter)
      .order('created_at', { ascending: false })
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
