import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import {
  getProductExternalReference,
  getServiceExternalReference,
} from '@/lib/payments';

const MERCADOPAGO_ACCESS_TOKEN = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();

function getClient() {
  if (!MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado');
  }

  return new MercadoPagoConfig({
    accessToken: MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 5000 },
  });
}

export function isMercadoPagoApproved(status: string | null | undefined) {
  return String(status || '').toLowerCase() === 'approved';
}

function splitClientName(fullName: string) {
  const trimmed = String(fullName || '').trim();
  if (!trimmed) {
    return { firstName: '', lastName: '' };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: trimmed, lastName: '' };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.slice(-1).join(' '),
  };
}

export async function createMercadoPagoServicePreference(params: {
  bookingId: string;
  serviceName: string;
  amount: number;
  clientName: string;
  clientEmail: string;
  clientWhatsapp?: string | null;
  baseUrl: string;
}) {
  const preference = new Preference(getClient());

  const response = await preference.create({
    body: {
      items: [{
        id: params.bookingId,
        title: `Servicio: ${params.serviceName}`,
        quantity: 1,
        unit_price: Number(params.amount),
        currency_id: 'CLP',
      }],
      payer: {
        name: params.clientName,
        email: params.clientEmail,
        phone: { number: params.clientWhatsapp || '' },
      },
      back_urls: {
        success: `${params.baseUrl}/checkout/success?booking_id=${params.bookingId}&provider=mercadopago`,
        failure: `${params.baseUrl}/checkout/error?booking_id=${params.bookingId}&provider=mercadopago`,
        pending: `${params.baseUrl}/checkout/success?booking_id=${params.bookingId}&pending=true&provider=mercadopago`,
      },
      auto_return: 'approved',
      external_reference: getServiceExternalReference(params.bookingId),
      notification_url: `${params.baseUrl}/api/zeus/payments/webhook/mercadopago`,
    },
  });

  return response;
}

export async function createMercadoPagoProductPreference(params: {
  productId: string;
  itemName: string;
  amount: number;
  clientName: string;
  clientEmail: string;
  clientWhatsapp?: string | null;
  baseUrl: string;
}) {
  const preference = new Preference(getClient());
  const externalReference = getProductExternalReference(params.productId, params.clientEmail);

  const response = await preference.create({
    body: {
      items: [{
        id: params.productId,
        title: params.itemName,
        quantity: 1,
        unit_price: Number(params.amount),
        currency_id: 'CLP',
      }],
      payer: {
        name: params.clientName,
        email: params.clientEmail,
        phone: { number: params.clientWhatsapp || '' },
      },
      back_urls: {
        success: `${params.baseUrl}/checkout/success?type=product&product_id=${encodeURIComponent(params.productId)}&client_email=${encodeURIComponent(params.clientEmail)}&provider=mercadopago`,
        failure: `${params.baseUrl}/checkout/error?type=product&product_id=${encodeURIComponent(params.productId)}&client_email=${encodeURIComponent(params.clientEmail)}&provider=mercadopago`,
        pending: `${params.baseUrl}/checkout/success?type=product&product_id=${encodeURIComponent(params.productId)}&client_email=${encodeURIComponent(params.clientEmail)}&pending=true&provider=mercadopago`,
      },
      auto_return: 'approved',
      external_reference: externalReference,
      notification_url: `${params.baseUrl}/api/zeus/payments/webhook/mercadopago`,
    },
  });

  return response;
}

type MercadoPagoCardPaymentParams = {
  amount: number;
  description: string;
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: number | null;
  clientName: string;
  clientEmail: string;
  clientWhatsapp?: string | null;
  identificationType: string;
  identificationNumber: string;
  externalReference: string;
  notificationUrl?: string;
  metadata?: Record<string, any>;
  items?: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    category_id?: string;
  }>;
};

export async function createMercadoPagoCardPayment(params: MercadoPagoCardPaymentParams) {
  const payment = new Payment(getClient());
  const { firstName, lastName } = splitClientName(params.clientName);

  return payment.create({
    body: {
      transaction_amount: Number(params.amount),
      token: params.token,
      description: params.description,
      installments: Number(params.installments),
      payment_method_id: params.paymentMethodId,
      issuer_id: params.issuerId ? Number(params.issuerId) : undefined,
      external_reference: params.externalReference,
      notification_url: params.notificationUrl,
      metadata: params.metadata,
      payer: {
        email: params.clientEmail,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        phone: params.clientWhatsapp
          ? { number: params.clientWhatsapp }
          : undefined,
        identification: {
          type: params.identificationType,
          number: params.identificationNumber,
        },
      },
      additional_info: params.items?.length
        ? {
            items: params.items,
          }
        : undefined,
    },
  });
}

export async function getMercadoPagoPayment(paymentId: string | number) {
  const payment = new Payment(getClient());
  return payment.get({ id: String(paymentId) });
}

export async function findMercadoPagoPaymentByExternalReference(externalReference: string) {
  const payment = new Payment(getClient());
  const result = await payment.search({
    options: {
      external_reference: externalReference,
      sort: 'date_created',
      criteria: 'desc',
    },
  });

  const payments = result.results || [];
  return payments[0] || null;
}
