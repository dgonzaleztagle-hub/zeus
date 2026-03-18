import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="py-12 border-t mt-auto"
      style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#0A0A0F' }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Logo & Info */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs"
                style={{ background: 'linear-gradient(135deg, #00FF87, #00D4FF)' }}
              >
                <span className="text-[#0A0A0F]">Z</span>
              </div>
              <span className="font-bold text-white tracking-tight">
                Asesorías Zeus<span style={{ color: '#00FF87' }}>.</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(240,240,240,0.4)' }}>
              Transformamos negocios y carreras a través de la tecnología aplicada y la sostenibilidad real. 
              Arquitectos de la Economía Circular.
            </p>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-6">Servicios</h4>
            <div className="flex flex-col gap-4 text-sm" style={{ color: 'rgba(240,240,240,0.4)' }}>
              <Link href="/asesorias" className="hover:text-[#00FF87] transition-colors">Asesorías Online</Link>
              <Link href="/tecnicos" className="hover:text-[#00FF87] transition-colors">Servicio Técnico</Link>
              <Link href="/agenda" className="hover:text-[#00FF87] transition-colors">Agendar Sesión</Link>
            </div>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="text-white text-xs font-bold tracking-widest uppercase mb-6">Plataforma</h4>
            <div className="flex flex-col gap-4 text-sm" style={{ color: 'rgba(240,240,240,0.4)' }}>
              <Link href="/tienda" className="hover:text-[#00FF87] transition-colors">Tienda Digital</Link>
              <Link href="/biblioteca" className="hover:text-[#00FF87] transition-colors">Biblioteca</Link>
              <Link href="/contacto" className="hover:text-[#00FF87] transition-colors">Contacto</Link>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[10px] tracking-widest uppercase" style={{ color: 'rgba(240,240,240,0.2)' }}>
            © {currentYear} Asesorías Zeus · Santiago de Chile
          </p>
          <div className="flex items-center gap-2">
             <span className="text-[10px] tracking-widest uppercase" style={{ color: 'rgba(240,240,240,0.2)' }}>Powered by</span>
             <span className="font-black text-[10px] tracking-tight" style={{ color: 'rgba(240,240,240,0.4)' }}>HojaCero<span style={{ color: '#00FF87' }}>.</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
