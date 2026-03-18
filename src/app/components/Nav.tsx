'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Asesorías', href: '/asesorias' },
    { name: 'Técnico', href: '/tecnicos' },
    { name: 'Tienda', href: '/tienda' },
    { name: 'Biblioteca', href: '/biblioteca' },
    { name: 'Sobre Nosotros', href: '/nosotros' },
  ];

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
        <Link href="/" className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm"
            style={{ background: 'linear-gradient(135deg, #00FF87, #00D4FF)' }}
          >
            <span className="text-[#0A0A0F]">Z</span>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">
            Zeus<span style={{ color: '#00FF87' }}>.</span>
          </span>
        </Link>

        {/* Nav links desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: pathname === item.href ? '#00FF87' : 'rgba(240,240,240,0.6)' }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#00FF87')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = pathname === item.href ? '#00FF87' : 'rgba(240,240,240,0.6)')}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
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
          </Link>
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
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block py-3 text-sm font-medium border-b"
              style={{ color: 'rgba(240,240,240,0.7)', borderColor: 'rgba(0,255,135,0.1)' }}
              onClick={() => setMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          <Link
            href="/agenda"
            className="mt-4 block text-center px-5 py-3 rounded-lg text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #00FF87, #00D4FF)', color: '#0A0A0F' }}
            onClick={() => setMenuOpen(false)}
          >
            Agendar sesión
          </Link>
        </div>
      )}
    </nav>
  );
}
