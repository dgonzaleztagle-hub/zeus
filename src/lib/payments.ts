export type PaymentProvider = 'zeleri' | 'mercadopago';
export type PaymentMode = 'iframe' | 'redirect';

export function getActivePaymentProvider(): PaymentProvider {
  const raw = (process.env.PAYMENT_PROVIDER || 'zeleri').trim().toLowerCase();
  return raw === 'mercadopago' ? 'mercadopago' : 'zeleri';
}

export function getPaymentMode(provider: PaymentProvider): PaymentMode {
  return provider === 'mercadopago' ? 'redirect' : 'iframe';
}

export function getServiceExternalReference(bookingId: string) {
  return `service|${bookingId}`;
}

export function getProductExternalReference(productId: string, clientEmail: string) {
  return `product|${productId}|${clientEmail.trim().toLowerCase()}`;
}
