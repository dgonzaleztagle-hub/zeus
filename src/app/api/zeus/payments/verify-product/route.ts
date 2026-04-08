import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { findMercadoPagoPaymentByExternalReference, getMercadoPagoPayment, isMercadoPagoApproved } from '@/lib/mercadopago';
import { getProductExternalReference } from '@/lib/payments';
import { findActiveDownloadToken, issueDownloadToken } from '@/modules/digital-access/tokens';
import { getZeleriOrderDetail, isZeleriPaid } from '@/lib/zeleri';

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

    const existingToken = await findActiveDownloadToken({
      supabase,
      productId,
      clientEmail,
    });

    if (existingToken?.token) {
      return NextResponse.json({
        verified: true,
        token: existingToken.token,
        expires_at: existingToken.expires_at,
        reused: true,
      });
    }

    const issued = await issueDownloadToken({
      supabase,
      productId,
      clientEmail,
    });

    return NextResponse.json({
      verified: true,
      token: issued.token,
      expires_at: issued.expiresAt,
    });
  } catch (error: any) {
    console.error('[VerifyProduct] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
