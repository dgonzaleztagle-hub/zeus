'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MercadoPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'service' | 'product';
  itemId: string;
  itemName: string;
  amount: number;
  forcedProvider?: 'mercadopago' | 'zeleri';
  date?: string;
  slot?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
}

type ModalStep = 'form' | 'processing' | 'checkout' | 'error';
type PaymentMode = 'iframe' | 'redirect' | 'embedded';
type CheckoutContext = {
  bookingId?: string;
  orderId?: string;
  productId?: string;
  clientEmail?: string;
  paymentProvider?: string;
  paymentMode?: PaymentMode;
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: Record<string, any>) => any;
  }
}

const MERCADOPAGO_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '';
const MERCADOPAGO_SCRIPT_SRC = 'https://sdk.mercadopago.com/js/v2';
const LOCAL_MERCADOPAGO_TEST_EMAIL = 'checkout.bricks@example.com';

function loadMercadoPagoSdk() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Mercado Pago solo puede cargarse en el navegador.'));
  }

  if (window.MercadoPago) {
    return Promise.resolve();
  }

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${MERCADOPAGO_SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('No pudimos cargar el SDK de Mercado Pago.')), { once: true });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = MERCADOPAGO_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No pudimos cargar el SDK de Mercado Pago.'));
    document.head.appendChild(script);
  });
}

function waitForElement<T extends HTMLElement>(id: string, attempts = 20, delayMs = 50): Promise<T> {
  return new Promise((resolve, reject) => {
    let remaining = attempts;

    const check = () => {
      const element = document.getElementById(id) as T | null;
      if (element) {
        resolve(element);
        return;
      }

      remaining -= 1;
      if (remaining <= 0) {
        reject(new Error(`No encontramos el contenedor ${id}`));
        return;
      }

      window.setTimeout(check, delayMs);
    };

    check();
  });
}

