import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!
);

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' 
});

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
        service_id: service_id || null,
        service_name,
        amount: sanitizedAmount,
        client_name: client_name.trim(),
        client_email: client_email.toLowerCase(),
        client_whatsapp: client_whatsapp || null,
        booking_date: date,
        booking_slot: slot,
        payment_status: isSimulated ? 'paid' : 'pending',
        payment_method: isSimulated ? 'simulated' : 'mercadopago',
        notes: isSimulated ? 'Pago simulado aprobado' : null
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // 4. Si no es simulación, crear preferencia en Mercado Pago
    let paymentUrl = null;
    if (!isSimulated && sanitizedAmount > 0) {
      const preference = new Preference(client);
      const host = request.headers.get('host') || 'asesoriaszeus.cl';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const baseUrl = `${protocol}://${host}`;

      const response = await preference.create({
        body: {
          items: [
            {
              id: booking.id.toString(),
              title: `Servicio: ${service_name}`,
              quantity: 1,
              unit_price: sanitizedAmount,
              currency_id: 'CLP',
            }
          ],
          payer: {
            name: client_name,
            email: client_email,
            phone: { number: client_whatsapp || '' }
          },
          back_urls: {
            success: `${baseUrl}/checkout/success?booking_id=${booking.id}`,
            failure: `${baseUrl}/#agenda`,
            pending: `${baseUrl}/checkout/success?booking_id=${booking.id}&pending=true`,
          },
          auto_return: 'approved',
          external_reference: booking.id.toString(),
          notification_url: `${baseUrl}/api/zeus/payments/webhook`,
        }
      });

      paymentUrl = response.init_point;
    }

    return NextResponse.json({ 
      success: true, 
      booking_id: booking.id,
      payment_url: paymentUrl,
      message: isSimulated ? 'Reserva aprobada (simulación)' : 'Reserva creada, link de pago generado'
    });

  } catch (error: any) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
