'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const [hasRun, setHasRun] = useState(false);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [checkingDownload, setCheckingDownload] = useState(false);
  
  const searchParams = useSearchParams();
  const isSimulated = searchParams.get('mode') === 'simulated';
  const bookingId = searchParams.get('booking_id');
  const type = searchParams.get('type');
  const ref = searchParams.get('ref');
  const isPending = searchParams.get('pending') === 'true';

  useEffect(() => {
    if (!hasRun && !isPending) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      setHasRun(true);
    }
  }, [hasRun, isPending]);

  const handleCheckDownload = async () => {
    if (!ref) return;
    setCheckingDownload(true);
    try {
      const res = await fetch(`/api/zeus/download/check?ref=${ref}`);
      const data = await res.json();
      if (data.ready) {
        setDownloadToken(data.token);
        // Si ya está listo, podemos iniciar la descarga
        window.location.href = `/api/zeus/download?token=${data.token}`;
      } else {
        alert("El pago aún se está procesando o el sistema está generando tu acceso. Por favor, espera un minuto e intenta de nuevo o revisa tu email.");
      }
    } catch (err) {
      alert("Error al verificar la descarga. Reintenta por favor.");
    } finally {
      setCheckingDownload(false);
    }
  };

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
              : type === 'product'
                ? 'Tu compra ha sido procesada con éxito. Ya puedes descargar tu producto digital.'
                : 'Tu reserva ha sido confirmada correctamente. Hemos enviado los detalles a tu correo electrónico.'}
        </p>

        <div className="grid gap-4">
          {type === 'product' && !isPending && (
            <button 
              onClick={handleCheckDownload}
              disabled={checkingDownload}
              className="w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' }}
            >
              {checkingDownload ? 'Verificando...' : '📥 Descargar Producto Ahora'}
            </button>
          )}

          <Link href="/" 
                className={`w-full py-4 rounded-xl font-bold transition-all ${type === 'product' ? 'border border-white/10 text-white' : ''}`}
                style={type !== 'product' ? { background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' } : {}}>
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
