import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createZeleriOrder } from '@/lib/zeleri';

// =============================================================================
// MERCADOPAGO — comentado, conservado para eventual reactivación
// =============================================================================
// import { MercadoPagoConfig, Preference } from 'mercadopago';
//
// const mpClient = new MercadoPagoConfig({
//   accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || ''
// });
//
// async function createMPPreference(booking: any, params: {
//   service_name: string; amount: number;
//   client_name: string; client_email: string; client_whatsapp?: string;
//   baseUrl: string;
// }) {
//   const preference = new Preference(mpClient);
//   const response = await preference.create({
//     body: {
//       items: [{
//         id: booking.id.toString(), title: `Servicio: ${params.service_name}`,
//         quantity: 1, unit_price: params.amount, currency_id: 'CLP',
//       }],
//       payer: { name: params.client_name, email: params.client_email,
//                phone: { number: params.client_whatsapp || '' } },
//       back_urls: {
//         success: `${params.baseUrl}/checkout/success?booking_id=${booking.id}`,
//         failure: `${params.baseUrl}/#agenda`,
//         pending: `${params.baseUrl}/checkout/success?booking_id=${booking.id}&pending=true`,
//       },
//       auto_return: 'approved',
//       external_reference: booking.id.toString(),
//       notification_url: `${params.baseUrl}/api/zeus/payments/webhook`,
//     }
//   });
//   return response.init_point;
// }
// =============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      service_id,
      service_name,
      amount,
      client_name,
      client_email,
      client_whatsapp,
      date,
      slot,
      simulate_payment
    } = body;

    // 1. Validaciones básicas
    if (!date || !slot || !client_email || !client_name) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client_email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      return NextResponse.json({ error: 'No se puede reservar para fechas pasadas' }, { status: 400 });
    }

    const slotRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!slotRegex.test(slot)) {
      return NextResponse.json({ error: 'Formato de horario inválido' }, { status: 400 });
    }

    const sanitizedAmount = Number(amount) || 0;
    if (isNaN(sanitizedAmount) || sanitizedAmount < 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    // 2. Verificar disponibilidad
    const { data: existing, error: checkError } = await supabase
      .from('zeus_bookings')
      .select('id')
      .eq('booking_date', date)
      .eq('booking_slot', slot)
      .in('payment_status', ['paid', 'pending'])
      .limit(1);

    if (checkError) throw checkError;
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'El horario ya no está disponible' }, { status: 409 });
    }

    const isSimulated = Boolean(simulate_payment);

    // 3. Crear la reserva en Supabase
    const { data: booking, error: bookingError } = await supabase
      .from('zeus_bookings')
      .insert({
        // service_id puede tener un tipo legacy distinto en algunas bases.
        // Conservamos la referencia humana en service_name para no romper la reserva.
        service_id:       null,
        service_name,
        amount:           sanitizedAmount,
        client_name:      client_name.trim(),
        client_email:     client_email.toLowerCase(),
        client_whatsapp:  client_whatsapp || null,
        booking_date:     date,
        booking_slot:     slot,
        payment_status:   isSimulated ? 'paid' : 'pending',
        // Mantener etiqueta legacy compatible con la base actual.
        payment_method:   isSimulated ? 'simulated' : 'mercadopago',
        notes:            isSimulated ? 'Pago simulado aprobado' : null,
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // 4. Si no es simulación, crear orden en Zeleri
    let paymentUrl = null;
    let zeleriOrderId: number | null = null;
    if (!isSimulated && sanitizedAmount > 0) {
      const host     = request.headers.get('host') || 'asesoriaszeus.cl';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const baseUrl  = `${protocol}://${host}`;

      const zeleriOrder = await createZeleriOrder({
        title:       `Reserva: ${service_name}`,
        description: `Servicio agendado para el ${date} a las ${slot}`,
        amount:      sanitizedAmount,
        customer:    { email: client_email, name: client_name, phone: client_whatsapp || '' },
        successUrl:  `${baseUrl}/checkout/success?booking_id=${booking.id}`,
        failureUrl:  `${baseUrl}/agenda?status=failure`,
      });

      paymentUrl = zeleriOrder.data.url;
      zeleriOrderId = zeleriOrder.data.order_id;

      // Guardar el order_id de Zeleri en la reserva para verificación posterior
      await supabase
        .from('zeus_bookings')
        .update({ payment_id: zeleriOrderId.toString() })
        .eq('id', booking.id);
    }

    return NextResponse.json({
      success:     true,
      booking_id:  booking.id,
      order_id:    zeleriOrderId,
      payment_url: paymentUrl,
      message:     isSimulated
        ? 'Reserva aprobada (simulación)'
        : 'Reserva creada, redirigiendo a pago',
    });

  } catch (error: any) {
    console.error('[Book] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
