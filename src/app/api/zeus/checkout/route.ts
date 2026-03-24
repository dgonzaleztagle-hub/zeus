import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!
);

const mpClient = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' 
});

export async function POST(request: Request) {
  let bookingId: string | null = null;

  try {
    const body = await request.json();
    const { type, item_id, item_name, amount, client_name, client_email, metadata } = body;

    if (!item_id || !amount || !client_email || !client_name) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    let external_reference = '';
    
    if (type === 'service') {
      const { date, slot, client_whatsapp } = metadata || {};
      
      // 1. Verificar disponibilidad (ignorar pending con más de 30 min de antigüedad)
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: existingBooking } = await supabase
        .from('zeus_bookings')
        .select('id, payment_status, created_at')
        .eq('booking_date', date)
        .eq('booking_slot', slot)
        .or(`payment_status.eq.paid,and(payment_status.eq.pending,created_at.gt.${thirtyMinAgo})`)
        .maybeSingle();
      
      if (existingBooking) {
        return NextResponse.json({ 
          error: 'Este horario no está disponible. Por favor elige otro horario.' 
        }, { status: 409 });
      }

      // 2. Limpiar pending expirados de ese slot (más de 30 min)
      await supabase
        .from('zeus_bookings')
        .delete()
        .eq('booking_date', date)
        .eq('booking_slot', slot)
        .eq('payment_status', 'pending')
        .lt('created_at', thirtyMinAgo);

      // 3. Crear la reserva en estado pending (bloquea el slot durante el pago)
      const { data: booking, error: bError } = await supabase
        .from('zeus_bookings')
        .insert({
          service_id: item_id,
          service_name: item_name,
          amount: amount,
          client_name: client_name,
          client_email: client_email,
          client_whatsapp: client_whatsapp,
          booking_date: date,
          booking_slot: slot,
          payment_status: 'pending',
          payment_method: 'mercadopago'
        })
        .select()
        .single();

      if (bError) throw bError;
      bookingId = booking.id;
      external_reference = `booking_${booking.id}`;
    } else {
      external_reference = `product_${item_id}_${Date.now()}`;
    }

    // 4. Crear preferencia en Mercado Pago
    const preference = new Preference(mpClient);
    const host = request.headers.get('host') || 'asesoriaszeus.cl';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const response = await preference.create({
      body: {
        items: [{ id: item_id, title: item_name, quantity: 1, unit_price: Number(amount), currency_id: 'CLP' }],
        payer: { name: client_name, email: client_email },
        back_urls: {
          success: `${baseUrl}/checkout/success?type=${type}&ref=${external_reference}`,
          failure: `${baseUrl}/checkout/error`,
          pending: `${baseUrl}/checkout/success?type=${type}&ref=${external_reference}&pending=true`,
        },
        auto_return: 'approved',
        external_reference: external_reference,
        notification_url: `${baseUrl}/api/zeus/payments/webhook`,
        metadata: { type, client_email, item_id }
      }
    });

    return NextResponse.json({ 
      success: true, 
      payment_url: response.init_point,
      external_reference: external_reference
    });

  } catch (error: any) {
    console.error('Checkout error:', JSON.stringify(error));
    
    // Si MP falló y habíamos creado una reserva pending, la borramos
    // para que el slot quede libre y el cliente pueda reintentar
    if (bookingId) {
      await supabase
        .from('zeus_bookings')
        .delete()
        .eq('id', bookingId)
        .eq('payment_status', 'pending');
    }

    const msg = error?.message || error?.cause?.message || JSON.stringify(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
