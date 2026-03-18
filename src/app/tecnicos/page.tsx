'use client';

import { motion } from 'framer-motion';
import { AnimatedGradient } from '@/components/premium/AnimatedGradient';
import Link from 'next/link';

export default function TecnicosPage() {
  return (
    <div className="relative pt-32 pb-24 min-h-screen">
      <AnimatedGradient
        colors={['#00D4FF03', '#A78BFA02', '#0A0A0F00']}
        speed={15}
        blur={120}
        opacity={1}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Visual Element */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="aspect-square bg-[#111118] border border-white/5 rounded-3xl relative overflow-hidden group order-2 lg:order-1"
          >
             <div 
               className="absolute inset-0 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700"
               style={{ background: 'url(/prospectos/zeus/hero.png) center/cover' }}
             />
             <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] to-transparent" />
             
             {/* Floating Info */}
             <div className="absolute bottom-12 left-12 right-12 flex gap-4">
                <div className="flex-1 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                   <p className="text-[10px] font-black tracking-widest uppercase mb-1" style={{ color: '#00D4FF' }}>Mantenimiento</p>
                   <p className="text-xs font-bold leading-relaxed">Extensión de vida útil garantizada.</p>
                </div>
                <div className="flex-1 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                   <p className="text-[10px] font-black tracking-widest uppercase mb-1" style={{ color: '#A78BFA' }}>Reparación</p>
                   <p className="text-xs font-bold leading-relaxed">Diagnóstico técnico de alta precisión.</p>
                </div>
             </div>
          </motion.div>

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="order-1 lg:order-2"
          >
            <span className="text-xs font-bold tracking-widest uppercase mb-6 block" style={{ color: '#00D4FF' }}>Hardware & Tech</span>
            <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[0.9] tracking-tighter">
               Servicios <br />
               Técnicos<span style={{ color: '#00D4FF' }}>.</span>
            </h1>
            <p className="text-xl text-white/50 leading-relaxed mb-10">
               Reparación y mantenimiento de equipos bajo estándares de Economía Circular. No solo arreglamos, acompañamos para que tu hardware dure más.
            </p>

            <div className="space-y-6 mb-12">
               {['Mantenimiento preventivo especializado', 'Limpieza y optimización energética', 'Reparación de hardware crítico', 'Consultoría de ciclo de vida'].map(item => (
                 <div key={item} className="flex items-center gap-4 text-sm font-semibold">
                    <span className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-[10px] text-blue-500">✓</span>
                    {item}
                 </div>
               ))}
            </div>

            <div className="flex items-center gap-6">
               <Link href="/prospectos/zeus/agenda" 
                     className="px-8 py-4 rounded-xl font-bold transition-all border hover:border-[#00D4FF] hover:text-[#00D4FF]"
                     style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#FFF' }}>
                  Agendar Diagnóstico →
               </Link>
               <Link href="/prospectos/zeus/contacto" className="text-sm font-bold opacity-40 hover:opacity-100 transition-opacity">Consultar WhatsApp</Link>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
