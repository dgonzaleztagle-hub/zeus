import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createZeleriEnrollmentOrder, confirmZeleriEnrollmentOrder } from '@/lib/zeleri';
import { issueDownloadToken } from '@/modules/digital-access/tokens';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/zeus/enroll/pay
 *
 * Paso final del flujo inline:
 * 1. Crea una orden en Zeleri con la tarjeta enrolada.
 * 2. Confirma el cobro.
 * 3. Actualiza BD según tipo (servicio → booking paid, producto → token descarga).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      card_id,
      customer_email,
      type,         // 'service' | 'product'
      item_id,
      item_name,
      amount,
      booking_id,  // solo si type === 'service'
    } = body;

    if (!card_id || !customer_email || !type || !amount || !item_name) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sanitizedAmount = Number(amount);
    if (isNaN(sanitizedAmount) || sanitizedAmount < 1000) {
      return NextResponse.json({ error: 'Monto inválido (mínimo $1.000)' }, { status: 400 });
    }

    // 1. Crear orden con tarjeta enrolada
    const orderResult = await createZeleriEnrollmentOrder({
      cardId:           card_id,
      title:            item_name,
      description:      `Pago por ${item_name}`,
      amount:           sanitizedAmount,
      commerceOrder:    booking_id?.toString() || item_id?.toString(),
      commerceReference: customer_email,
    });

    const zeleriOrderId = orderResult.data.order_id;

    // 2. Confirmar cobro
    await confirmZeleriEnrollmentOrder(zeleriOrderId, customer_email);

    // 3a. Servicio → actualizar reserva a pagada
    if (type === 'service' && booking_id) {
      const { error: updateError } = await supabase
        .from('zeus_bookings')
        .update({
          payment_status: 'paid',
          payment_id:     zeleriOrderId.toString(),
          notes:          `Pago confirmado vía enrollment — order_id: ${zeleriOrderId}`,
        })
        .eq('id', booking_id);

      if (updateError) {
        console.error('[EnrollPay] Error actualizando reserva:', updateError);
        // No lanzamos error: el pago ya se cobró, solo falló la actualización
      }
    }

    // 3b. Producto → generar token de descarga
    let downloadToken: string | null = null;

    if (type === 'product' && item_id) {
      try {
        const issued = await issueDownloadToken({
          supabase,
          productId: item_id,
          clientEmail: customer_email,
          expiresInMinutes: 30,
        });
        downloadToken = issued.token;
      } catch (tokenError) {
        console.error('[EnrollPay] Error generando token:', tokenError);
      }
    }

    return NextResponse.json({
      success:        true,
      order_id:       zeleriOrderId,
      download_token: downloadToken,
    });

  } catch (error: any) {
    console.error('[EnrollPay] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Error al procesar el pago' }, { status: 500 });
  }
}
