'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { AnimatedGradient } from '@/components/premium/AnimatedGradient';
import { AnimatedCounter } from '@/components/premium/AnimatedCounter';
import { InfiniteMovingCards } from '@/components/premium/InfiniteMovingCards';
import { GrainTexture } from '@/components/premium/GrainTexture';

// ─── DATOS FALSEADOS (Demo) ──────────────────────────────────────────────────

const SERVICES = [
  {
    id: 'asesorias',
    tag: 'SERVICIO PRINCIPAL',
    title: 'Asesorías Profesionales',
    desc: 'Sesiones 1:1 con expertos en sostenibilidad, tecnología aplicada y economía circular. Diagnóstico real, soluciones concretas.',
    icon: '⚡',
    cta: 'Agendar sesión',
    size: 'large',
    accent: '#00FF87',
    href: '/agenda',
    price: 'Desde $29.900',
    image: null
  },
  {
    id: 'tecnicos',
    tag: 'TÉCNICO',
    title: 'Servicios Técnicos',
    desc: 'Mantenimiento y reparación de equipos con foco en maximizar vida útil y reducir huella ambiental.',
    icon: '🔧',
    cta: 'Ver disponibilidad',
    size: 'medium',
    accent: '#00D4FF',
    href: '/tecnicos',
    price: 'Soporte Especializado',
    image: null
  },
  {
    id: 'digitales',
    tag: 'CATÁLOGO',
    title: 'Productos Digitales',
    desc: 'Guías, plantillas y herramientas descargables de alta calidad. Compra y descarga inmediata.',
    icon: '📦',
    cta: 'Explorar catálogo',
    size: 'medium',
    accent: '#00FF87',
    href: '/tienda',
    price: 'Kit Digital',
    image: '/prospectos/zeus/products.png'
  },
  {
    id: 'biblioteca',
    tag: 'GRATUITO',
    title: 'Biblioteca Digital',
    desc: 'Contenido educativo abierto. Aprende sin barreras sobre sostenibilidad y tecnología aplicada.',
    icon: '📚',
    cta: 'Acceder gratis',
    size: 'large',
    accent: '#A78BFA',
    href: '/biblioteca',
    price: 'Acceso Libre',
    image: null
  },
];

const PRODUCTS = [
  {
    id: 1,
    name: 'Guía: Auditoría de Huella Digital',
    desc: 'Metodología paso a paso para medir y reducir el impacto ambiental de tu operación tecnológica.',
    price: '$19.900',
    tag: 'MÁS VENDIDO',
    pages: '48 págs',
    format: 'PDF + Plantilla Excel',
    tagColor: '#00FF87',
  },
  {
    id: 2,
    name: 'Kit: Economía Circular para PyMEs',
    desc: 'Plantillas, protocolos y frameworks listos para implementar economía circular en tu empresa.',
    price: '$34.900',
    tag: 'NUEVO',
    pages: '3 documentos',
    format: 'PDF + XLSX + Canva',
    tagColor: '#00D4FF',
  },
  {
    id: 3,
    name: 'Diagnóstico: Madurez Tecnológica',
    desc: 'Evaluación estructurada del nivel de digitalización de tu negocio con hoja de ruta priorizada.',
    price: '$24.900',
    tag: 'BESTSELLER',
    pages: '32 págs',
    format: 'PDF interactivo',
    tagColor: '#A78BFA',
  },
];

