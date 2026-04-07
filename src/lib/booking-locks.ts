import { findMercadoPagoPaymentByExternalReference, isMercadoPagoApproved } from '@/lib/mercadopago';
import { getServiceExternalReference } from '@/lib/payments';
import { getZeleriOrderDetail, isZeleriPaid } from '@/lib/zeleri';

const PENDING_HOLD_MINUTES = 30;

type BookingLike = {
  id: string;
  payment_status: string;
  payment_method?: string | null;
  payment_id?: string | null;
  created_at: string;
  booking_slot?: string | null;
  client_email?: string | null;
};

function isExpiredPending(booking: BookingLike) {
  const createdAt = new Date(booking.created_at).getTime();
  const cutoff = Date.now() - PENDING_HOLD_MINUTES * 60 * 1000;
  return Number.isFinite(createdAt) && createdAt < cutoff;
}

async function markBookingStatus(
  supabase: any,
  bookingId: string,
  status: 'paid' | 'failed',
  notes: string,
) {
  await supabase
    .from('zeus_bookings')
    .update({
      payment_status: status,
      notes,
    })
    .eq('id', bookingId);
}

async function reconcileExpiredPendingBooking(supabase: any, booking: BookingLike): Promise<BookingLike> {
  if (booking.payment_status !== 'pending') {
    return booking;
  }

  if (!isExpiredPending(booking)) {
    return booking;
  }

  if (booking.payment_method === 'mercadopago_checkout_pro') {
    try {
      const payment = await findMercadoPagoPaymentByExternalReference(getServiceExternalReference(booking.id));
      const remoteStatus = String(payment?.status || 'pending');

      if (payment?.id && isMercadoPagoApproved(remoteStatus)) {
        await supabase
          .from('zeus_bookings')
          .update({
            payment_status: 'paid',
            payment_id: String(payment.id),
            notes: `Pago confirmado al reconciliar pendiente expirada con Mercado Pago - payment_id: ${payment.id} - status: ${remoteStatus}`,
          })
          .eq('id', booking.id);

        return {
          ...booking,
          payment_status: 'paid',
          payment_id: String(payment.id),
        };
      }

      await markBookingStatus(
        supabase,
        booking.id,
        'failed',
        `Reserva liberada por expiracion de pendiente - Mercado Pago - status: ${remoteStatus}`,
      );

      return {
        ...booking,
        payment_status: 'failed',
      };
    } catch (error: any) {
      console.error('[BookingLocks] No se pudo reconciliar booking MP pendiente:', booking.id, error?.message || error);
      return booking;
    }
  }

  const orderId = booking.payment_id ? Number.parseInt(String(booking.payment_id), 10) : null;

  if (!orderId) {
    await markBookingStatus(
      supabase,
      booking.id,
      'failed',
      'Reserva pendiente expirada sin orden de pago asociada.',
    );

    return {
      ...booking,
      payment_status: 'failed',
    };
  }

  try {
    const detail = await getZeleriOrderDetail(orderId);
    const paid = isZeleriPaid(detail);
    const remoteStatus = String(detail.data?.status || 'pending');

    if (paid) {
      await markBookingStatus(
        supabase,
        booking.id,
        'paid',
        `Pago confirmado al reconciliar pendiente expirada con Zeleri - order_id: ${orderId} - status: ${remoteStatus}`,
      );

      return {
        ...booking,
        payment_status: 'paid',
      };
    }

    await markBookingStatus(
      supabase,
      booking.id,
      'failed',
      `Reserva liberada por expiracion de pendiente - order_id: ${orderId} - status_zeleri: ${remoteStatus}`,
    );

    return {
      ...booking,
      payment_status: 'failed',
    };
  } catch (error: any) {
    console.error('[BookingLocks] No se pudo reconciliar booking pendiente:', booking.id, error?.message || error);
    return booking;
  }
}

export async function reconcileAndClassifyBookings(supabase: any, bookings: BookingLike[]) {
  const normalized: BookingLike[] = [];

  for (const booking of bookings) {
    normalized.push(await reconcileExpiredPendingBooking(supabase, booking));
  }

  const blocking = normalized.filter((booking) => booking.payment_status === 'paid' || booking.payment_status === 'pending');

  return {
    normalized,
    blocking,
  };
}
