import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getZeleriOrderDetail, isZeleriPaid } from '@/lib/zeleri';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!
);

function extractOrderId(payload: any): number | null {
  const raw =
    payload?.order_id ??
    payload?.data?.order_id ??
    payload?.data?.id ??
    payload?.order?.id ??
    payload?.id ??
    payload?.resource?.id ??
    null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function mapPaymentStatus(status: string): 'paid' | 'pending' | 'failed' {
  const normalized = status.toLowerCase();
  if (normalized === 'paid' || normalized === 'approved' || normalized === 'completed') {
    return 'paid';
  }
  if (normalized === 'pending' || normalized === 'created' || normalized === 'processing') {
    return 'pending';
  }
  return 'failed';
}

export async function POST(request: Request) {
  let payload: any = null;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload JSON invalido' }, { status: 400 });
  }

  try {
    const orderId = extractOrderId(payload);

    if (!orderId) {
      return NextResponse.json({
        received: false,
        error: 'No se encontro order_id en el webhook',
      }, { status: 400 });
    }

    const detail = await getZeleriOrderDetail(orderId);
    const remoteStatus = String(detail.data?.status || 'pending');
    const paymentStatus = mapPaymentStatus(remoteStatus);

    const { data: booking, error: bookingError } = await supabase
      .from('zeus_bookings')
      .select('id, payment_status')
      .eq('payment_id', String(orderId))
      .maybeSingle();

    if (bookingError) {
      console.error('[ZeleriWebhook] Error buscando booking:', bookingError);
      return NextResponse.json({ error: bookingError.message }, { status: 500 });
    }

    if (!booking) {
      return NextResponse.json({
        received: true,
        order_id: orderId,
        status: remoteStatus,
        note: 'Orden recibida, pero no se encontro booking asociado en Zeus',
      });
    }

    const nextNotes = `Webhook Zeleri sincronizado - status: ${remoteStatus} - order_id: ${orderId}`;

    if (paymentStatus === 'paid' || booking.payment_status !== paymentStatus) {
      const updatePayload: Record<string, string> = {
        payment_status: paymentStatus,
        notes: nextNotes,
      };

      if (paymentStatus === 'paid' && !isZeleriPaid(detail)) {
        updatePayload.payment_status = 'pending';
      }

      const { error: updateError } = await supabase
        .from('zeus_bookings')
        .update(updatePayload)
        .eq('id', booking.id);

      if (updateError) {
        console.error('[ZeleriWebhook] Error actualizando booking:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      received: true,
      order_id: orderId,
      booking_id: booking.id,
      status: remoteStatus,
      synced_status: paymentStatus,
    });
  } catch (error: any) {
    console.error('[ZeleriWebhook] Error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
