'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function CheckoutErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-lg w-full bg-[#111118] border border-red-500/20 rounded-3xl p-12 text-center space-y-5"
      >
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <span className="text-4xl">⚠️</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black">Pago no completado</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            La sesión de pago no pudo completarse o fue interrumpida antes de la confirmación final.
            Si ves el cobro en tu banco o en Mercado Pago, contáctanos para validar manualmente tu orden.
          </p>
        </div>

        <div className="grid gap-3 pt-2">
          <button
            onClick={() => window.history.back()}
            className="w-full py-4 rounded-xl font-bold"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' }}
          >
            Volver e intentarlo otra vez
          </button>
          <Link
            href="/"
            className="w-full py-4 rounded-xl font-bold border border-white/10 text-white text-center block"
          >
            Ir al inicio
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
