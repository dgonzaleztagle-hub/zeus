import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createMercadoPagoCardPayment } from '@/lib/mercadopago';
import {
  getProductExternalReference,
  getServiceExternalReference,
} from '@/lib/payments';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!,
);

function parsePaymentStatus(status: string | null | undefined) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'approved') return 'approved';
  if (normalized === 'in_process' || normalized === 'pending') return 'pending';
  return 'failed';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type,
      booking_id,
      product_id,
      item_name,
      amount,
      client_name,
      client_email,
      client_whatsapp,
      token,
      payment_method_id,
      issuer_id,
      installments,
      identification_type,
      identification_number,
    } = body || {};

    if (!type || !amount || !client_name || !client_email || !token || !payment_method_id || !installments || !identification_type || !identification_number) {
      return NextResponse.json({ error: 'Faltan datos para procesar el pago' }, { status: 400 });
    }

    const host = request.headers.get('host') || 'asesoriaszeus.cl';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    const sanitizedAmount = Number(amount);

    if (Number.isNaN(sanitizedAmount) || sanitizedAmount < 1) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    let payment;

    if (type === 'service') {
      if (!booking_id) {
        return NextResponse.json({ error: 'booking_id es requerido' }, { status: 400 });
      }

      const { data: booking, error: bookingError } = await supabase
        .from('zeus_bookings')
        .select('id, payment_status, service_name')
        .eq('id', booking_id)
        .single();

      if (bookingError || !booking) {
        return NextResponse.json({ error: 'No encontramos la reserva a cobrar' }, { status: 404 });
      }

      if (booking.payment_status === 'paid') {
        return NextResponse.json({ error: 'Esta reserva ya fue pagada' }, { status: 409 });
      }

      payment = await createMercadoPagoCardPayment({
        amount: sanitizedAmount,
        description: `Reserva: ${booking.service_name || item_name || 'Servicio Zeus'}`,
        token,
        paymentMethodId: String(payment_method_id),
        installments: Number(installments),
        issuerId: issuer_id ? Number(issuer_id) : null,
        clientName: client_name,
        clientEmail: String(client_email).trim().toLowerCase(),
        clientWhatsapp: client_whatsapp || null,
        identificationType: identification_type,
        identificationNumber: identification_number,
        externalReference: getServiceExternalReference(String(booking_id)),
        notificationUrl: `${baseUrl}/api/zeus/payments/webhook/mercadopago`,
        metadata: {
          type: 'service',
          booking_id: String(booking_id),
        },
        items: [{
          id: String(booking_id),
          title: `Servicio: ${booking.service_name || item_name || 'Servicio Zeus'}`,
          quantity: 1,
          unit_price: sanitizedAmount,
          category_id: 'services',
        }],
      });

      const mappedStatus = parsePaymentStatus(payment?.status);
      await supabase
        .from('zeus_bookings')
        .update({
          payment_status: mappedStatus === 'approved' ? 'paid' : mappedStatus === 'failed' ? 'failed' : 'pending',
          payment_id: payment?.id ? String(payment.id) : null,
          payment_method: 'mercadopago_api',
          notes: `Pago Mercado Pago procesado - payment_id: ${payment?.id || 'unknown'} - status: ${payment?.status || 'unknown'}`,
        })
        .eq('id', booking_id);

      return NextResponse.json({
        success: mappedStatus !== 'failed',
        payment_id: payment?.id ? String(payment.id) : null,
        status: payment?.status || 'unknown',
        status_detail: payment?.status_detail || null,
        redirect_url: `${baseUrl}/checkout/success?booking_id=${encodeURIComponent(String(booking_id))}&payment_id=${encodeURIComponent(String(payment?.id || ''))}&provider=mercadopago`,
      });
    }

    if (type !== 'product' || !product_id) {
      return NextResponse.json({ error: 'product_id es requerido' }, { status: 400 });
    }

    payment = await createMercadoPagoCardPayment({
      amount: sanitizedAmount,
      description: String(item_name || 'Producto Zeus'),
      token,
      paymentMethodId: String(payment_method_id),
      installments: Number(installments),
      issuerId: issuer_id ? Number(issuer_id) : null,
      clientName: client_name,
      clientEmail: String(client_email).trim().toLowerCase(),
      clientWhatsapp: client_whatsapp || null,
      identificationType: identification_type,
      identificationNumber: identification_number,
      externalReference: getProductExternalReference(String(product_id), String(client_email)),
      notificationUrl: `${baseUrl}/api/zeus/payments/webhook/mercadopago`,
      metadata: {
        type: 'product',
        product_id: String(product_id),
      },
      items: [{
        id: String(product_id),
        title: String(item_name || 'Producto Zeus'),
        quantity: 1,
        unit_price: sanitizedAmount,
        category_id: 'digital_goods',
      }],
    });

    return NextResponse.json({
      success: parsePaymentStatus(payment?.status) !== 'failed',
      payment_id: payment?.id ? String(payment.id) : null,
      status: payment?.status || 'unknown',
      status_detail: payment?.status_detail || null,
      redirect_url: `${baseUrl}/checkout/success?type=product&product_id=${encodeURIComponent(String(product_id))}&client_email=${encodeURIComponent(String(client_email).trim().toLowerCase())}&payment_id=${encodeURIComponent(String(payment?.id || ''))}&provider=mercadopago`,
    });
  } catch (error: any) {
    console.error('[MercadoPagoProcess] Error:', error?.message || error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
