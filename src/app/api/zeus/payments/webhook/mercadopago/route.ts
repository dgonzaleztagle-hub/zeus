import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  extractBookingIdFromServiceReference,
  extractMercadoPagoPaymentId,
  extractMercadoPagoTopic,
  syncMercadoPagoBooking,
} from '@/modules/payments/mercadopago';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  let payload: any = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  try {
    const { searchParams } = new URL(request.url);
    const topic = extractMercadoPagoTopic(payload, searchParams);

    if (topic && topic !== 'payment') {
      return NextResponse.json({ received: true, ignored: true, topic });
    }

    const paymentId = extractMercadoPagoPaymentId(payload, searchParams);
    if (!paymentId) {
      return NextResponse.json({ received: false, error: 'payment_id no encontrado' }, { status: 400 });
    }

    const { getMercadoPagoPayment } = await import('@/lib/mercadopago');
    const payment = await getMercadoPagoPayment(paymentId);
    const externalReference = String(payment?.external_reference || '');
    const bookingId = extractBookingIdFromServiceReference(externalReference);

    if (!bookingId) {
      return NextResponse.json({
        received: true,
        ignored: true,
        payment_id: paymentId,
        note: 'Pago recibido sin booking de servicio asociado',
      });
    }

    const { nextStatus } = await syncMercadoPagoBooking({
      supabase,
      bookingId,
      paymentId,
    });

    return NextResponse.json({
      received: true,
      booking_id: bookingId,
      payment_id: payment.id || paymentId,
      status: payment?.status || 'unknown',
      synced_status: nextStatus,
    });
  } catch (error: any) {
    console.error('[MercadoPagoWebhook] Error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
