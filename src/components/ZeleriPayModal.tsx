'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ZeleriPayModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  onSuccess?:  (downloadToken?: string) => void;

  // Contexto de la compra
  type:      'service' | 'product';
  itemId:    string;
  itemName:  string;
  amount:    number;

  // Solo para servicios
  date?: string;
  slot?: string;

  // Datos del cliente pre-cargados (agenda los tiene, tienda los pide en el modal)
  prefillName?:  string;
  prefillEmail?: string;
  prefillPhone?: string;
}

type ModalStep =
  | 'form'        // Capturar datos del cliente (si no vienen pre-cargados)
  | 'enrolling'   // iframe de Zeleri mostrando formulario de tarjeta
  | 'confirm'     // Botón "Confirmar pago" post-iframe
  | 'processing'  // Spinner mientras se cobra
  | 'success'     // ✅ Pago confirmado
  | 'error';      // ⚠️ Error con retry

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function ZeleriPayModal({
  isOpen,
  onClose,
  onSuccess,
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
  const formRef = useRef<HTMLFormElement | null>(null);

  // Si vienen los tres datos pre-cargados, ir directo a enrolling
  const hasAllPrefill = !!(prefillName && prefillEmail && prefillPhone);

  const [step,          setStep]          = useState<ModalStep>(hasAllPrefill ? 'enrolling' : 'form');
  const [enrollUrl,     setEnrollUrl]     = useState<string | null>(null);
  const [bookingId,     setBookingId]     = useState<string | null>(null);
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);

  const [form, setForm] = useState({
    name:  prefillName  || '',
    email: prefillEmail || '',
    phone: prefillPhone || '',
  });

  const readNormalizedForm = useCallback(() => {
    const fallback = {
      name: form.name,
      email: form.email,
      phone: form.phone,
    };

    if (!formRef.current) {
      return {
        name: fallback.name.trim(),
        email: fallback.email.trim().toLowerCase(),
        phone: fallback.phone.trim(),
      };
    }

    const values = new FormData(formRef.current);
    const name = String(values.get('customer_name') ?? fallback.name).trim();
    const email = String(values.get('customer_email') ?? fallback.email).trim().toLowerCase();
    const phone = String(values.get('customer_phone') ?? fallback.phone).trim();

    return { name, email, phone };
  }, [form.email, form.name, form.phone]);

  // Resetear al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setStep(hasAllPrefill ? 'enrolling' : 'form');
      setEnrollUrl(null);
      setBookingId(null);
      setErrorMsg(null);
      setDownloadToken(null);
      setForm({
        name:  prefillName  || '',
        email: prefillEmail || '',
        phone: prefillPhone || '',
      });
    }
  }, [isOpen, prefillName, prefillEmail, prefillPhone, hasAllPrefill]);

  // Disparar confetti en success
  useEffect(() => {
    if (step !== 'success') return;
    const end = Date.now() + 2500;
    const interval = setInterval(() => {
      if (Date.now() > end) return clearInterval(interval);
      confetti({
        particleCount: 40,
        spread: 360,
        startVelocity: 25,
        ticks: 50,
        origin: { x: Math.random(), y: Math.random() - 0.2 },
        zIndex: 9999,
      });
    }, 250);
    return () => clearInterval(interval);
  }, [step]);

  // ---- Paso 1: Crear enrollment → obtener iframe URL ----
  const handleStartEnroll = useCallback(async () => {
    const { name, email, phone } = readNormalizedForm();

    setForm({ name, email, phone });

    if (amount < 1000) {
      setErrorMsg('Zeleri solo permite pagos desde $1.000 CLP');
      setStep('error');
      return;
    }

    if (!name || !email || !phone) {
      setErrorMsg('Por favor completa todos los campos');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Email inválido');
      return;
    }

    setErrorMsg(null);
    setStep('enrolling');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('/api/zeus/enroll', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body:    JSON.stringify({
          customer_name:  name,
          customer_email: email,
          customer_phone: phone,
          type,
          item_id:   itemId,
          item_name: itemName,
          amount,
          date,
          slot,
        }),
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar el pago');
      if (!data.url_enrollment) {
        throw new Error('Zeleri no devolvió una URL de enrolamiento válida.');
      }

      setEnrollUrl(data.url_enrollment);
      setBookingId(data.booking_id || null);

    } catch (err: any) {
      const message = err.name === 'AbortError'
        ? 'Zeleri tardó demasiado en responder. Reintenta en unos segundos.'
        : (err.message || 'Error al conectar con Zeleri');
      if (message.toLowerCase().includes('ya no está disponible')) {
        setErrorMsg('Ya existe una operación pendiente para este recurso. Espera un momento o recarga antes de reintentar.');
      } else {
        setErrorMsg(message);
      }
      setStep('error');
    }
  }, [readNormalizedForm, type, itemId, itemName, amount, date, slot]);

  // Auto-iniciar si ya vienen todos los datos
  useEffect(() => {
    if (isOpen && hasAllPrefill && step === 'enrolling' && !enrollUrl) {
      handleStartEnroll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasAllPrefill, step, enrollUrl]);

  // ---- Paso 2: Usuario terminó de ingresar tarjeta → buscar card_id ----
  const handleCardReady = useCallback(async () => {
    setStep('processing');
    setErrorMsg(null);

    try {
      if (amount < 1000) {
        throw new Error('Zeleri solo permite pagos desde $1.000 CLP');
      }

      const email = form.email.toLowerCase();

      // Consultar tarjetas registradas para este email
      const cardsRes  = await fetch(`/api/zeus/enroll/cards?email=${encodeURIComponent(email)}`);
      const cardsData = await cardsRes.json();

      if (!cardsRes.ok) throw new Error(cardsData.error || 'No se pudo verificar la tarjeta');

      const cards: any[] = cardsData.cards || [];
      if (cards.length === 0) {
        throw new Error('No se encontró tarjeta registrada. ¿Completaste el formulario de Zeleri?');
      }

      // Tomar la tarjeta más reciente (última del arreglo) o la favorita
      const card = cards.find((c: any) => c.is_favorite) || cards[cards.length - 1];

      // ---- Paso 3: Cobrar ----
      const payRes = await fetch('/api/zeus/enroll/pay', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          card_id:        card.id,
          customer_email: email,
          type,
          item_id:        itemId,
          item_name:      itemName,
          amount,
          booking_id:     bookingId,
        }),
      });

      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error || 'Error al procesar el pago');

      setDownloadToken(payData.download_token || null);
      setStep('success');
      onSuccess?.(payData.download_token || undefined);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el pago');
      setStep('error');
    }
  }, [form.email, type, itemId, itemName, amount, bookingId, onSuccess]);

  // Escuchar postMessage de Zeleri (por si lo implementan)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.origin.includes('zeleri')) return;
      const { card_id, status, type: msgType } = event.data || {};
      if (card_id || status === 'enrolled' || msgType === 'enrollment_complete') {
        // Zeleri notificó éxito — avanzar a confirm automáticamente
        setStep('confirm');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // ---- Retry ----
  const handleRetry = () => {
    setStep(hasAllPrefill ? 'enrolling' : 'form');
    setErrorMsg(null);
    if (hasAllPrefill) {
      setEnrollUrl(null);
      handleStartEnroll();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="zeleri-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(12px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">
                  Pago Seguro
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

            {/* Divider */}
            <div className="h-px bg-white/5 mx-8" />

            {/* Contenido por step */}
            <div className="px-8 py-6">
              <AnimatePresence mode="wait">

                {/* FORM — capturar datos del cliente */}
                {step === 'form' && (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    className="space-y-4"
                    ref={formRef}
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleStartEnroll();
                    }}
                  >
                    <p className="text-sm text-white/40 mb-6">
                      Ingresa tus datos para continuar al pago.
                    </p>

                    {[
                      { key: 'name',  label: 'Nombre Completo', placeholder: 'Juan Pérez',         type: 'text'  },
                      { key: 'email', label: 'Email',           placeholder: 'correo@ejemplo.cl',   type: 'email' },
                      { key: 'phone', label: 'Teléfono',        placeholder: '+56 9 1234 5678',     type: 'tel'   },
                    ].map(({ key, label, placeholder, type: inputType }) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[10px] uppercase tracking-widest text-white/30 font-black">
                          {label}
                        </label>
                        <input
                          name={key === 'name' ? 'customer_name' : key === 'email' ? 'customer_email' : 'customer_phone'}
                          type={inputType}
                          placeholder={placeholder}
                          value={form[key as keyof typeof form]}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          onInput={e => setForm(f => ({ ...f, [key]: (e.target as HTMLInputElement).value }))}
                          className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:border-[#0EA5E9] outline-none transition-all"
                        />
                      </div>
                    ))}

                    {errorMsg && (
                      <p className="text-xs text-red-400 font-semibold">{errorMsg}</p>
                    )}

                    <button
                      type="submit"
                      className="w-full h-13 mt-2 py-4 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' }}
                    >
                      Continuar al pago →
                    </button>
                  </motion.form>
                )}

                {/* ENROLLING — iframe de Zeleri */}
                {step === 'enrolling' && (
                  <motion.div
                    key="enrolling"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <p className="text-xs text-white/40 text-center">
                      Ingresa los datos de tu tarjeta de forma segura
                    </p>

                    {enrollUrl ? (
                      <div className="rounded-2xl overflow-hidden border border-white/10"
                           style={{ height: 420 }}>
                        <iframe
                          src={enrollUrl}
                          className="w-full h-full border-0"
                          title="Formulario de tarjeta — Zeleri"
                          allow="payment"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center" style={{ height: 420 }}>
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-4 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs text-white/30 uppercase tracking-widest font-black animate-pulse">
                            Conectando con Zeleri...
                          </p>
                        </div>
                      </div>
                    )}

                    {enrollUrl && (
                      <button
                        onClick={() => setStep('confirm')}
                        className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-white/60 hover:text-white hover:border-white/20 transition-all"
                      >
                        Ya ingresé mi tarjeta →
                      </button>
                    )}

                    <p className="text-[10px] text-center text-white/20">
                      🔒 Datos encriptados — PCI-DSS compliant
                    </p>
                  </motion.div>
                )}

                {/* CONFIRM — botón confirmar pago */}
                {step === 'confirm' && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-4 space-y-6 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 flex items-center justify-center mx-auto">
                      <span className="text-3xl">💳</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black mb-2">Tarjeta lista</h3>
                      <p className="text-sm text-white/40">
                        Haz click en confirmar para procesar el cobro de{' '}
                        <strong className="text-white">${amount.toLocaleString('es-CL')}</strong>
                      </p>
                    </div>

                    <button
                      onClick={handleCardReady}
                      className="w-full py-4 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                      style={{
                        background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)',
                        color: '#0A0A0F',
                        boxShadow: '0 0 30px rgba(14,165,233,0.3)',
                      }}
                    >
                      Confirmar pago ${amount.toLocaleString('es-CL')} →
                    </button>

                    <button
                      onClick={() => setStep('enrolling')}
                      className="text-xs text-white/30 hover:text-white/50 transition-colors underline"
                    >
                      Volver a ingresar tarjeta
                    </button>
                  </motion.div>
                )}

                {/* PROCESSING — spinner */}
                {step === 'processing' && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-12 flex flex-col items-center gap-4"
                  >
                    <div className="w-12 h-12 border-4 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold tracking-widest uppercase animate-pulse text-white/50">
                      Procesando pago...
                    </p>
                    <p className="text-xs text-white/20">No cierres esta ventana</p>
                  </motion.div>
                )}

                {/* SUCCESS */}
                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="py-6 flex flex-col items-center gap-5 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                      className="w-20 h-20 rounded-full bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center"
                    >
                      <span className="text-4xl">✅</span>
                    </motion.div>

                    <div>
                      <h3 className="text-2xl font-black mb-2">¡Pago recibido!</h3>
                      <p className="text-sm text-white/40 leading-relaxed">
                        {type === 'product'
                          ? 'Tu compra se procesó con éxito. Ya puedes descargar tu producto.'
                          : 'Tu reserva fue confirmada. Recibirás los detalles en tu correo.'}
                      </p>
                    </div>

                    {type === 'product' && downloadToken && (
                      <a
                        href={`/api/zeus/download?token=${downloadToken}`}
                        className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                        style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' }}
                      >
                        📥 Descargar ahora
                      </a>
                    )}

                    <button
                      onClick={onClose}
                      className="w-full py-3 rounded-xl border border-white/10 text-sm font-bold text-white/50 hover:text-white transition-all"
                    >
                      Cerrar
                    </button>
                  </motion.div>
                )}

                {/* ERROR */}
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

            {/* Footer seguridad */}
            {!['success', 'error', 'processing'].includes(step) && (
              <div className="px-8 pb-6 flex items-center justify-center gap-2 opacity-20">
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Powered by Zeleri · Pago 100% seguro
                </span>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
