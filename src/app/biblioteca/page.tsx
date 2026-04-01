'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimatedGradient } from '@/components/premium/AnimatedGradient';

const INITIAL_ARTICLES = [
  {
    title: 'La Economía Circular en 2026',
    description: 'Tendencias globales y cómo aplicarlas a la logística local.',
    link: '/agenda',
    image_path: '/prospectos/zeus/biblioteca.png',
    category: 'Innovación'
  },
  {
    title: 'Guía de Descarbonización para PyMEs',
    description: 'Pasos críticos para reducir tu huella operativa hoy mismo.',
    link: '/asesorias',
    image_path: '/prospectos/zeus/hero.png',
    category: 'Sostenibilidad'
  }
];

export default function BibliotecaPage() {
  const [articles, setArticles] = useState<any[]>(INITIAL_ARTICLES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/zeus/services');
        const data = await res.json();
        // Filtramos solo los de tipo biblioteca
        const libArticles = (data.services?.filter((s: any) => s.type === 'biblioteca') || []).map((article: any) => ({
          ...article,
          link: article.href || '/biblioteca',
          image_path: article.image_path || '/prospectos/zeus/biblioteca.png',
          category: article.category || article.tag || 'Biblioteca',
        }));
        if (libArticles.length > 0) {
          setArticles(libArticles);
        }
      } catch (err) {
        console.error('Error fetching library articles:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  return (
    <div className="relative pt-32 pb-24 min-h-screen overflow-hidden">
      <AnimatedGradient
        colors={['#A78BFA05', '#00D4FF03', '#0A0A0F00']}
        speed={15}
        blur={120}
        opacity={1}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="mb-16">
          <span className="text-xs font-bold tracking-widest uppercase mb-4 block" style={{ color: '#A78BFA' }}>Repositorio Abierto</span>
          <h1 className="text-5xl md:text-7xl font-black mb-6" style={{ letterSpacing: '-.03em' }}>
            Biblioteca <br />
            <span style={{ color: '#F0F0F0' }}>Digital</span><span style={{ color: '#A78BFA' }}>.</span>
          </h1>
          <p className="text-lg max-w-xl text-white/40 leading-relaxed">
            Conocimiento libre para todos. Nuestra contribución a una sociedad más informada y sostenible. Sin muros de pago.
          </p>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap gap-4 mb-12">
           {['Todos', 'Sostenibilidad', 'Innovación', 'Guía Técnica', 'Casos de Éxito'].map(cat => (
             <button key={cat} className="px-6 py-2 rounded-full border border-white/5 text-xs font-bold transition-all hover:border-[#A78BFA] hover:text-[#A78BFA]">
               {cat}
             </button>
           ))}
        </div>

        {/* Bento Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
           {articles.map((art, i) => (
             <motion.div
               key={art.id || art.title}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1, duration: 0.8 }}
               className={`group rounded-3xl p-8 border border-white/5 bg-[#111118] relative overflow-hidden flex flex-col justify-end min-h-[400px] cursor-pointer ${i === 0 ? 'md:col-span-8' : 'md:col-span-4'}`}
             >
                <div 
                  className="absolute inset-0 opacity-20 grayscale scale-100 group-hover:scale-105 transition-transform duration-1000"
                  style={{ backgroundImage: `url(${art.image_path || '/prospectos/zeus/hero.png'})`, backgroundSize: 'cover', backgroundPosition: 'center' }} 
                />
                <div 
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, #111118 0%, transparent 100%)' }}
                />
                
                <div className="relative z-10">
                   <div className="text-[9px] font-black tracking-widest uppercase mb-3 inline-block px-2 py-1 rounded bg-white/5" style={{ color: '#A78BFA' }}>{art.category || art.tag || 'Biblioteca'}</div>
                   <h3 className="text-2xl font-black mb-2 group-hover:text-[#A78BFA] transition-colors">{art.title}</h3>
                   <p className="text-sm text-white/40 mb-6 max-w-md line-clamp-2">{art.description}</p>
                   <a href={art.link || '/biblioteca'} className="flex items-center gap-2 text-xs font-black">
                      Leer artículo <span className="translate-x-0 group-hover:translate-x-2 transition-transform">→</span>
                   </a>
                </div>
             </motion.div>
           ))}
        </div>
      </div>
    </div>
  );
}
