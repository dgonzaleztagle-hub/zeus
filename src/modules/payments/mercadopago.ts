import { getMercadoPagoPayment, isMercadoPagoApproved } from '@/lib/mercadopago';
import { getServiceExternalReference } from '@/lib/payments';

type SupabaseLike = any;

export function parseMercadoPagoBookingStatus(status: string | null | undefined) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'approved') return 'paid';
  if (normalized === 'in_process' || normalized === 'pending') return 'pending';
  return 'failed';
}

export function getMercadoPagoNotificationUrl(baseUrl: string) {
  return baseUrl.includes('localhost')
    ? undefined
    : `${baseUrl}/api/zeus/payments/webhook/mercadopago`;
}

export function normalizeMercadoPagoClientEmail(baseUrl: string, email: string) {
  const normalized = String(email || '').trim().toLowerCase();
  return baseUrl.includes('localhost')
    ? 'checkout.bricks@example.com'
    : normalized;
}

export function extractMercadoPagoPaymentId(payload: any, searchParams: URLSearchParams): string | null {
  return String(
    payload?.data?.id ||
    payload?.id ||
    searchParams.get('data.id') ||
    searchParams.get('id') ||
    '',
  ).trim() || null;
}

export function extractMercadoPagoTopic(payload: any, searchParams: URLSearchParams): string {
  return String(
    payload?.type ||
    payload?.topic ||
    searchParams.get('type') ||
    searchParams.get('topic') ||
    '',
  ).trim().toLowerCase();
}

export function extractBookingIdFromServiceReference(externalReference: string): string | null {
  const [scope, bookingId] = String(externalReference || '').split('|');
  if (scope !== 'service' || !bookingId) return null;
  return bookingId;
}

export async function resolveMercadoPagoServicePayment(params: {
  bookingId: string;
  paymentId?: string | null;
}) {
  return params.paymentId
    ? getMercadoPagoPayment(params.paymentId)
    : getMercadoPagoPaymentByReference(params.bookingId);
}

async function getMercadoPagoPaymentByReference(bookingId: string) {
  const { findMercadoPagoPaymentByExternalReference } = await import('@/lib/mercadopago');
  return findMercadoPagoPaymentByExternalReference(getServiceExternalReference(String(bookingId)));
}

export async function syncMercadoPagoBooking(params: {
  supabase: SupabaseLike;
  bookingId: string;
  paymentId: string;
}) {
  const payment = await getMercadoPagoPayment(params.paymentId);
  const nextStatus = parseMercadoPagoBookingStatus(payment?.status);

  const { error } = await params.supabase
    .from('zeus_bookings')
    .update({
      payment_status: nextStatus,
      payment_id: String(payment?.id || params.paymentId),
      notes: `Webhook Mercado Pago sincronizado - payment_id: ${payment?.id || params.paymentId} - status: ${payment?.status || 'unknown'}`,
    })
    .eq('id', params.bookingId);

  if (error) throw error;

  return {
    payment,
    nextStatus,
  };
}

export async function verifyAndSyncMercadoPagoBooking(params: {
  supabase: SupabaseLike;
  bookingId: string;
  paymentId?: string | null;
}) {
  const payment = await resolveMercadoPagoServicePayment({
    bookingId: params.bookingId,
    paymentId: params.paymentId,
  });

  const approved = isMercadoPagoApproved(payment?.status);

  if (!approved || !payment?.id) {
    return {
      verified: false,
      status: String(payment?.status || 'pending'),
      provider: 'mercadopago' as const,
    };
  }

  const { error } = await params.supabase
    .from('zeus_bookings')
    .update({
      payment_status: 'paid',
      payment_id: String(payment.id),
      notes: `Pago confirmado por Mercado Pago - payment_id: ${payment.id}`,
    })
    .eq('id', params.bookingId);

  if (error) throw error;

  return {
    verified: true,
    status: 'paid',
    provider: 'mercadopago' as const,
    payment,
  };
}
