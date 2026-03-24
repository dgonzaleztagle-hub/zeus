import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/zeus/payments/webhook
 * 
 * Recibe notificaciones de MP. Si el pago es aprobado,
 * crea la reserva en la DB con status 'paid' directamente.
 * Este es el ÚNICO lugar donde se escriben reservas.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Webhook] Notification received:', JSON.stringify(body));

    if (body.type !== 'payment' && body.topic !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id || body.id;
    if (!paymentId) {
      return NextResponse.json({ error: 'No payment ID' }, { status: 400 });
    }

    const accessToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
    const mpClient = new MercadoPagoConfig({ accessToken });
    const paymentApi = new Payment(mpClient);
    const paymentData = await paymentApi.get({ id: paymentId });

    console.log('[Webhook] Payment status:', paymentData.status, '| ref:', paymentData.external_reference);

    if (paymentData.status !== 'approved') {
      return NextResponse.json({ received: true, status: paymentData.status });
    }

    const externalRef = paymentData.external_reference || '';
    const parts = externalRef.split('|');

    if (parts[0] === 'service' && parts.length >= 9) {
      const [, serviceId, serviceName, clientNameEnc, clientEmailEnc, date, slot, whatsappEnc, amountStr] = parts;
      const clientName = decodeURIComponent(clientNameEnc);
      const clientEmail = decodeURIComponent(clientEmailEnc);
      const clientWhatsapp = decodeURIComponent(whatsappEnc);
      const amount = Number(amountStr);

      // Verificar si ya existe una reserva para este pago (idempotencia)
      const { data: existing } = await supabase
        .from('zeus_bookings')
        .select('id')
        .eq('payment_id', paymentId.toString())
        .maybeSingle();

      if (existing) {
        console.log('[Webhook] Booking already exists for payment', paymentId);
        return NextResponse.json({ received: true, duplicate: true });
      }

      const { error: insertError } = await supabase
        .from('zeus_bookings')
        .insert({
          service_id: serviceId,
          service_name: decodeURIComponent(serviceName),
          amount,
          client_name: clientName,
          client_email: clientEmail,
          client_whatsapp: clientWhatsapp,
          booking_date: date,
          booking_slot: slot,
          payment_status: 'paid',
          payment_method: 'mercadopago',
          payment_id: paymentId.toString(),
          notes: `Pago aprobado MP ID: ${paymentId}`,
        });

      if (insertError) {
        console.error('[Webhook] Insert error:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      console.log('[Webhook] Booking created successfully for', clientName, date, slot);
    }

    return NextResponse.json({ received: true, status: 'processed' });

  } catch (error: any) {
    const msg = error?.message || 'Error desconocido';
    console.error('[Webhook] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
