'use client';

import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/premium/AnimatedCounter';
import { BentoGrid } from '@/components/premium/BentoGrid';
import { AnimatedGradient } from '@/components/premium/AnimatedGradient';

export default function NosotrosPage() {
  const stats = [
    { to: 500, suffix: '+', label: 'Sesiones de Asesoría', sub: 'Transformación Real' },
    { to: 12, suffix: '+', label: 'Productos Digitales', sub: 'Catálogo especializado' },
    { to: 4.9, suffix: '★', label: 'Satisfacción Promedio', sub: 'Expertise comprobado' },
    { to: 100, suffix: '%', label: 'Compromiso Sostenible', sub: 'Impacto Real' },
  ];

  return (
    <div className="relative pt-32 pb-24 overflow-hidden">
      {/* Background element */}
      <AnimatedGradient
        colors={['#00FF8708', '#00D4FF05', '#0A0A0F00']}
        speed={15}
        blur={120}
        opacity={1}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-16"
        >
          <span
            className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-6"
            style={{ background: 'rgba(0,255,135,0.1)', color: '#00FF87', border: '1px solid rgba(0,255,135,0.2)' }}
          >
            Sobre Nosotros
          </span>
          <h1
            className="font-black text-5xl md:text-7xl leading-none mb-8"
            style={{ letterSpacing: '-0.03em' }}
          >
            Arquitectos de la <br />
            <span style={{ background: 'linear-gradient(135deg, #00FF87, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Economía Circular.
            </span>
          </h1>
          <p className="text-xl md:text-2xl leading-relaxed" style={{ color: 'rgba(240,240,240,0.6)' }}>
            No somos consultores tradicionales. Somos facilitadores de conocimiento aplicado, transformando negocios y carreras a través de la tecnología y la sostenibilidad real.
          </p>
        </motion.div>

        {/* Bento Grid Mission/Values */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-24">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1, duration: 0.8 }}
             className="md:col-span-8 p-8 rounded-3xl relative overflow-hidden"
             style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.05)' }}
          >
             <h3 className="text-2xl font-black mb-4">Nuestra Propuesta de Valor</h3>
             <p className="text-lg leading-relaxed mb-6" style={{ color: 'rgba(240,240,240,0.5)' }}>
               Vivimos en una era donde la sostenibilidad dejó de ser una opción para convertirse en el único camino viable. En Zeus, fusionamos la innovación tecnológica con la responsabilidad ambiental para crear sistemas que generen valor a largo plazo.
             </p>
             <div className="flex flex-wrap gap-4">
                {['Innovación', 'Triple Impacto', 'Conocimiento Aplicado', 'Escalabilidad'].map(tag => (
                   <span key={tag} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(0,255,135,0.05)', color: '#00FF87', border: '1px solid rgba(0,255,135,0.1)' }}>{tag}</span>
                ))}
             </div>
          </motion.div>

          <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2, duration: 0.8 }}
             className="md:col-span-4 p-8 rounded-3xl flex flex-col justify-center"
             style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.1), transparent)', border: '1px solid rgba(167,139,250,0.2)' }}
          >
             <div className="text-4xl mb-4">🎯</div>
             <h3 className="text-xl font-black mb-2">Visión 2030</h3>
             <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,240,240,0.4)' }}>
               Convertirnos en el nodo técnico de referencia para la descarbonización de negocios en Latinoamérica.
             </p>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-16 border-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl md:text-5xl font-black mb-2" style={{ color: '#00FF87' }}>
                <AnimatedCounter to={stat.suffix === '★' ? 49 : stat.to} suffix={stat.suffix === '★' ? '' : stat.suffix} duration={2} />
                {stat.suffix === '★' && <span>★</span>}
              </div>
              <div className="text-sm font-bold white">{stat.label}</div>
              <div className="text-xs" style={{ color: 'rgba(240,240,240,0.4)' }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