const TESTIMONIALS = [
  {
    quote: 'La asesoría con Zeus fue un antes y un después. En 2 sesiones ya tenía un plan claro para reducir costos y mejorar nuestra sostenibilidad.',
    name: 'Rodrigo Méndez',
    title: 'Gerente General · Constructora RM',
  },
  {
    quote: 'Los productos digitales son de un nivel increíble. La guía de huella digital me ahorró semanas de investigación.',
    name: 'Camila Torres',
    title: 'Emprendedora · EcoStartup Chile',
  },
  {
    quote: 'Contraté el servicio técnico pensando que era solo reparación, y resultó ser una asesoría completa sobre eficiencia energética. Superó mis expectativas.',
    name: 'Felipe Araya',
    title: 'Director · Instituto Tecnológico Sur',
  },
  {
    quote: 'La biblioteca digital tiene contenido que no encuentras en ningún otro lado. Y es gratis. Eso dice mucho del compromiso que tiene Zeus.',
    name: 'Valentina Ruiz',
    title: 'Investigadora · Universidad de Concepción',
  },
  {
    quote: 'Agendar fue facilísimo, la sesión fue puntual y el experto conocía el tema a profundidad. Mi negocio ya está aplicando cambios concretos.',
    name: 'Andrés Fuentes',
    title: 'Fundador · Tienda Online Circular',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Elige tu servicio',
    desc: 'Asesoría, servicio técnico o producto digital. Filtra según tu necesidad y presupuesto.',
    icon: '🎯',
  },
  {
    num: '02',
    title: 'Agenda o compra',
    desc: 'Elige fecha y hora disponible o compra directamente. Pago seguro en 1 paso.',
    icon: '📅',
  },
  {
    num: '03',
    title: 'Recibe y aplica',
    desc: 'Confirmación inmediata. Descarga o accede a la sesión. Resultados desde el día 1.',
    icon: '✅',
  },
];

// ─── TextScramble Hook ───────────────────────────────────────────────────────

