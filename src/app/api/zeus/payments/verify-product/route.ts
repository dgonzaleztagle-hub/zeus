import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { findMercadoPagoPaymentByExternalReference, getMercadoPagoPayment, isMercadoPagoApproved } from '@/lib/mercadopago';
import { getProductExternalReference } from '@/lib/payments';
import { getZeleriOrderDetail, isZeleriPaid } from '@/lib/zeleri';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = Number(searchParams.get('order_id'));
    const productId = searchParams.get('product_id');
    const clientEmail = (searchParams.get('client_email') || '').trim().toLowerCase();
    const provider = (searchParams.get('provider') || '').trim().toLowerCase();

    if (!orderId || !productId) {
      return NextResponse.json({ error: 'order_id y product_id son requeridos' }, { status: 400 });
    }

    if (provider === 'mercadopago') {
      const payment = await getMercadoPagoPayment(String(orderId));

      if (!isMercadoPagoApproved(payment?.status)) {
        return NextResponse.json({
          verified: false,
          status: payment?.status || 'pending',
        });
      }

      const expectedExternalReference = getProductExternalReference(productId, clientEmail);
      if (expectedExternalReference !== String(payment?.external_reference || '')) {
        return NextResponse.json({ error: 'El pago no corresponde al producto solicitado' }, { status: 422 });
      }
    } else {
      const detail = await getZeleriOrderDetail(orderId);
      if (!isZeleriPaid(detail)) {
        return NextResponse.json({
          verified: false,
          status: detail.data?.status || 'pending',
        });
      }

      if (String(detail.data?.commerce_order || '') !== String(productId)) {
        return NextResponse.json({ error: 'La orden no corresponde al producto solicitado' }, { status: 422 });
      }

      const commerceReference = String(detail.data?.commerce_reference || '').trim().toLowerCase();
      if (clientEmail && commerceReference && commerceReference !== clientEmail) {
        return NextResponse.json({ error: 'La orden no coincide con el comprador esperado' }, { status: 422 });
      }
    }

    const { data: existingToken } = await supabase
      .from('zeus_download_tokens')
      .select('token, expires_at')
      .eq('product_id', productId)
      .eq('client_email', clientEmail || null)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingToken?.token) {
      return NextResponse.json({
        verified: true,
        token: existingToken.token,
        expires_at: existingToken.expires_at,
        reused: true,
      });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from('zeus_download_tokens')
      .insert({
        product_id: productId,
        token,
        client_email: clientEmail || null,
        expires_at: expiresAt,
        used: false,
      });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      verified: true,
      token,
      expires_at: expiresAt,
    });
  } catch (error: any) {
    console.error('[VerifyProduct] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
