import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { v4 as uuidv4 } from 'uuid';

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
    console.log('MercadoPago Webhook received:', body);

    if (body.type === 'payment' || body.topic === 'payment') {
      const paymentId = body.data?.id || body.id;
      if (!paymentId) return NextResponse.json({ error: 'No ID' }, { status: 400 });

      const payment = new Payment(client);
      const paymentData = await payment.get({ id: paymentId });
      const status = paymentData.status;
      const externalReference = paymentData.external_reference; // 'booking_ID' o 'product_ID_TIMESTAMP'

      if (status === 'approved' && externalReference) {
        if (externalReference.startsWith('booking_')) {
          // 1. Manejar Reserva de Agenda
          const bookingId = externalReference.replace('booking_', '');
          await supabase
            .from('zeus_bookings')
            .update({ 
              payment_status: 'paid',
              payment_id: paymentId.toString(),
              notes: `Pago aprobado via Mercado Pago (ID: ${paymentId})`
            })
            .eq('id', bookingId);
        } 
        else if (externalReference.startsWith('product_')) {
          // 2. Manejar Producto Digital
          const parts = externalReference.split('_');
          const productId = parts[1];
          const clientEmail = paymentData.metadata?.client_email || paymentData.payer?.email;

          // Generar token de descarga de 24 horas
          const token = uuidv4();
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);

          const { error: tError } = await supabase
            .from('zeus_download_tokens')
            .insert({
              product_id: productId,
              token: token,
              expires_at: expiresAt.toISOString(),
              client_email: clientEmail
            });

          if (tError) {
            console.error('Error generating download token:', tError);
          } else {
            console.log(`Download token ${token} generated for product ${productId}`);
            // TODO: Podríamos enviar un email al cliente aquí si estuviera configurado nodemailer/resend
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
