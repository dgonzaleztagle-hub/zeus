'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedGradient } from '@/components/premium/AnimatedGradient';
import * as ConfettiModule from 'canvas-confetti';
import MercadoPagoModal from '@/components/MercadoPagoModal';

const confetti = (ConfettiModule as any).default || ConfettiModule;

export default function TiendaPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [simulatingPaymentId, setSimulatingPaymentId] = useState<string | null>(null);
  const [payModal, setPayModal] = useState<{ open: boolean; product: any | null }>({
    open: false, product: null,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/zeus/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = (product: any) => {
    if (product.is_free) {
      handleDownload(product);
      return;
    }
    setPayModal({ open: true, product });
  };

  const getFileNameFromProduct = (product: any) => {
    const rawPath = String(product?.file_path || 'recurso.pdf');
    const fromPath = rawPath.split('/').pop() || 'recurso.pdf';
    return fromPath;
  };

  const forceBrowserDownload = async (url: string, fileName: string) => {
    const fileRes = await fetch(url);
    if (!fileRes.ok) throw new Error('No se pudo descargar el archivo');

    const blob = await fileRes.blob();
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(objectUrl);
  };

  const handleDownload = async (product: any) => {
    const productId = product.id;
    setDownloadingId(productId);
    try {
      // Obtener email del usuario si lo tiene (opcional)
      let userEmail: string | undefined;
      // TODO: Implementar cuando Supabase client esté disponible
      // const { data: { user } } = await supabase.auth.getUser();
      // userEmail = user?.email;

      // 1. Obtener un token de un solo uso
      const tokenRes = await fetch('/api/zeus/download/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product_id: productId,
          client_email: userEmail || null
        })
      });
      const tokenData = await tokenRes.json();
      
      if (!tokenData.token) throw new Error(tokenData.error || 'No se pudo generar el token');

      // 2. Solicitar la URL de descarga con el token
      const res = await fetch(`/api/zeus/download?token=${tokenData.token}`);
      const data = await res.json();

      if (data.download_url) {
        const fileName = getFileNameFromProduct(product);
        try {
          await forceBrowserDownload(data.download_url, fileName);
        } catch {
          // Fallback si el navegador bloquea el flujo programático
          window.location.href = data.download_url;
        }
      } else {
        alert(data.error || 'Error al generar descarga');
      }
    } catch (error: any) {
      alert(error.message || 'Error en el servidor de descargas');
    } finally {
      setDownloadingId(null);
    }
  };

  const paidProducts = products.filter(p => !p.is_free);
  const freeProducts = products.filter(p => p.is_free);

  return (
    <div className="relative pt-32 pb-24 min-h-screen overflow-hidden text-white">
      <AnimatedGradient
        colors={['#0EA5E905', '#00D4FF03', '#0A0A0F00']}
        speed={15}
        blur={120}
        opacity={1}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="mb-16">
          <span className="text-xs font-bold tracking-widest uppercase mb-4 block" style={{ color: '#0EA5E9' }}>Tienda Digital</span>
          <h1 className="text-5xl md:text-7xl font-black mb-6" style={{ letterSpacing: '-.03em' }}>
            Acelera tu <span style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Impacto.</span>
          </h1>
          <p className="text-lg max-w-xl text-white/50 leading-relaxed font-semibold">
            Herramientas diseñadas para la implementación inmediata. Sin teoría vacía, solo resultados accionables.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[400px] bg-white/5 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
              {paidProducts.map((prod, i) => (
                <motion.div
                  key={prod.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.8 }}
                  className="group bg-[#111118] border border-white/5 rounded-3xl p-8 flex flex-col relative transition-all hover:border-white/10 hover:shadow-2xl translate-y-0 hover:-translate-y-2"
                >
                  {/* Imagen de Portada */}
                  <div className="absolute inset-x-0 top-0 h-40 overflow-hidden rounded-t-3xl opacity-20 group-hover:opacity-40 transition-opacity">
                     {prod.image_url ? (
                       <img src={prod.image_url} className="w-full h-full object-cover" alt="" />
                     ) : (
                       <div className="w-full h-full bg-gradient-to-br from-[#0EA5E920] to-transparent" />
                     )}
                  </div>
                  
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="text-5xl group-hover:scale-110 transition-transform">💎</div>
                    <span className="px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase" 
                          style={{ background: `#0EA5E915`, color: '#0EA5E9', border: `1px solid #0EA5E930` }}>
                      Premium
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 relative z-10">{prod.name}</h3>
                  <p className="text-sm text-white/40 leading-relaxed mb-8 flex-1 relative z-10">{prod.description}</p>
                  
                  <div className="flex flex-col gap-4 mt-auto relative z-10">
                     <div className="text-2xl font-black leading-none">${prod.price.toLocaleString('es-CL')}</div>
                     <button
                       onClick={() => handleBuy(prod)}
                       disabled={downloadingId === prod.id}
                       className="w-full h-14 rounded-xl flex items-center justify-center font-bold transition-all duration-300 bg-white/5 border border-white/10 hover:bg-[#0EA5E9] hover:text-[#0A0A0F]"
                     >
                       {downloadingId === prod.id ? 'Generando descarga...' : 'Comprar →'}
                     </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recursos Gratuitos */}
            {freeProducts.length > 0 && (
              <div className="mt-24">
                <div className="flex items-center gap-4 mb-12">
                   <h2 className="text-3xl font-black">Recursos <span className="text-[#00D4FF]">Gratuitos.</span></h2>
                   <div className="h-px flex-1 bg-white/10" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   {freeProducts.map((prod, i) => (
                      <motion.div
                         key={prod.id}
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ delay: i * 0.1 }}
                         className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-[#00D4FF]/30 transition-all flex flex-col"
                      >
                         <div className="flex gap-4 mb-4">
                            {prod.image_url ? (
                              <img src={prod.image_url} className="w-12 h-12 rounded-lg object-cover border border-white/10" alt="" />
                            ) : (
                              <div className="text-2xl">🎁</div>
                            )}
                            <div>
                               <h4 className="font-bold text-sm mb-1 group-hover:text-[#00D4FF] transition-colors">{prod.name}</h4>
                               <span className="text-[8px] uppercase tracking-widest text-white/20 font-black">Recurso Gratuito</span>
                            </div>
                         </div>
                         <button 
                            disabled={downloadingId === prod.id}
                             onClick={() => handleDownload(prod)}
                            className="mt-auto text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors flex items-center gap-2"
                         >
                            {downloadingId === prod.id ? 'Generando...' : 'Descargar ahora →'}
                         </button>
                      </motion.div>
                   ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Trust Signals */}
        <div className="mt-24 pt-12 border-t border-white/5 flex flex-wrap gap-12 justify-center opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
           <span className="font-black tracking-tighter text-xl uppercase">Powered by HojaCero Store Engine</span>
        </div>
      </div>

      {/* Modal de pago embebido con Mercado Pago */}
      {payModal.product && (
        <MercadoPagoModal
          isOpen={payModal.open}
          onClose={() => setPayModal({ open: false, product: null })}
          type="product"
          itemId={payModal.product.id}
          itemName={payModal.product.name}
          amount={payModal.product.price}
        />
      )}
    </div>
  );
}
