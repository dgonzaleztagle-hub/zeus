import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getZeleriOrderDetail, isZeleriPaid } from '@/lib/zeleri';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/zeus/payments/verify?booking_id=xxx
 *
 * Verifica el pago de una reserva consultando directamente la API de Zeleri.
 * Si el pago está confirmado, actualiza el estado en Supabase.
 * Llamado desde la página /checkout/success al cargar.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');

    if (!bookingId) {
      return NextResponse.json({ error: 'booking_id requerido' }, { status: 400 });
    }

    // 1. Obtener la reserva desde Supabase
    const { data: booking, error: fetchError } = await supabase
      .from('zeus_bookings')
      .select('id, payment_status, payment_id, payment_method')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    // Si ya está pagada, no es necesario verificar de nuevo
    if (booking.payment_status === 'paid') {
      return NextResponse.json({ verified: true, status: 'paid', already_confirmed: true });
    }

    // Si es simulación, confiar sin verificar
    if (booking.payment_method === 'simulated') {
      return NextResponse.json({ verified: true, status: 'paid' });
    }

    // 2. Necesitamos el Zeleri order_id (guardado en payment_id)
    const zeleriOrderId = booking.payment_id ? parseInt(booking.payment_id, 10) : null;
    if (!zeleriOrderId) {
      return NextResponse.json(
        { verified: false, error: 'Sin referencia de orden Zeleri. Contacte al administrador.' },
        { status: 422 }
      );
    }

    // 3. Consultar Zeleri
    const detail = await getZeleriOrderDetail(zeleriOrderId);
    const paid   = isZeleriPaid(detail);

    console.log(`[Verify] Zeleri order ${zeleriOrderId} status: ${detail.data?.status}`);

    if (paid) {
      // 4. Actualizar reserva a paid
      const { error: updateError } = await supabase
        .from('zeus_bookings')
        .update({
          payment_status: 'paid',
          notes: `Pago confirmado por Zeleri — order_id: ${zeleriOrderId}`,
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('[Verify] Error actualizando reserva:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ verified: true, status: 'paid' });
    }

    // Pago no confirmado aún
    return NextResponse.json({
      verified: false,
      status:   detail.data?.status || 'pending',
    });

  } catch (error: any) {
    console.error('[Verify] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
