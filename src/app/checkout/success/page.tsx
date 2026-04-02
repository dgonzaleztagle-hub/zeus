'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const [hasRun, setHasRun]                     = useState(false);
  const [downloadToken, setDownloadToken]        = useState<string | null>(null);
  const [checkingDownload, setCheckingDownload]  = useState(false);
  const [verifying, setVerifying]                = useState(false);
  const [verifyError, setVerifyError]            = useState<string | null>(null);
  const [resolvedType, setResolvedType]          = useState<string | null>(null);

  const searchParams  = useSearchParams();
  const isSimulated   = searchParams.get('mode') === 'simulated';
  const bookingId     = searchParams.get('booking_id');
  const type          = searchParams.get('type');
  const ref           = searchParams.get('ref');
  const isPending     = searchParams.get('pending') === 'true';
  const productIdParam = searchParams.get('product_id');
  const orderIdParam = searchParams.get('order_id');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.self === window.top) return;
    window.top!.location.href = window.location.href;
  }, []);

  useEffect(() => {
    if (type) {
      setResolvedType(type);
      return;
    }
    if (bookingId) {
      setResolvedType('service');
      return;
    }
    if (productIdParam) {
      setResolvedType('product');
    }
  }, [type, bookingId, productIdParam]);

  // Verificación Zeleri: si hay booking_id, confirmar el pago antes de mostrar éxito
  useEffect(() => {
    if (!bookingId || isSimulated || isPending) return;

    let cancelled = false;
    setVerifying(true);

    fetch(`/api/zeus/payments/verify?booking_id=${bookingId}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (!data.verified) {
          setVerifyError(
            'El pago no pudo confirmarse aún. ' +
            'Si realizaste el pago, espera unos minutos y recarga la página. ' +
            'Si el problema persiste, contacta al equipo de Zeus.'
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVerifyError('No se pudo verificar el pago. Por favor, contacta a Zeus.');
        }
      })
      .finally(() => {
        if (!cancelled) setVerifying(false);
      });

    return () => { cancelled = true; };
  }, [bookingId, isSimulated, isPending]);

  useEffect(() => {
    if (resolvedType !== 'product' || isSimulated || isPending) return;

    let cancelled = false;
    setVerifying(true);

    const pendingRaw = typeof window !== 'undefined'
      ? window.sessionStorage.getItem('zeus_pending_checkout')
      : null;

    let pendingOrderId = orderIdParam;
    let pendingProductId = productIdParam;
    let pendingEmail = searchParams.get('client_email');

    if (pendingRaw) {
      try {
        const parsed = JSON.parse(pendingRaw);
        pendingOrderId = pendingOrderId || String(parsed.orderId || '');
        pendingProductId = pendingProductId || String(parsed.productId || '');
        pendingEmail = pendingEmail || parsed.clientEmail || '';
      } catch {
        // Ignorar session corrupta
      }
    }

    if (!pendingOrderId || !pendingProductId) {
      setVerifying(false);
      setVerifyError('No encontramos la referencia de compra para validar tu producto. Si el cobro se realizó, contáctanos para entregarte tu acceso.');
      return;
    }

    const params = new URLSearchParams({
      order_id: pendingOrderId,
      product_id: pendingProductId,
    });

    if (pendingEmail) {
      params.set('client_email', pendingEmail);
    }

    fetch(`/api/zeus/payments/verify-product?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (!data.verified || !data.token) {
          setVerifyError(
            'El pago del producto aún no pudo confirmarse. Si realizaste el cobro, espera un momento y recarga la página.'
          );
          return;
        }

        setDownloadToken(data.token);
        window.sessionStorage.removeItem('zeus_pending_checkout');
      })
      .catch(() => {
        if (!cancelled) {
          setVerifyError('No se pudo verificar la compra del producto. Por favor, recarga o contáctanos.');
        }
      })
      .finally(() => {
        if (!cancelled) setVerifying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isPending, isSimulated, orderIdParam, productIdParam, resolvedType, searchParams]);

  // Confetti — solo cuando no hay verificación pendiente ni error
  useEffect(() => {
    if (hasRun || isPending || verifying || verifyError) return;

    const duration     = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults     = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    setHasRun(true);
    return () => clearInterval(interval);
  }, [hasRun, isPending, verifying, verifyError]);

  const handleCheckDownload = async () => {
    if (downloadToken) {
      window.location.href = `/api/zeus/download?token=${downloadToken}`;
      return;
    }

    if (!ref) return;
    setCheckingDownload(true);
    try {
      const res  = await fetch(`/api/zeus/download/check?ref=${ref}`);
      const data = await res.json();
      if (data.ready) {
        setDownloadToken(data.token);
        window.location.href = `/api/zeus/download?token=${data.token}`;
      } else {
        alert('El pago aún se está procesando o el sistema está generando tu acceso. Por favor, espera un minuto e intenta de nuevo o revisa tu email.');
      }
    } catch {
      alert('Error al verificar la descarga. Reintenta por favor.');
    } finally {
      setCheckingDownload(false);
    }
  };

  // Pantalla de espera mientras se verifica con Zeleri
  if (verifying) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="max-w-lg w-full bg-[#111118] border border-white/10 rounded-3xl p-12 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto">
            <span className="text-4xl animate-pulse">⏳</span>
          </div>
          <h1 className="text-2xl font-black">Confirmando pago...</h1>
          <p className="text-white/50 text-sm">Estamos verificando tu transacción. Esto toma solo un momento.</p>
        </div>
      </div>
    );
  }

  // Pantalla de error de verificación
  if (verifyError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="max-w-lg w-full bg-[#111118] border border-red-500/20 rounded-3xl p-12 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-black">Verificación pendiente</h1>
          <p className="text-white/50 text-sm leading-relaxed">{verifyError}</p>
          <div className="grid gap-3 mt-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 rounded-xl font-bold"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' }}
            >
              Reintentar verificación
            </button>
            <Link href="/" className="w-full py-4 rounded-xl font-bold border border-white/10 text-white text-center block">
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen pt-20 pb-20 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-lg w-full bg-[#111118] border border-white/10 rounded-3xl p-12 text-center"
        style={{ boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}
      >
        <div className="w-20 h-20 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-8">
          <span className="text-4xl">{isPending ? '⏳' : '✅'}</span>
        </div>

        <h1 className="text-4xl font-black mb-4">
          {isPending ? 'Pago Pendiente' : '¡Pago Recibido!'}
        </h1>

        <p className="text-white/50 mb-10 leading-relaxed text-sm">
          {isSimulated
            ? 'Venta de prueba aprobada en modo simulación (HojaCero Sandbox).'
            : isPending
              ? 'Tu pago está siendo procesado. Te notificaremos por correo apenas se confirme.'
          : resolvedType === 'product'
            ? 'Tu compra ha sido procesada con éxito. Ya puedes descargar tu producto digital.'
            : 'Tu reserva ha sido confirmada correctamente. Hemos enviado los detalles a tu correo electrónico.'}
        </p>

        <div className="grid gap-4">
          {resolvedType === 'product' && !isPending && (
            <button
              onClick={handleCheckDownload}
              disabled={checkingDownload || !downloadToken}
              className="w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' }}
            >
              {checkingDownload ? 'Verificando...' : downloadToken ? '📥 Descargar Producto Ahora' : 'Validando compra...'}
            </button>
          )}

          <Link
            href="/"
            className={`w-full py-4 rounded-xl font-bold transition-all ${resolvedType === 'product' ? 'border border-white/10 text-white' : ''}`}
            style={resolvedType !== 'product' ? { background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' } : {}}
          >
            Volver al Inicio
          </Link>

          {(bookingId || ref || isSimulated) && (
            <div className="text-[10px] tracking-widest uppercase text-white/20 mt-4">
              Referencia: {bookingId || ref || 'SIM-TEST-ZEUS-OK'}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