function useTextCycler(words: string[], interval = 2800) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState(words[0]);
  const [isScrambling, setIsScrambling] = useState(false);
  const chars = '!<>-_\\/[]{}—=+*^?#$@|AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';

  useEffect(() => {
    const cycleInterval = setInterval(() => {
      setIsScrambling(true);
      const nextIndex = (index + 1) % words.length;
      const target = words[nextIndex];
      let iteration = 0;
      const maxIter = target.length * 3;

      const scramble = setInterval(() => {
        setDisplayed(
          target
            .split('')
            .map((char, i) => {
              if (i < Math.floor(iteration / 3)) return char;
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join('')
        );
        iteration++;
        if (iteration >= maxIter) {
          clearInterval(scramble);
          setDisplayed(target);
          setIsScrambling(false);
          setIndex(nextIndex);
        }
      }, 40);
    }, interval);

    return () => clearInterval(cycleInterval);
  }, [index, words, interval, chars]);

  return displayed;
}

// ─── COMPONENTES ─────────────────────────────────────────────────────────────

function ZeusNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(10,10,15,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,255,135,0.1)' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm"
            style={{ background: 'linear-gradient(135deg, #00FF87, #00D4FF)' }}
          >
            <span className="text-[#0A0A0F]">Z</span>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">
            Zeus<span style={{ color: '#00FF87' }}>.</span>
          </span>
        </div>

        {/* Nav links desktop */}
        <div className="hidden md:flex items-center gap-8">
          {['Asesorías', 'Técnico', 'Productos', 'Biblioteca', 'Agenda'].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: 'rgba(240,240,240,0.6)' }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#00FF87')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(240,240,240,0.6)')}
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <a
            href="/agenda"
            className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #00FF87, #00D4FF)',
              color: '#0A0A0F',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(0,255,135,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            Agendar sesión
          </a>
          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className="w-6 h-0.5 bg-white mb-1.5 transition-all" style={{ transform: menuOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
            <div className="w-6 h-0.5 bg-white mb-1.5" style={{ opacity: menuOpen ? 0 : 1 }} />
            <div className="w-6 h-0.5 bg-white" style={{ transform: menuOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden px-6 pb-6" style={{ background: 'rgba(10,10,15,0.98)' }}>
          {['Asesorías', 'Técnico', 'Productos', 'Biblioteca', 'Agenda'].map((item) => (
            <a
              key={item}
              href="#"
              className="block py-3 text-sm font-medium border-b"
              style={{ color: 'rgba(240,240,240,0.7)', borderColor: 'rgba(0,255,135,0.1)' }}
            >
              {item}
            </a>
          ))}
          <a
            href="/agenda"
            className="mt-4 block text-center px-5 py-3 rounded-lg text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #00FF87, #00D4FF)', color: '#0A0A0F' }}
          >
            Agendar sesión
          </a>
        </div>
      )}
    </nav>
  );
}

function HeroSection() {
  const cycledWord = useTextCycler(['NEGOCIOS', 'CARRERAS', 'EMPRESAS', 'PROYECTOS'], 3000);

  return (
    <section
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
      style={{ background: '#0A0A0F' }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/prospectos/zeus/hero.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.25,
        }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,255,135,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 50%, rgba(0,212,255,0.08) 0%, transparent 60%), linear-gradient(to bottom, transparent 60%, #0A0A0F 100%)',
        }}
      />

      {/* Animated orbs */}
      <AnimatedGradient
        colors={['#00FF8710', '#00D4FF08', '#0A0A0F00']}
        speed={20}
        blur={120}
        opacity={1}
        fixed={false}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,255,135,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,135,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-semibold tracking-widest uppercase"
          style={{
            background: 'rgba(0,255,135,0.08)',
            border: '1px solid rgba(0,255,135,0.25)',
            color: '#00FF87',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#00FF87' }}
          />
          Plataforma de Conocimiento Aplicado
        </motion.div>

        {/* Main headline */}
        <div className="mb-6">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="font-black leading-none"
            style={{
              fontSize: 'clamp(52px, 9vw, 130px)',
              color: '#F0F0F0',
              letterSpacing: '-0.03em',
            }}
          >
            TRANSFORMA
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="font-black leading-none"
            style={{
              fontSize: 'clamp(52px, 9vw, 130px)',
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #00FF87 0%, #00D4FF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {cycledWord}
          </motion.div>
        </div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
          className="text-lg md:text-xl max-w-xl mb-10 leading-relaxed"
          style={{ color: 'rgba(240,240,240,0.6)' }}
        >
          Asesorías reales. Productos útiles. Servicios que duran.
          <br />
          <span style={{ color: 'rgba(240,240,240,0.4)' }}>
            Sostenibilidad + Tecnología + Conocimiento aplicado.
          </span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <a
            href="/agenda"
            id="zeus-cta-agenda"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #00FF87, #00D4FF)',
              color: '#0A0A0F',
              boxShadow: '0 0 40px rgba(0,255,135,0.3)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 60px rgba(0,255,135,0.5)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(0,255,135,0.3)';
            }}
          >
            Agendar primera sesión
            <span>→</span>
          </a>
          <a
            href="#productos"
            id="zeus-cta-catalogo"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300"
            style={{
              background: 'transparent',
              border: '1px solid rgba(0,255,135,0.3)',
              color: '#F0F0F0',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,135,0.7)';
              (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,135,0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,135,0.3)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            Explorar catálogo
          </a>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ color: 'rgba(240,240,240,0.3)' }}
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div
            className="w-px h-12"
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,255,135,0.5), transparent)',
              animation: 'pulse 2s infinite',
            }}
          />
        </motion.div>
      </div>
    </section>
  );
}

