/**
 * zeleri.ts — Cliente para la API Zeleri (pasarela de pago chilena)
 *
 * Documentación: https://sandbox-zeleri.dev.ionix.cl/docs-integration
 * Autenticación: JWT Bearer + firma HMAC-SHA256 por request
 */

import crypto from 'crypto';

function sanitizeEnv(value: string | undefined, fallback = '') {
  const raw = (value ?? fallback).trim();
  const withoutWrappingQuotes = raw.replace(/^['"]+|['"]+$/g, '');
  return withoutWrappingQuotes.trim();
}

const ZELERI_BASE_URL = sanitizeEnv(
  process.env.ZELERI_BASE_URL,
  'https://sandbox-zeleri.dev.ionix.cl/integration-kit'
).replace(/\/+$/, '');

const ZELERI_TOKEN = sanitizeEnv(process.env.ZELERI_TOKEN);
const ZELERI_SECRET = sanitizeEnv(process.env.ZELERI_SECRET);

/**
 * Genera la firma HMAC-SHA256 requerida por Zeleri.
 * Para requests JSON: firmar el objeto sin el campo "signature".
 * Para GET con query string: firmar el string directamente.
 */
export function zeleriSign(data: Record<string, unknown> | string): string {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHmac('sha256', ZELERI_SECRET).update(payload).digest('hex');
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ZeleriOrderParams {
  title: string;
  description: string;
  amount: number;                          // CLP (mínimo 1000, máximo 7000000)
  customer: { email: string; name: string };
  successUrl: string;
  failureUrl: string;
  commerceOrder?: string;                  // Referencia interna del comercio
  commerceReference?: string;
  gatewayId?: number;                      // 4 = Zeleri Pay (requerido por Zeus)
  sessionTtl?: number;                     // 90-300 seg, obligatorio si gatewayId=4
}

export interface ZeleriOrderResponse {
  code: string;
  data: {
    token: string;
    url: string;           // URL a la que redirigir al usuario
    order_id: number;
    commerce_order: string;
    signature: string;
  };
  message: string;
  signature: string;
}

export interface ZeleriOrderDetail {
  code: string;
  data: {
    order_id: number;
    status: string;        // e.g. "paid", "approved", "pending", "failed"
    amount: number;
    currency_id: number;
    commerce_order?: string;
    [key: string]: unknown;
  };
  signature: string;
}

// ---------------------------------------------------------------------------
// Crear orden de pago (oneshot checkout)
// ---------------------------------------------------------------------------

export async function createZeleriOrder(params: ZeleriOrderParams): Promise<ZeleriOrderResponse> {
  if (!ZELERI_TOKEN)  throw new Error('ZELERI_TOKEN no configurado');
  if (!ZELERI_SECRET) throw new Error('ZELERI_SECRET no configurado');

  // Construir cuerpo SIN el campo signature
  const body: Record<string, unknown> = {
    title:       params.title,
    description: params.description,
    currency_id: 1,           // CLP
    amount:      params.amount,
    customer:    params.customer,
    success_url: params.successUrl,
    failure_url: params.failureUrl,
    gateway_id:  params.gatewayId  ?? 4,
    session_ttl: params.sessionTtl ?? 300,
  };

  if (params.commerceOrder)     body.commerce_order     = params.commerceOrder;
  if (params.commerceReference) body.commerce_reference = params.commerceReference;

  // Firma del body (sin incluir "signature" en el cálculo)
  body.signature = zeleriSign(body);

  const res = await fetch(`${ZELERI_BASE_URL}/v1/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZELERI_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || `Zeleri error ${res.status}`);
  }

  return json as ZeleriOrderResponse;
}

// ---------------------------------------------------------------------------
// Consultar detalle de una orden (para verificación post-pago)
// ---------------------------------------------------------------------------

export async function getZeleriOrderDetail(orderId: number): Promise<ZeleriOrderDetail> {
  if (!ZELERI_TOKEN)  throw new Error('ZELERI_TOKEN no configurado');
  if (!ZELERI_SECRET) throw new Error('ZELERI_SECRET no configurado');

  const qs        = `id=${orderId}`;
  const signature = zeleriSign(qs);

  const res = await fetch(`${ZELERI_BASE_URL}/v1/orders/detail?${qs}&signature=${signature}`, {
    headers: { 'Authorization': `Bearer ${ZELERI_TOKEN}` },
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || `Zeleri detail error ${res.status}`);
  }

  return json as ZeleriOrderDetail;
}

/**
 * Devuelve true si el estado de la orden indica pago confirmado.
 * Se cubren los posibles valores que Zeleri podría devolver.
 */
export function isZeleriPaid(detail: ZeleriOrderDetail): boolean {
  const status = (detail.data?.status || '').toLowerCase();
  return status === 'paid' || status === 'approved' || status === 'completed';
}

// ---------------------------------------------------------------------------
// Enrolamiento de tarjetas (flujo inline — "a la antigua")
// ---------------------------------------------------------------------------

export interface ZeleriEnrollmentParams {
  customerName:  string;
  customerEmail: string;
  customerPhone: string;
}

export interface ZeleriEnrollmentResponse {
  code: string;
  data: { url_enrollment: string };
  message: string;
  signature: string;
}

export interface ZeleriCard {
  id:          string;
  last_four:   string;
  brand:       string;
  type:        string; // credit | debit
  holder:      string;
  is_favorite: boolean;
}

export interface ZeleriCardListResponse {
  code: string;
  data: { cards: ZeleriCard[] };
  message: string;
  signature: string;
}

export interface ZeleriEnrollmentOrderParams {
  cardId:             string;
  title:              string;
  description:        string;
  amount:             number;
  commerceOrder?:     string;
  commerceReference?: string;
}

export interface ZeleriEnrollmentOrderResponse {
  code: string;
  data: {
    order_id:      number;
    card_data:     Record<string, unknown>;
    commerce_order: string;
  };
  message: string;
  signature: string;
}

export interface ZeleriConfirmOrderResponse {
  code: string;
  data: Record<string, unknown>;
  message: string;
  signature: string;
}

/**
 * Crea un enrollment en Zeleri.
 * Devuelve url_enrollment → mostrar en iframe para que el usuario ingrese tarjeta.
 */
export async function createZeleriEnrollment(
  params: ZeleriEnrollmentParams,
): Promise<ZeleriEnrollmentResponse> {
  if (!ZELERI_TOKEN)  throw new Error('ZELERI_TOKEN no configurado');
  if (!ZELERI_SECRET) throw new Error('ZELERI_SECRET no configurado');

  const body: Record<string, unknown> = {
    customer_name:  params.customerName,
    customer_email: params.customerEmail,
    customer_phone: params.customerPhone,
  };
  body.signature = zeleriSign(body);

  const res = await fetch(`${ZELERI_BASE_URL}/v1/enrollments/zeleri/enrollments`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${ZELERI_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Zeleri enrollment error ${res.status}`);
  return json as ZeleriEnrollmentResponse;
}

/**
 * Lista las tarjetas enroladas de un cliente por email.
 * Usado post-iframe para obtener el card_id de la tarjeta recién registrada.
 */
export async function listZeleriCards(customerEmail: string): Promise<ZeleriCardListResponse> {
  if (!ZELERI_TOKEN)  throw new Error('ZELERI_TOKEN no configurado');
  if (!ZELERI_SECRET) throw new Error('ZELERI_SECRET no configurado');

  const qs        = `customer_email=${encodeURIComponent(customerEmail)}`;
  const signature = zeleriSign(qs);

  const res = await fetch(
    `${ZELERI_BASE_URL}/v1/enrollments/zeleri/enrollments?${qs}&signature=${signature}`,
    { headers: { 'Authorization': `Bearer ${ZELERI_TOKEN}` } },
  );

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Zeleri cards error ${res.status}`);
  return json as ZeleriCardListResponse;
}

/**
 * Crea una orden de pago usando una tarjeta enrolada.
 */
export async function createZeleriEnrollmentOrder(
  params: ZeleriEnrollmentOrderParams,
): Promise<ZeleriEnrollmentOrderResponse> {
  if (!ZELERI_TOKEN)  throw new Error('ZELERI_TOKEN no configurado');
  if (!ZELERI_SECRET) throw new Error('ZELERI_SECRET no configurado');

  const body: Record<string, unknown> = {
    card_id:     params.cardId,
    title:       params.title,
    description: params.description,
    amount:      params.amount,
  };
  if (params.commerceOrder)     body.commerce_order     = params.commerceOrder;
  if (params.commerceReference) body.commerce_reference = params.commerceReference;
  body.signature = zeleriSign(body);

  const res = await fetch(`${ZELERI_BASE_URL}/v1/enrollments/zeleri/orders`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${ZELERI_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Zeleri enrollment order error ${res.status}`);
  return json as ZeleriEnrollmentOrderResponse;
}

/**
 * Confirma (cobra) una orden creada con tarjeta enrolada.
 */
export async function confirmZeleriEnrollmentOrder(
  orderId:       number,
  customerEmail: string,
): Promise<ZeleriConfirmOrderResponse> {
  if (!ZELERI_TOKEN)  throw new Error('ZELERI_TOKEN no configurado');
  if (!ZELERI_SECRET) throw new Error('ZELERI_SECRET no configurado');

  const body: Record<string, unknown> = {
    order_id:       orderId,
    customer_email: customerEmail,
  };
  body.signature = zeleriSign(body);

  const res = await fetch(`${ZELERI_BASE_URL}/v1/enrollments/zeleri/orders/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${ZELERI_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || `Zeleri confirm error ${res.status}`);
  return json as ZeleriConfirmOrderResponse;
}
