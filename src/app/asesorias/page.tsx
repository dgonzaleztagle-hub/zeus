'use client';

import { motion } from 'framer-motion';
import { AnimatedGradient } from '@/components/premium/AnimatedGradient';
import Link from 'next/link';

export default function AsesoriasPage() {
  return (
    <div className="relative pt-32 pb-24 min-h-screen">
      <AnimatedGradient
        colors={['#00FF8703', '#00D4FF02', '#0A0A0F00']}
        speed={15}
        blur={120}
        opacity={1}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-xs font-bold tracking-widest uppercase mb-6 block" style={{ color: '#00FF87' }}>Servicio Principal</span>
            <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[0.9] tracking-tighter">
               Asesorías <br />
               Profesionales<span style={{ color: '#00FF87' }}>.</span>
            </h1>
            <p className="text-xl text-white/50 leading-relaxed mb-10">
               Sesiones 1:1 con expertos en sostenibilidad, tecnología aplicada y economía circular. 
               Diagnóstico real para soluciones concretas en tu negocio.
            </p>

            <div className="space-y-6 mb-12">
               {['Diagnóstico técnico personalizado', 'Plan de acción en 24h', 'Acompañamiento estratégico', 'Reporte de huella digital gratuito'].map(item => (
                 <div key={item} className="flex items-center gap-4 text-sm font-semibold">
                    <span className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center text-[10px] text-green-500">✓</span>
                    {item}
                 </div>
               ))}
            </div>

            <div className="flex items-center gap-8">
               <Link href="/agenda" 
                     className="px-10 py-5 rounded-xl font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
                     style={{ background: 'linear-gradient(135deg, #00FF87, #00D4FF)', color: '#0A0A0F', boxShadow: '0 0 30px rgba(0,255,135,0.3)' }}>
                  Agendar Sesión →
               </Link>
               <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-widest text-white/30 font-bold">Desde</span>
                  <span className="text-2xl font-black">$29.900</span>
               </div>
            </div>
          </motion.div>

          {/* Visual Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="aspect-square bg-[#111118] border border-white/5 rounded-3xl relative overflow-hidden group"
          >
             <div 
               className="absolute inset-0 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700"
               style={{ background: 'url(/prospectos/zeus/hero.png) center/cover' }}
             />
             <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] to-transparent" />
             
             {/* Floating Badge */}
             <div className="absolute bottom-8 left-8 right-8 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                <p className="text-sm font-bold mb-1">Expertise Garantizado</p>
                <p className="text-xs text-white/40 leading-relaxed">Más de 500 sesiones realizadas con resultados tangibles en Chile.</p>
             </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
