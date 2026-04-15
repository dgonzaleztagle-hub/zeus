export type PaymentProvider = 'zeleri' | 'mercadopago';
export type PaymentMode = 'iframe' | 'redirect' | 'embedded';

function normalizePaymentProvider(value?: string | null): PaymentProvider | null {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'mercadopago') return 'mercadopago';
  if (raw === 'zeleri') return 'zeleri';
  return null;
}

export function getActivePaymentProvider(): PaymentProvider {
  return normalizePaymentProvider(process.env.PAYMENT_PROVIDER) || 'mercadopago';
}

export function getPaymentMode(provider: PaymentProvider): PaymentMode {
  return provider === 'mercadopago' ? 'embedded' : 'iframe';
}

export function isZeleriConfigured() {
  return Boolean(
    String(process.env.ZELERI_TOKEN || '').trim() &&
    String(process.env.ZELERI_SECRET || '').trim(),
  );
}

export function isZeleriFallbackEnabled() {
  const flag = String(process.env.ZEUS_ENABLE_ZELERI_FALLBACK || '').trim().toLowerCase();
  return getActivePaymentProvider() === 'zeleri' || flag === 'true' || isZeleriConfigured();
}

export function resolveRequestedPaymentProvider(requested?: string | null): PaymentProvider {
  const normalizedRequested = normalizePaymentProvider(requested);

  if (normalizedRequested === 'zeleri' && isZeleriFallbackEnabled()) {
    return 'zeleri';
  }

  if (normalizedRequested === 'mercadopago') {
    return 'mercadopago';
  }

  return getActivePaymentProvider();
}

export function getServiceExternalReference(bookingId: string) {
  return `service|${bookingId}`;
}

export function getProductExternalReference(productId: string, clientEmail: string) {
  return `product|${productId}|${clientEmail.trim().toLowerCase()}`;
}
