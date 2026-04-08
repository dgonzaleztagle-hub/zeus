import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { createMercadoPagoCardPayment } from '@/lib/mercadopago';
import {
  getMercadoPagoNotificationUrl,
  normalizeMercadoPagoClientEmail,
  parseMercadoPagoBookingStatus,
} from '@/modules/payments/mercadopago';
import {
  getProductExternalReference,
  getServiceExternalReference,
} from '@/lib/payments';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!,
);

async function writeDebugLog(label: string, payload: unknown) {
  try {
    const dir = path.join(process.cwd(), '.codex-debug');
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, 'mercadopago-process.log');
    const entry = `[${new Date().toISOString()}] ${label}\n${JSON.stringify(payload, null, 2)}\n\n`;
    await appendFile(file, entry, 'utf8');
  } catch (error) {
    console.error('[MercadoPagoProcess] No se pudo escribir log debug:', error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const brick = body?.brick || {};
    const {
      type,
      booking_id,
      product_id,
      item_name,
      amount,
      client_name,
      client_email,
      client_whatsapp,
      token = brick.token,
      payment_method_id = brick.payment_method_id || brick.paymentMethodId,
      issuer_id = brick.issuer_id || brick.issuerId,
      installments = brick.installments,
      identification_type = brick?.payer?.identification?.type || brick.identificationType,
      identification_number = brick?.payer?.identification?.number || brick.identificationNumber,
    } = body || {};

    if (!type || !amount || !client_name || !client_email || !token || !payment_method_id || !installments) {
      return NextResponse.json({ error: 'Faltan datos para procesar el pago' }, { status: 400 });
    }

    const host = request.headers.get('host') || 'asesoriaszeus.cl';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    const notificationUrl = getMercadoPagoNotificationUrl(baseUrl);
    const normalizedClientEmail = normalizeMercadoPagoClientEmail(baseUrl, client_email);
    const sanitizedAmount = Number(amount);

    if (Number.isNaN(sanitizedAmount) || sanitizedAmount < 1) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    const debugPayload = {
      type,
      booking_id,
      product_id,
      amount: sanitizedAmount,
      client_email: normalizedClientEmail,
      payment_method_id,
      issuer_id,
      installments,
      identification_type,
      identification_number,
      brick,
    };

    console.log('[MercadoPagoProcess] Incoming payload:', JSON.stringify(debugPayload, null, 2));
    await writeDebugLog('incoming_payload', debugPayload);

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
        clientEmail: normalizedClientEmail,
        clientWhatsapp: client_whatsapp || null,
        identificationType: identification_type || 'RUT',
        identificationNumber: identification_number || '11111111',
        externalReference: getServiceExternalReference(String(booking_id)),
        notificationUrl,
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

      const mappedStatus = parseMercadoPagoBookingStatus(payment?.status);
      await supabase
        .from('zeus_bookings')
        .update({
          payment_status: mappedStatus,
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
      clientEmail: normalizedClientEmail,
      clientWhatsapp: client_whatsapp || null,
      identificationType: identification_type || 'RUT',
      identificationNumber: identification_number || '11111111',
      externalReference: getProductExternalReference(String(product_id), normalizedClientEmail),
      notificationUrl,
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
      success: parseMercadoPagoBookingStatus(payment?.status) !== 'failed',
      payment_id: payment?.id ? String(payment.id) : null,
      status: payment?.status || 'unknown',
      status_detail: payment?.status_detail || null,
      redirect_url: `${baseUrl}/checkout/success?type=product&product_id=${encodeURIComponent(String(product_id))}&client_email=${encodeURIComponent(normalizedClientEmail)}&payment_id=${encodeURIComponent(String(payment?.id || ''))}&provider=mercadopago`,
    });
  } catch (error: any) {
    console.error('[MercadoPagoProcess] Error message:', error?.message || error);
    console.error('[MercadoPagoProcess] Error cause:', JSON.stringify(error?.cause || null, null, 2));
    console.error('[MercadoPagoProcess] Full error:', error);
    await writeDebugLog('error', {
      message: error?.message || String(error),
      cause: error?.cause || null,
      stack: error?.stack || null,
    });

    const debugMessage =
      error?.cause?.[0]?.description ||
      error?.cause?.[0]?.message ||
      error?.message ||
      'Error interno';

    return NextResponse.json({ error: debugMessage }, { status: 500 });
  }
}