function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  const stats = [
    { to: 500, suffix: '+', label: 'Sesiones realizadas', sub: 'y contando' },
    { to: 48, suffix: 'h', label: 'Tiempo de respuesta', sub: 'máximo garantizado' },
    { to: 4.9, suffix: '★', label: 'Satisfacción promedio', sub: 'de 5 posibles' },
    { to: 12, suffix: '+', label: 'Productos digitales', sub: 'en el catálogo' },
  ];

  return (
    <section
      ref={ref}
      className="py-16 border-y"
      style={{
        background: 'rgba(0,255,135,0.03)',
        borderColor: 'rgba(0,255,135,0.1)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <div
                className="text-4xl md:text-5xl font-black mb-1 tabular-nums"
                style={{ color: '#00FF87' }}
              >
                <AnimatedCounter
                  to={stat.suffix === '★' ? 49 : stat.to}
                  suffix={stat.suffix === '★' ? '' : stat.suffix}
                  duration={2}
                />
                {stat.suffix === '★' && (
                  <span style={{ color: '#00FF87' }}>★</span>
                )}
              </div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: '#F0F0F0' }}>
                {stat.label}
              </div>
              <div className="text-xs" style={{ color: 'rgba(240,240,240,0.4)' }}>
                {stat.sub}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ service, index, inView }: { service: any; index: number; inView: boolean }) {
  return (
    <motion.a
      href={service.href}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
      }}
      className={`group relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-500 overflow-hidden border 
                 ${service.size === 'large' ? 'col-span-12 md:col-span-7' : 'col-span-12 md:col-span-5'}`}
      style={{
        background: `linear-gradient(135deg, ${service.accent}08 0%, #0A0A0F 100%)`,
        borderColor: `${service.accent}20`,
        minHeight: '340px',
        textDecoration: 'none',
        position: 'relative'
      }}
    >
       {/* Background Image (If exists) */}
       {service.image && (
         <div className="absolute inset-0 z-0 transition-transform duration-700 group-hover:scale-110"
              style={{ 
                backgroundImage: `url(${service.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundBlendMode: 'luminosity',
                opacity: 0.35
              }} />
       )}
       
       {/* Readability Overlay for Image */}
       {service.image && (
         <div className="absolute inset-0 z-[1] bg-[#0A0A0F]/60 group-hover:bg-[#0A0A0F]/40 transition-colors duration-500" />
       )}

       {/* Glow Effect */}
       <div className="absolute inset-0 z-[2] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
            style={{ 
              background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${service.accent}15 0%, transparent 80%)` 
            }} />
       
       <GrainTexture opacity={0.03} />

       {/* Content */}
       <div className="relative z-10 font-sans">
          <div className="flex justify-between items-start mb-6">
             <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase"
                   style={{ background: `${service.accent}15`, color: service.accent, border: `1px solid ${service.accent}30` }}>
               {service.tag}
             </span>
             <div className="text-4xl group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 origin-center drop-shadow-2xl">
               {service.icon}
             </div>
          </div>
          
          <h3 className="text-2xl font-black text-white/90 mb-3 tracking-tight group-hover:text-white transition-colors">
            {service.title}
          </h3>
          
          <p className="text-sm text-white/40 leading-relaxed font-medium group-hover:text-white/60 transition-colors"
             style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {service.desc}
          </p>
       </div>

       <div className="relative z-10 mt-8 flex items-end justify-between font-sans">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all"
               style={{ color: service.accent }}>
            <span className="relative">
              {service.cta}
              <div className="absolute -bottom-1 left-0 w-0 h-px transition-all duration-500 group-hover:w-full" style={{ background: service.accent }} />
            </span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
          {service.price && (
            <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{service.price}</span>
          )}
       </div>
    </motion.a>
  );
}

function ServicesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="servicios" className="py-24 px-6 max-w-7xl mx-auto" ref={ref}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="mb-14"
      >
        <p
          className="text-xs font-bold tracking-widest uppercase mb-3"
          style={{ color: '#00FF87' }}
        >
          ¿Qué ofrecemos?
        </p>
        <h2
          className="font-black leading-none"
          style={{
            fontSize: 'clamp(36px, 5vw, 72px)',
            color: '#F0F0F0',
            letterSpacing: '-0.03em',
          }}
        >
          Todo lo que necesitas,
          <br />
          <span style={{ color: 'rgba(240,240,240,0.4)' }}>en un solo lugar.</span>
        </h2>
      </motion.div>

      {/* Bento Grid — Unificado y totalmente interactivo */}
      <div className="grid grid-cols-12 gap-4">
        {SERVICES.map((service, i) => (
          <ServiceCard key={service.id} service={service} index={i} inView={inView} />
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ background: 'rgba(0,255,135,0.02)' }}
      ref={ref}
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#00FF87' }}>
            El proceso
          </p>
          <h2
            className="font-black"
            style={{ fontSize: 'clamp(32px, 4vw, 60px)', color: '#F0F0F0', letterSpacing: '-0.03em' }}
          >
            Simple. Rápido. Efectivo.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connecting line desktop */}
          <div
            className="hidden md:block absolute top-1/4 left-[16.7%] right-[16.7%] h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,255,135,0.3), transparent)' }}
          />

          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative text-center p-8 rounded-2xl"
              style={{
                background: '#111118',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Step number */}
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl font-black text-lg mb-6 mx-auto"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,255,135,0.15), rgba(0,212,255,0.1))',
                  border: '1px solid rgba(0,255,135,0.3)',
                  color: '#00FF87',
                }}
              >
                {step.num}
              </div>
              <div className="text-4xl mb-4">{step.icon}</div>
              <h3 className="font-bold text-xl mb-3" style={{ color: '#F0F0F0' }}>{step.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(240,240,240,0.5)' }}>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="productos" className="py-24 max-w-7xl mx-auto px-6" ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14"
      >
        <div>
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#00FF87' }}>
            Productos destacados
          </p>
          <h2
            className="font-black"
            style={{ fontSize: 'clamp(32px, 4vw, 60px)', color: '#F0F0F0', letterSpacing: '-0.03em' }}
          >
            Compra. Descarga.
            <br />
            <span style={{ color: 'rgba(240,240,240,0.4)' }}>Aplica hoy.</span>
          </h2>
        </div>
        <a
          href="#"
          className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ border: '1px solid rgba(0,255,135,0.3)', color: '#00FF87' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,135,0.05)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          Ver catálogo completo →
        </a>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRODUCTS.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="group relative rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.06)',
              transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = `${product.tagColor}40`;
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
              (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px ${product.tagColor}15`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            {/* Product header */}
            <div
              className="h-32 relative overflow-hidden flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${product.tagColor}15, ${product.tagColor}05)` }}
            >
              <span className="text-5xl">
                {i === 0 ? '📊' : i === 1 ? '♻️' : '🔍'}
              </span>
              <span
                className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold tracking-widest"
                style={{ background: `${product.tagColor}20`, color: product.tagColor, border: `1px solid ${product.tagColor}40` }}
              >
                {product.tag}
              </span>
            </div>

            {/* Product content */}
            <div className="p-6 flex flex-col flex-1">
              <h3 className="font-bold text-base mb-2" style={{ color: '#F0F0F0' }}>
                {product.name}
              </h3>
              <p className="text-sm mb-4 flex-1" style={{ color: 'rgba(240,240,240,0.5)', lineHeight: 1.6 }}>
                {product.desc}
              </p>

              {/* Meta */}
              <div className="flex gap-4 mb-5 text-xs" style={{ color: 'rgba(240,240,240,0.4)' }}>
                <span>📄 {product.pages}</span>
                <span>• {product.format}</span>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className="font-black text-xl" style={{ color: '#F0F0F0' }}>
                  {product.price}
                </span>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300"
                  style={{ background: `${product.tagColor}20`, color: product.tagColor }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${product.tagColor}35`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = `${product.tagColor}20`; }}
                >
                  Comprar →
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      className="py-24 overflow-hidden"
      style={{ background: '#0A0A0F' }}
      ref={ref}
    >
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#00FF87' }}>
            Resultados reales
          </p>
          <h2
            className="font-black"
            style={{ fontSize: 'clamp(32px, 4vw, 60px)', color: '#F0F0F0', letterSpacing: '-0.03em' }}
          >
            Lo que dicen
            <br />
            <span style={{ color: 'rgba(240,240,240,0.4)' }}>quienes ya confiaron.</span>
          </h2>
        </motion.div>
      </div>

      <InfiniteMovingCards
        items={TESTIMONIALS}
        direction="left"
        speed="slow"
        className="mx-auto"
      />
    </section>
  );
}

function AgendaSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="agenda" className="py-24 relative overflow-hidden" ref={ref}>
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(0,255,135,0.05) 0%, rgba(0,212,255,0.03) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,255,135,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,135,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Big emoji */}
          <div className="text-6xl mb-6">🗓️</div>
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#00FF87' }}>
            Agenda ahora
          </p>
          <h2
            className="font-black mb-4"
            style={{ fontSize: 'clamp(36px, 5vw, 80px)', color: '#F0F0F0', letterSpacing: '-0.03em' }}
          >
            El primer paso
            <br />
            <span style={{ background: 'linear-gradient(135deg, #00FF87, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              es agendarlo.
            </span>
          </h2>
          <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: 'rgba(240,240,240,0.55)', lineHeight: 1.7 }}>
            Elige el tipo de servicio, selecciona fecha y hora, y confirma. Sin llamadas previas.
            Sin formularios eternos.
          </p>

          {/* Mock calendar preview */}
          <div
            className="max-w-2xl mx-auto rounded-2xl p-6 mb-10"
            style={{ background: '#111118', border: '1px solid rgba(0,255,135,0.15)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-sm" style={{ color: '#F0F0F0' }}>Marzo 2026</span>
              <div className="flex gap-2">
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#F0F0F0' }}>‹</button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#F0F0F0' }}>›</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 text-xs mb-3">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <div key={d} className="text-center py-1 font-semibold" style={{ color: 'rgba(240,240,240,0.3)' }}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 text-xs">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <button
                  key={day}
                  className="py-2 rounded-lg text-center transition-all duration-200"
                  style={{
                    background: day === 17 ? 'linear-gradient(135deg, #00FF87, #00D4FF)' : [19, 20, 24, 25, 26].includes(day) ? 'rgba(0,255,135,0.12)' : 'transparent',
                    color: day === 17 ? '#0A0A0F' : [19, 20, 24, 25, 26].includes(day) ? '#00FF87' : day > 28 ? 'rgba(240,240,240,0.2)' : 'rgba(240,240,240,0.6)',
                    fontWeight: day === 17 ? 700 : 400,
                  }}
                >
                  {day <= 31 ? day : ''}
                </button>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/agenda"
              id="zeus-cta-agendar-real"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl text-base font-bold transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #00FF87, #00D4FF)',
                color: '#0A0A0F',
                boxShadow: '0 0 40px rgba(0,255,135,0.3)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 60px rgba(0,255,135,0.5)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(0,255,135,0.3)';
              }}
            >
              Ir al Calendario de Disponibilidad Real
            </a>
            <a
              href="https://wa.me/56900000000"
              target="_blank"
              rel="noopener noreferrer"
              id="zeus-cta-whatsapp"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300"
              style={{ border: '1px solid rgba(0,255,135,0.3)', color: '#F0F0F0' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,135,0.05)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span>💬</span> Consultar por WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      className="py-10 border-t"
      style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0A0A0F' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #00FF87, #00D4FF)' }}
            >
              <span className="text-[#0A0A0F]">Z</span>
            </div>
            <span className="font-bold text-white">
              Asesorías Zeus<span style={{ color: '#00FF87' }}>.</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm" style={{ color: 'rgba(240,240,240,0.4)' }}>
            {['Asesorías', 'Productos', 'Biblioteca', 'Contacto'].map(link => (
              <a key={link} href="#" className="hover:text-white transition-colors">{link}</a>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-xs" style={{ color: 'rgba(240,240,240,0.3)' }}>
            © 2026 Asesorías Zeus · asesoriaszeus.cl
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── PAGE PRINCIPAL ───────────────────────────────────────────────────────────

export default function ZeusPage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <ServicesSection />
      <HowItWorks />
      <ProductsSection />
      <TestimonialsSection />
      <AgendaSection />
    </>
  );
}
