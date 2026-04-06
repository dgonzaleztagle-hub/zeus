'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ZeleriPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'service' | 'product';
  itemId: string;
  itemName: string;
  amount: number;
  date?: string;
  slot?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
}

type ModalStep = 'form' | 'processing' | 'checkout' | 'error';
type CheckoutContext = {
  bookingId?: string;
  orderId?: string;
  productId?: string;
  clientEmail?: string;
};

export default function ZeleriPayModal({
  isOpen,
  onClose,
  type,
  itemId,
  itemName,
  amount,
  date,
  slot,
  prefillName,
  prefillEmail,
  prefillPhone,
}: ZeleriPayModalProps) {
  const [step, setStep] = useState<ModalStep>('form');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [checkoutContext, setCheckoutContext] = useState<CheckoutContext | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [form, setForm] = useState({
    name: prefillName || '',
    email: prefillEmail || '',
    phone: prefillPhone || '',
  });
  const hasPrefill = useMemo(() => Boolean(prefillName && prefillEmail), [prefillEmail, prefillName]);

  useEffect(() => {
    if (!isOpen) return;
    setStep(hasPrefill ? 'processing' : 'form');
    setErrorMsg(null);
    setPaymentUrl(null);
    setCheckoutContext(null);
    setIsRecovering(false);
    setForm({
      name: prefillName || '',
      email: prefillEmail || '',
      phone: prefillPhone || '',
    });
  }, [hasPrefill, isOpen, prefillEmail, prefillName, prefillPhone]);

  async function startCheckout(override?: { name?: string; email?: string; phone?: string }) {
    const name = (override?.name ?? form.name).trim();
    const email = (override?.email ?? form.email).trim().toLowerCase();
    const phone = (override?.phone ?? form.phone).trim();

    if (!name || !email) {
      setErrorMsg('Por favor completa nombre y email');
      setStep('error');
      return;
    }

    if (amount < 1000) {
      setErrorMsg('Zeleri solo permite pagos desde $1.000 CLP');
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

    try {
      const endpoint = type === 'service' ? '/api/zeus/book' : '/api/zeus/checkout';
      const payload = type === 'service'
        ? {
            service_id: itemId,
            service_name: itemName,
            amount,
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

      if (!data.payment_url) {
        throw new Error('Zeleri no devolvió una URL de pago válida.');
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
      });
      setPaymentUrl(data.payment_url);
      setStep('checkout');
    } catch (error: any) {
      setErrorMsg(error.message || 'Error al iniciar el pago');
      setStep('error');
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    if (type !== 'service') return;
    if (!hasPrefill) return;
    if (step !== 'processing') return;

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
        // Mantener polling silencioso mientras el usuario sigue en checkout.
      }
    }

    pollPaymentStatus();
    const interval = window.setInterval(pollPaymentStatus, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [checkoutContext, isOpen, step, type]);

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

      setErrorMsg('Aún no vemos el pago confirmado en Zeleri. Si ya se hizo el cobro, espera unos segundos y vuelve a verificar.');
    } catch {
      setErrorMsg('No pudimos verificar el estado del pago en este momento.');
    } finally {
      setIsRecovering(false);
    }
  }

  const handleRetry = () => {
    setErrorMsg(null);
    setPaymentUrl(null);
    setStep(hasPrefill ? 'processing' : 'form');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="zeleri-modal-overlay"
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
          key="zeleri-modal-box"
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
                Pago One Shot
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
                    Te llevaremos al checkout seguro de Zeleri para completar el pago.
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
                    Ir a pagar →
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
                    Redirigiendo a checkout seguro...
                  </p>
                  <p className="text-xs text-white/20 text-center">
                    {type === 'service'
                      ? 'Estamos preparando tu reserva y la orden de pago.'
                      : 'Estamos preparando tu orden para el checkout one shot de Zeleri.'}
                  </p>
                </motion.div>
              )}

              {step === 'checkout' && paymentUrl && (
                <motion.div
                  key="checkout"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-white/40 text-center">
                    Completa tu pago sin salir de Zeus.
                  </p>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
                    <iframe
                      src={paymentUrl}
                      title="Checkout one shot de Zeleri"
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
              Powered by Zeleri · Checkout one shot
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
