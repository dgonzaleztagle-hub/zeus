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
      type, // 'service' o 'product'
      item_id, 
      item_name, 
      amount, 
      client_name, 
      client_email,
      metadata // para datos extra como booking_date, etc.
    } = body;

    if (!item_id || !amount || !client_email || !client_name) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // 1. Lógica específica según el tipo
    let external_reference = '';
    
    if (type === 'service') {
      // Es una reserva de agenda
      const { date, slot, client_whatsapp } = metadata || {};
      
      // ✅ VERIFICAR DISPONIBILIDAD ANTES DE INSERTAR
      const { data: existingBooking } = await supabase
        .from('zeus_bookings')
        .select('id')
        .eq('booking_date', date)
        .eq('booking_slot', slot)
        .maybeSingle();
      
      if (existingBooking) {
        return NextResponse.json({ 
          error: 'Este horario acaba de ser reservado por otro usuario. Por favor elige otro horario disponible.' 
        }, { status: 409 });
      }

      // Crear la reserva en estado pendiente
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
      external_reference = `booking_${booking.id}`;
    } else {
      // Es un producto digital
      external_reference = `product_${item_id}_${Date.now()}`;
      // Aquí podríamos crear un registro de "orden" si quisiéramos traza total,
      // pero usaremos la external_reference para identificarlo en el webhook.
    }

    // 2. Crear preferencia en Mercado Pago
    const preference = new Preference(client);
    const host = request.headers.get('host') || 'asesoriaszeus.cl';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const response = await preference.create({
      body: {
        items: [
          {
            id: item_id,
            title: item_name,
            quantity: 1,
            unit_price: Number(amount),
            currency_id: 'CLP',
          }
        ],
        payer: {
          name: client_name,
          email: client_email,
        },
        back_urls: {
          success: `${baseUrl}/checkout/success?type=${type}&ref=${external_reference}`,
          failure: `${baseUrl}/checkout/error`,
          pending: `${baseUrl}/checkout/success?type=${type}&ref=${external_reference}&pending=true`,
        },
        auto_return: 'approved',
        external_reference: external_reference,
        notification_url: `${baseUrl}/api/zeus/payments/webhook`,
        metadata: {
          type: type,
          client_email: client_email,
          item_id: item_id
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      payment_url: response.init_point,
      external_reference: external_reference
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
