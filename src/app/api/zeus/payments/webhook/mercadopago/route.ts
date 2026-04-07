import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getMercadoPagoPayment, isMercadoPagoApproved } from '@/lib/mercadopago';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!,
);

function extractPaymentId(payload: any, searchParams: URLSearchParams): string | null {
  return String(
    payload?.data?.id ||
    payload?.id ||
    searchParams.get('data.id') ||
    searchParams.get('id') ||
    ''
  ).trim() || null;
}

function extractTopic(payload: any, searchParams: URLSearchParams): string {
  return String(
    payload?.type ||
    payload?.topic ||
    searchParams.get('type') ||
    searchParams.get('topic') ||
    ''
  ).trim().toLowerCase();
}

function extractBookingIdFromExternalReference(externalReference: string): string | null {
  const [scope, bookingId] = String(externalReference || '').split('|');
  if (scope !== 'service' || !bookingId) return null;
  return bookingId;
}

export async function POST(request: Request) {
  let payload: any = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  try {
    const { searchParams } = new URL(request.url);
    const topic = extractTopic(payload, searchParams);

    if (topic && topic !== 'payment') {
      return NextResponse.json({ received: true, ignored: true, topic });
    }

    const paymentId = extractPaymentId(payload, searchParams);
    if (!paymentId) {
      return NextResponse.json({ received: false, error: 'payment_id no encontrado' }, { status: 400 });
    }

    const payment = await getMercadoPagoPayment(paymentId);
    const externalReference = String(payment?.external_reference || '');
    const bookingId = extractBookingIdFromExternalReference(externalReference);

    if (!bookingId) {
      return NextResponse.json({
        received: true,
        ignored: true,
        payment_id: paymentId,
        note: 'Pago recibido sin booking de servicio asociado',
      });
    }

    const nextStatus = isMercadoPagoApproved(payment?.status)
      ? 'paid'
      : String(payment?.status || '').toLowerCase() === 'rejected'
        ? 'failed'
        : 'pending';

    const { error } = await supabase
      .from('zeus_bookings')
      .update({
        payment_status: nextStatus,
        payment_id: String(payment.id || paymentId),
        notes: `Webhook Mercado Pago sincronizado - payment_id: ${payment.id || paymentId} - status: ${payment?.status || 'unknown'}`,
      })
      .eq('id', bookingId);

    if (error) {
      return NextResponse.json({ received: false, error: error.message }, { status: 500 });
    }

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
