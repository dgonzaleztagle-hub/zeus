import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

/**
 * POST /api/zeus/checkout
 * 
 * Crea una preferencia de pago en Mercado Pago.
 * NO escribe nada en la base de datos aún.
 * La reserva se crea SOLO cuando el webhook confirma el pago.
 * 
 * Body: { type, item_id, item_name, amount, client_name, client_email, metadata }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, item_id, item_name, amount, client_name, client_email, metadata } = body;

    if (!item_id || !amount || !client_email || !client_name || !type) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const accessToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
    if (!accessToken) {
      return NextResponse.json({ error: 'Token de Mercado Pago no configurado' }, { status: 500 });
    }

    const mpClient = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(mpClient);

    const host = request.headers.get('host') || 'asesoriaszeus.cl';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    // Construir external_reference con todos los datos necesarios para el webhook
    // Formato: type|item_id|client_name|client_email|date|slot|whatsapp
    const { date, slot, client_whatsapp } = metadata || {};
    const externalRef = [
      type,
      item_id,
      item_name,
      encodeURIComponent(client_name),
      encodeURIComponent(client_email),
      date || '',
      slot || '',
      encodeURIComponent(client_whatsapp || ''),
      amount
    ].join('|');

    const response = await preference.create({
      body: {
        items: [{
          id: item_id,
          title: item_name,
          quantity: 1,
          unit_price: Number(amount),
          currency_id: 'CLP',
        }],
        payer: { name: client_name, email: client_email },
        back_urls: {
          success: `${baseUrl}/checkout/success?type=${type}&status=approved`,
          failure: `${baseUrl}/checkout/error`,
          pending: `${baseUrl}/checkout/success?type=${type}&status=pending`,
        },
        auto_return: 'approved',
        external_reference: externalRef,
        notification_url: `${baseUrl}/api/zeus/payments/webhook`,
      }
    });

    return NextResponse.json({
      success: true,
      payment_url: response.init_point,
    });

  } catch (error: any) {
    const msg = error?.message || error?.cause?.message || 'Error desconocido';
    console.error('[Checkout] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