export default function MercadoPagoModal({
  isOpen,
  onClose,
  type,
  itemId,
  itemName,
  amount,
  forcedProvider = 'mercadopago',
  date,
  slot,
  prefillName,
  prefillEmail,
  prefillPhone,
}: MercadoPagoModalProps) {
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const [step, setStep] = useState<ModalStep>('form');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [checkoutContext, setCheckoutContext] = useState<CheckoutContext | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkLoading, setSdkLoading] = useState(false);
  const [embeddedReady, setEmbeddedReady] = useState(false);
  const [isSubmittingEmbedded, setIsSubmittingEmbedded] = useState(false);
  const [form, setForm] = useState({
    name: prefillName || '',
    email: prefillEmail || '',
    phone: prefillPhone || '',
  });

  const mpRef = useRef<any>(null);
  const brickControllerRef = useRef<any>(null);
  const startCheckoutRef = useRef(false);
  const autoStartedRef = useRef(false);
  const embeddedInitKeyRef = useRef<string | null>(null);

  const hasPrefill = useMemo(() => Boolean(prefillName && prefillEmail), [prefillEmail, prefillName]);
  const brickContainerId = 'zeus-mp-card-payment-brick';
  const selectedProviderLabel = (checkoutContext?.paymentProvider || forcedProvider) === 'zeleri'
    ? 'Zeleri'
    : 'Mercado Pago';

  function resetEmbeddedState() {
    brickControllerRef.current?.unmount?.();

    if (typeof document !== 'undefined') {
      const element = document.getElementById(brickContainerId);
      if (element) {
        element.innerHTML = '';
      }
    }

    setSdkReady(false);
    setSdkLoading(false);
    setEmbeddedReady(false);
    setIsSubmittingEmbedded(false);
    mpRef.current = null;
    brickControllerRef.current = null;
    embeddedInitKeyRef.current = null;
  }

  useEffect(() => {
    if (!isOpen) return;
    setStep(hasPrefill ? 'processing' : 'form');
    setErrorMsg(null);
    setPaymentUrl(null);
    setCheckoutContext(null);
    setIsRecovering(false);
    startCheckoutRef.current = false;
    autoStartedRef.current = false;
    resetEmbeddedState();
    setForm({
      name: prefillName || '',
      email: prefillEmail || '',
      phone: prefillPhone || '',
    });
  }, [hasPrefill, isOpen, prefillEmail, prefillName, prefillPhone]);

  async function startCheckout(override?: { name?: string; email?: string; phone?: string }) {
    if (startCheckoutRef.current) {
      return;
    }

    const name = (override?.name ?? form.name).trim();
    const email = (override?.email ?? form.email).trim().toLowerCase();
    const phone = (override?.phone ?? form.phone).trim();

    if (!name || !email) {
      setErrorMsg('Por favor completa nombre y email');
      setStep('error');
      return;
    }

    if (amount < 1000) {
      setErrorMsg('Mercado Pago solo permite pagos desde $1.000 CLP');
      setStep('error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Email inválido');
      setStep('error');
      return;
    }

    setErrorMsg(null);
    setStep('processing');
    startCheckoutRef.current = true;

    try {
      const endpoint = type === 'service' ? '/api/zeus/book' : '/api/zeus/checkout';
      const payload = type === 'service'
        ? {
            service_id: itemId,
            service_name: itemName,
            amount,
            payment_provider: forcedProvider,
            client_name: name,
            client_email: email,
            client_whatsapp: phone || null,
            date,
            slot,
          }
        : {
            type: 'product',
            item_id: itemId,
            item_name: itemName,
            amount,
            payment_provider: forcedProvider,
            client_name: name,
            client_email: email,
            metadata: {
              client_whatsapp: phone || null,
            },
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo iniciar el checkout');
      }

      if (type === 'product') {
        window.sessionStorage.setItem(
          'zeus_pending_checkout',
          JSON.stringify({
            type: 'product',
            orderId: data.order_id,
            productId: itemId,
            clientEmail: email,
            itemName,
            amount,
            createdAt: Date.now(),
          }),
        );
      }

      setCheckoutContext({
        bookingId: data.booking_id ? String(data.booking_id) : undefined,
        orderId: data.order_id ? String(data.order_id) : undefined,
        productId: type === 'product' ? itemId : undefined,
        clientEmail: email,
        paymentProvider: data.payment_provider || 'mercadopago',
        paymentMode: data.payment_mode || 'iframe',
      });
      setPaymentUrl(data.payment_url || null);
      setStep('checkout');
    } catch (error: any) {
      setErrorMsg(error.message || 'Error al iniciar el pago');
      setStep('error');
    } finally {
      startCheckoutRef.current = false;
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    if (type !== 'service') return;
    if (!hasPrefill) return;
    if (step !== 'processing') return;
    if (autoStartedRef.current) return;

    autoStartedRef.current = true;
    startCheckout({
      name: prefillName,
      email: prefillEmail,
      phone: prefillPhone || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPrefill, isOpen, type, prefillName, prefillEmail, prefillPhone, step]);

  useEffect(() => {
    if (!isOpen) return;
    if (step !== 'checkout') return;
    if (checkoutContext?.paymentMode === 'redirect' && paymentUrl) {
      window.location.href = paymentUrl;
    }
  }, [checkoutContext?.paymentMode, isOpen, paymentUrl, step]);

  useEffect(() => {
    if (!isOpen) return;
    if (step !== 'checkout') return;
    if (checkoutContext?.paymentMode !== 'iframe') return;
    if (!checkoutContext?.orderId && !checkoutContext?.bookingId) return;

    const context = checkoutContext;
    let cancelled = false;

    async function pollPaymentStatus() {
      try {
        if (type === 'service' && context.bookingId) {
          const res = await fetch(`/api/zeus/payments/verify?booking_id=${context.bookingId}`, {
            cache: 'no-store',
          });
          const data = await res.json();

          if (!cancelled && data.verified) {
            window.location.href = `/checkout/success?booking_id=${context.bookingId}`;
          }
          return;
        }

        if (type === 'product' && context.orderId && context.productId) {
          const params = new URLSearchParams({
            order_id: context.orderId,
            product_id: context.productId,
          });

          if (context.clientEmail) {
            params.set('client_email', context.clientEmail);
          }

          const res = await fetch(`/api/zeus/payments/verify-product?${params.toString()}`, {
            cache: 'no-store',
          });
          const data = await res.json();

          if (!cancelled && data.verified) {
            window.location.href = `/checkout/success?type=product&product_id=${encodeURIComponent(context.productId)}&order_id=${encodeURIComponent(context.orderId)}&client_email=${encodeURIComponent(context.clientEmail || '')}`;
          }
        }
      } catch {
        // Mantener polling silencioso.
      }
    }

    pollPaymentStatus();
    const interval = window.setInterval(pollPaymentStatus, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [checkoutContext, isOpen, step, type]);

  useEffect(() => {
    if (!isOpen || step !== 'checkout') return;
    if (checkoutContext?.paymentProvider !== 'mercadopago') return;
    if (checkoutContext?.paymentMode !== 'embedded') return;

    const initKey = [
      checkoutContext?.bookingId || '',
      checkoutContext?.productId || '',
      checkoutContext?.clientEmail || '',
      amount,
    ].join('|');

    if (embeddedInitKeyRef.current === initKey && sdkReady) {
      return;
    }

    let cancelled = false;

    async function initMercadoPagoForm() {
      try {
        if (!MERCADOPAGO_PUBLIC_KEY) {
          throw new Error('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY no está configurado.');
        }

        setSdkLoading(true);
        await loadMercadoPagoSdk();

        if (cancelled) return;

        const mp = new window.MercadoPago!(MERCADOPAGO_PUBLIC_KEY, {
          locale: 'es-CL',
        });
        mpRef.current = mp;

        const container = await waitForElement<HTMLDivElement>(brickContainerId);
        container.innerHTML = '';

        const bricksBuilder = mp.bricks();
        brickControllerRef.current = await bricksBuilder.create(
          'cardPayment',
          brickContainerId,
          {
            initialization: {
              amount,
              payer: {
                email: isLocalhost
                  ? LOCAL_MERCADOPAGO_TEST_EMAIL
                  : checkoutContext?.clientEmail || form.email,
              },
            },
            customization: {
              paymentMethods: {
                maxInstallments: 1,
              },
              visual: {
                hideFormTitle: true,
                style: {
                  theme: 'dark',
                },
              },
            },
            callbacks: {
              onSubmit: (cardFormData: any) => {
                setIsSubmittingEmbedded(true);
                setErrorMsg(null);

                return fetch('/api/zeus/payments/mercadopago/process', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type,
                    booking_id: checkoutContext?.bookingId,
                    product_id: checkoutContext?.productId,
                    item_name: itemName,
                    amount,
                    client_name: form.name,
                    client_email: isLocalhost
                      ? LOCAL_MERCADOPAGO_TEST_EMAIL
                      : checkoutContext?.clientEmail || form.email,
                  client_whatsapp: form.phone || null,
                  brick: cardFormData,
                }),
                })
                  .then(async (response) => {
                    const data = await response.json();
                    if (!response.ok) {
                      throw new Error(data.error || 'No pudimos procesar el pago.');
                    }

                    if (data.status === 'approved' || data.status === 'in_process' || data.status === 'pending') {
                      window.location.href = data.redirect_url;
                      return;
                    }

                    throw new Error(data.status_detail || 'El pago fue rechazado. Revisa los datos e inténtalo de nuevo.');
                  })
                  .catch((error) => {
                    setErrorMsg(error.message || 'No pudimos procesar el pago.');
                    throw error;
                  })
                  .finally(() => {
                    setIsSubmittingEmbedded(false);
                  });
              },
              onReady: () => {
                setSdkReady(true);
                setEmbeddedReady(true);
                setErrorMsg(null);
              },
              onError: (error: any) => {
                console.error('[MercadoPagoModal] Brick error:', error);
                setErrorMsg('No pudimos cargar el formulario de Mercado Pago.');
              },
            },
          },
        );

        if (!cancelled) {
          embeddedInitKeyRef.current = initKey;
        }
      } catch (error: any) {
        console.error('[MercadoPagoModal] Error inicializando formulario:', error);
        if (!cancelled) {
          setErrorMsg(error.message || 'No se pudo cargar el formulario de Mercado Pago.');
        }
      } finally {
        if (!cancelled) {
          setSdkLoading(false);
        }
      }
    }

    initMercadoPagoForm();

    return () => {
      cancelled = true;
    };
  }, [amount, brickContainerId, checkoutContext?.bookingId, checkoutContext?.clientEmail, checkoutContext?.paymentMode, checkoutContext?.paymentProvider, checkoutContext?.productId, form.email, form.name, form.phone, isLocalhost, isOpen, sdkReady, step]);

  async function handleManualRecovery() {
    if (!checkoutContext) return;

    setIsRecovering(true);
    try {
      if (type === 'service' && checkoutContext.bookingId) {
        const res = await fetch(`/api/zeus/payments/verify?booking_id=${checkoutContext.bookingId}`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (data.verified) {
          window.location.href = `/checkout/success?booking_id=${checkoutContext.bookingId}`;
          return;
        }
      }

      if (type === 'product' && checkoutContext.orderId && checkoutContext.productId) {
        const params = new URLSearchParams({
          order_id: checkoutContext.orderId,
          product_id: checkoutContext.productId,
        });

        if (checkoutContext.clientEmail) {
          params.set('client_email', checkoutContext.clientEmail);
        }

        const res = await fetch(`/api/zeus/payments/verify-product?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (data.verified) {
          window.location.href = `/checkout/success?type=product&product_id=${encodeURIComponent(checkoutContext.productId)}&order_id=${encodeURIComponent(checkoutContext.orderId)}&client_email=${encodeURIComponent(checkoutContext.clientEmail || '')}`;
          return;
        }
      }

      setErrorMsg('Aún no vemos el pago confirmado. Si ya se hizo el cobro, espera unos segundos y vuelve a verificar.');
    } catch {
      setErrorMsg('No pudimos verificar el estado del pago en este momento.');
    } finally {
      setIsRecovering(false);
    }
  }

  const handleRetry = () => {
    setErrorMsg(null);
    setPaymentUrl(null);
    resetEmbeddedState();
    setStep(hasPrefill ? 'processing' : 'form');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="mercadopago-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(12px)' }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          key="mercadopago-modal-box"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-[#111118] border border-white/10 rounded-3xl overflow-hidden"
          style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center justify-between px-8 pt-8 pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">
                Checkout Seguro
              </p>
              <h2 className="text-lg font-black leading-tight">{itemName}</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black" style={{ color: '#0EA5E9' }}>
                ${amount.toLocaleString('es-CL')}
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="h-px bg-white/5 mx-8" />

          <div className="px-8 py-6">
            <AnimatePresence mode="wait">
              {step === 'form' && (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    startCheckout();
                  }}
                >
                  <p className="text-sm text-white/40 mb-6">
                    Prepararemos un checkout seguro dentro de Zeus para que completes el pago sin salir del sitio.
                  </p>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 font-black">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      placeholder="Juan Pérez"
                      value={form.name}
                      onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:border-[#0EA5E9] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 font-black">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.cl"
                      value={form.email}
                      onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:border-[#0EA5E9] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-white/30 font-black">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      placeholder="+56 9 1234 5678"
                      value={form.phone}
                      onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:border-[#0EA5E9] outline-none transition-all"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    className="w-full h-13 mt-2 py-4 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' }}
                  >
                    Continuar al pago
                  </button>
                </motion.form>
              )}

              {step === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 flex flex-col items-center gap-4"
                >
                  <div className="w-12 h-12 border-4 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-bold tracking-widest uppercase animate-pulse text-white/50 text-center">
                    Preparando checkout...
                  </p>
                  <p className="text-xs text-white/20 text-center">
                    {type === 'service'
                      ? `Estamos dejando tu reserva lista para cobrarla con ${selectedProviderLabel}.`
                      : `Estamos preparando tu compra para cobrarla con ${selectedProviderLabel}.`}
                  </p>
                </motion.div>
              )}

              {step === 'checkout' && (
                <motion.div
                  key="checkout"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {checkoutContext?.paymentMode === 'redirect' && paymentUrl ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4 text-center">
                      <p className="text-sm text-white/40">
                        Estamos abriendo el checkout seguro.
                      </p>
                      <a
                        href={paymentUrl}
                        className="block w-full py-4 rounded-xl font-bold text-sm transition-all"
                        style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' }}
                      >
                        Ir al pago ahora
                      </a>
                    </div>
                  ) : checkoutContext?.paymentMode === 'embedded' && checkoutContext?.paymentProvider === 'mercadopago' ? (
                    <div className="space-y-4">
                      <p className="text-sm text-white/40 text-center">
                        Completa tu pago con Mercado Pago sin salir de Zeus.
                      </p>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
                        <div id={brickContainerId} className="min-h-[420px]" />
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                        <p className="text-xs text-white/50 leading-relaxed">
                          Mercado Pago administra el formulario seguro y solo nos devuelve la información necesaria para crear el pago.
                        </p>
                        {errorMsg && (
                          <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>
                        )}
                        {sdkLoading && (
                          <p className="text-xs text-white/40">Cargando formulario seguro de Mercado Pago...</p>
                        )}
                        <div className="grid gap-3">
                          {isSubmittingEmbedded && (
                            <div
                              className="w-full py-3 rounded-xl font-bold text-sm text-center"
                              style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' }}
                            >
                              Procesando pago...
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={handleRetry}
                            className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-white/60 hover:text-white transition-all"
                          >
                            Reiniciar checkout
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : paymentUrl ? (
                    <>
                      <p className="text-sm text-white/40 text-center">
                        Completa tu pago sin salir de Zeus.
                      </p>
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
                        <iframe
                          src={paymentUrl}
                          title="Checkout seguro"
                          className="w-full"
                          style={{ height: '72vh', minHeight: '640px', border: 0 }}
                          allow="payment *"
                        />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                        <p className="text-xs text-white/50 leading-relaxed">
                          Si el cobro se realizó pero el flujo no avanza, Zeus intentará confirmarlo automáticamente. También puedes forzar una verificación manual sin cerrar esta ventana.
                        </p>
                        {errorMsg && (
                          <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>
                        )}
                        <div className="grid gap-3">
                          <button
                            onClick={handleManualRecovery}
                            disabled={isRecovering}
                            className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                            style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' }}
                          >
                            {isRecovering ? 'Verificando pago...' : 'Ya pagué, verificar ahora'}
                          </button>
                          <button
                            onClick={handleRetry}
                            className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-white/60 hover:text-white transition-all"
                          >
                            Recargar checkout
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                      No encontramos una forma válida de continuar el checkout.
                    </div>
                  )}
                </motion.div>
              )}

              {step === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-6 flex flex-col items-center gap-5 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black mb-2">Algo salió mal</h3>
                    <p className="text-sm text-white/40 leading-relaxed">{errorMsg}</p>
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                    <button
                      onClick={handleRetry}
                      className="w-full py-4 rounded-xl font-bold text-sm transition-all"
                      style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' }}
                    >
                      Reintentar
                    </button>
                    <button
                      onClick={onClose}
                      className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-white/40 hover:text-white transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="px-8 pb-6 flex items-center justify-center gap-2 opacity-20">
            <span className="text-[9px] font-black uppercase tracking-widest">
              Powered by Zeus · Checkout seguro
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
