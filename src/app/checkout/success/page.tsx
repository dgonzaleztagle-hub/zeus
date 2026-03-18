'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const [hasRun, setHasRun] = useState(false);
  const searchParams = useSearchParams();
  const isSimulated = searchParams.get('mode') === 'simulated';

  useEffect(() => {
    if (!hasRun) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      setHasRun(true);
    }
  }, [hasRun]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen pt-20 pb-20 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-lg w-full bg-[#111118] border border-white/10 rounded-3xl p-12 text-center"
        style={{ boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}
      >
        <div 
          className="w-20 h-20 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto mb-8"
        >
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-4xl font-black mb-4">¡Pago Exitoso!</h1>
        <p className="text-white/50 mb-10 leading-relaxed">
          {isSimulated
            ? 'Venta de prueba aprobada en modo simulación. Toku aún no está conectado; este flujo es solo para testing.'
            : 'Tu pago fue confirmado correctamente. Hemos enviado los detalles y el enlace de acceso a tu correo electrónico.'}
        </p>

        <div className="grid gap-4">
          <Link href="/" 
                className="w-full py-4 rounded-xl font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' }}>
             Volver al Inicio
          </Link>
          <div className="text-[10px] tracking-widest uppercase text-white/20 mt-4">
             ID Transacción: {isSimulated ? 'SIM-TEST-ZEUS-OK' : 'TOKU-5829-4102-ZEUS'}
          </div>
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
