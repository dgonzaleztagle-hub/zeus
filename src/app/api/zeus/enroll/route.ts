import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createZeleriEnrollment } from '@/lib/zeleri';
import { reconcileAndClassifyBookings } from '@/lib/booking-locks';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/zeus/enroll
 *
 * Inicia el flujo de pago inline con tarjeta.
 * 1. Si es servicio: crea reserva pending en zeus_bookings.
 * 2. Crea enrollment en Zeleri.
 * 3. Devuelve url_enrollment (iframe) y booking_id (si aplica).
 */
export async function POST(request: Request) {
  let bookingId: string | null = null;
  let shouldCleanupPendingBooking = false;

  try {
    const body = await request.json();
    const {
      customer_name,
      customer_email,
      customer_phone,
      type,       // 'service' | 'product'
      item_id,
      item_name,
      amount,
      // Solo servicios:
      date,
      slot,
    } = body;

    if (!customer_name || !customer_email || !customer_phone || !type || !amount) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sanitizedAmount = Number(amount);
    if (Number.isNaN(sanitizedAmount) || sanitizedAmount < 1000) {
      return NextResponse.json({ error: 'Monto inválido (mínimo $1.000)' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // ---- Reserva (solo servicios) ----
    if (type === 'service') {
      if (!date || !slot) {
        return NextResponse.json({ error: 'Fecha y hora requeridas para servicios' }, { status: 400 });
      }

      // Verificar disponibilidad
      const normalizedEmail = customer_email.toLowerCase();

      const { data: existing } = await supabase
        .from('zeus_bookings')
        .select('id, payment_status, client_email, payment_id, created_at')
        .eq('booking_date', date)
        .eq('booking_slot', slot)
        .in('payment_status', ['paid', 'pending'])
        .order('created_at', { ascending: false });

      const { blocking } = await reconcileAndClassifyBookings(supabase, existing || []);

      const paidBooking = blocking.find((booking) => booking.payment_status === 'paid');
      if (paidBooking) {
        return NextResponse.json({ error: 'El horario ya no está disponible' }, { status: 409 });
      }

      const reusablePending = blocking.find((booking) =>
        booking.payment_status === 'pending' &&
        booking.client_email?.toLowerCase() === normalizedEmail &&
        !booking.payment_id
      );

      const foreignPending = blocking.find((booking) =>
        booking.payment_status === 'pending' &&
        booking.client_email?.toLowerCase() !== normalizedEmail
      );

      if (foreignPending) {
        return NextResponse.json({ error: 'El horario ya no está disponible' }, { status: 409 });
      }

      if (reusablePending) {
        bookingId = reusablePending.id;
        shouldCleanupPendingBooking = true;
      }

      if (!bookingId) {
        const { data: booking, error: bookingError } = await supabase
          .from('zeus_bookings')
          .insert({
            service_id:      item_id   || null,
            service_name:    item_name || null,
            amount:          sanitizedAmount,
            client_name:     customer_name.trim(),
            client_email:    normalizedEmail,
            client_whatsapp: customer_phone || null,
            booking_date:    date,
            booking_slot:    slot,
            payment_status:  'pending',
            payment_method:  'zeleri_enrollment',
          })
          .select()
          .single();

        if (bookingError) throw bookingError;
        bookingId = booking.id;
        shouldCleanupPendingBooking = true;
      }
    }

    // ---- Enrollment en Zeleri ----
    const enrollment = await createZeleriEnrollment({
      customerName:  customer_name.trim(),
      customerEmail: customer_email.toLowerCase(),
      customerPhone: customer_phone,
    });

    return NextResponse.json({
      success:        true,
      url_enrollment: enrollment.data.url_enrollment,
      booking_id:     bookingId,
    });

  } catch (error: any) {
    console.error('[Enroll] Error:', error.message);
    if (bookingId && shouldCleanupPendingBooking) {
      await supabase
        .from('zeus_bookings')
        .delete()
        .eq('id', bookingId)
        .eq('payment_status', 'pending');
    }
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
