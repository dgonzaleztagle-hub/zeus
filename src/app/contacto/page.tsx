'use client';

import { motion } from 'framer-motion';
import { AnimatedGradient } from '@/components/premium/AnimatedGradient';

export default function ContactoPage() {
  return (
    <div className="relative pt-32 pb-24 min-h-screen overflow-hidden">
      <AnimatedGradient
        colors={['#0EA5E905', '#00D4FF03', '#0A0A0F00']}
        speed={15}
        blur={120}
        opacity={1}
      />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest uppercase mb-4 block" style={{ color: '#0EA5E9' }}>Conectemos</span>
          <h1 className="text-5xl md:text-7xl font-black mb-6" style={{ letterSpacing: '-.03em' }}>
            Hablemos del <br />
            <span style={{ color: '#0EA5E9' }}>Futuro.</span>
          </h1>
          <p className="text-lg text-white/40 max-w-lg mx-auto leading-relaxed">
            ¿Tienes una empresa, un proyecto personal o una duda técnica? Escríbenos y te responderemos en menos de 24h.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
           {/* WhatsApp & Info */}
           <div className="space-y-8">
              <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-[#0EA5E9] transition-all group">
                 <h3 className="text-xl font-bold mb-4 font-black">Vía Rápida ⚡</h3>
                 <p className="text-sm text-white/40 mb-8 leading-relaxed">Si prefieres una respuesta instantánea para agendar o consultar, nuestro equipo está activo en WhatsApp.</p>
                 <a href="https://wa.me/56900000000" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold transition-all"
                    style={{ background: '#0EA5E9', color: '#0A0A0F' }}>
                    Ir a WhatsApp
                 </a>
              </div>

              <div className="space-y-4 px-4">
                 <div className="flex items-center gap-4 text-sm font-semibold opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
                    <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">💌</span> hola@asesoriaszeus.cl
                 </div>
                 <div className="flex items-center gap-4 text-sm font-semibold opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
                    <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">📍</span> Providencia, Santiago.
                 </div>
              </div>
           </div>

           {/* Form */}
           <div className="bg-[#111118] border border-white/5 p-10 rounded-3xl relative overflow-hidden">
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Nombre</label>
                    <input type="text" placeholder="Tu nombre" 
                           className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:border-[#0EA5E9] outline-none transition-all" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Email</label>
                    <input type="email" placeholder="correo@ejemplo.cl" 
                           className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:border-[#0EA5E9] outline-none transition-all" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Mensaje</label>
                    <textarea rows={4} placeholder="¿En qué podemos ayudarte?" 
                           className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-[#0EA5E9] outline-none transition-all resize-none" />
                 </div>
                 <button className="w-full py-5 rounded-xl font-bold transition-all"
                         style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F' }}>
                   Enviar Mensaje
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
