import { NextResponse } from 'next/server';
import { createMercadoPagoProductPreference } from '@/lib/mercadopago';
import { getActivePaymentProvider, getPaymentMode } from '@/lib/payments';
import { createZeleriOrder } from '@/lib/zeleri';

// =============================================================================
// MERCADOPAGO — comentado, conservado para eventual reactivación
// =============================================================================
// import { MercadoPagoConfig, Preference } from 'mercadopago';
//
// async function createMercadoPagoPreference(params: {
//   type: string; item_id: string; item_name: string; amount: number;
//   client_name: string; client_email: string;
//   metadata?: { date?: string; slot?: string; client_whatsapp?: string };
//   baseUrl: string;
// }) {
//   const accessToken = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
//   if (!accessToken) throw new Error('Token de Mercado Pago no configurado');
//   const mpClient = new MercadoPagoConfig({ accessToken });
//   const preference = new Preference(mpClient);
//   const { date, slot, client_whatsapp } = params.metadata || {};
//   const externalRef = [
//     params.type, params.item_id, params.item_name,
//     encodeURIComponent(params.client_name), encodeURIComponent(params.client_email),
//     date || '', slot || '', encodeURIComponent(client_whatsapp || ''), params.amount,
//   ].join('|');
//   const response = await preference.create({
//     body: {
//       items: [{ id: params.item_id, title: params.item_name, quantity: 1,
//                 unit_price: Number(params.amount), currency_id: 'CLP' }],
//       payer: { name: params.client_name, email: params.client_email },
//       back_urls: {
//         success: `${params.baseUrl}/checkout/success?type=${params.type}&status=approved`,
//         failure: `${params.baseUrl}/checkout/error`,
//         pending: `${params.baseUrl}/checkout/success?type=${params.type}&status=pending`,
//       },
//       auto_return: 'approved',
//       external_reference: externalRef,
//       notification_url: `${params.baseUrl}/api/zeus/payments/webhook`,
//     }
//   });
//   return response.init_point;
// }
// =============================================================================

/**
 * POST /api/zeus/checkout
 *
 * Crea una orden de pago en Zeleri (checkout oneshot, gateway_id=4).
 * No escribe nada en la base de datos.
 * Para reservas de servicios, usar /api/zeus/book (crea registro pending primero).
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

    const sanitizedAmount = Number(amount);
    if (Number.isNaN(sanitizedAmount) || sanitizedAmount < 1000) {
      return NextResponse.json({ error: 'Monto inválido (mínimo $1.000)' }, { status: 400 });
    }

    const host     = request.headers.get('host') || 'asesoriaszeus.cl';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl  = `${protocol}://${host}`;

    const { date, slot } = metadata || {};
    const provider = getActivePaymentProvider();

    if (provider === 'mercadopago') {
      const preference = await createMercadoPagoProductPreference({
        productId: item_id,
        itemName: item_name,
        amount: sanitizedAmount,
        clientName: client_name,
        clientEmail: client_email,
        clientWhatsapp: metadata?.client_whatsapp || '',
        baseUrl,
      });

      return NextResponse.json({
        success: true,
        payment_provider: provider,
        payment_mode: getPaymentMode(provider),
        payment_url: preference.init_point || preference.sandbox_init_point,
        order_id: preference.id || null,
      });
    }

    const order = await createZeleriOrder({
      title:       item_name,
      description: type === 'service' && date && slot
        ? `Reserva para el ${date} a las ${slot}`
        : `Pago por ${item_name}`,
      amount:      sanitizedAmount,
      customer:    {
        email: client_email,
        name: client_name,
        phone: metadata?.client_whatsapp || '',
      },
      successUrl:  `${baseUrl}/checkout/success?type=${type}&status=approved&product_id=${encodeURIComponent(item_id)}&client_email=${encodeURIComponent(client_email)}`,
      failureUrl:  `${baseUrl}/checkout/error`,
      commerceOrder:     item_id,
      commerceReference: client_email,
    });

    return NextResponse.json({
      success: true,
      payment_provider: provider,
      payment_mode: getPaymentMode(provider),
      payment_url: order.data.url,
      order_id: order.data.order_id,
    });

  } catch (error: any) {
    const msg = error?.message || 'Error desconocido';
    console.error('[Checkout Zeleri] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
