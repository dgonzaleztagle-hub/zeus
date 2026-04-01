import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const zeusSupabaseUrl = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL;
const zeusServiceRoleKey = process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY;

if (!zeusSupabaseUrl || !zeusServiceRoleKey) {
  throw new Error('Faltan variables ZEUS de Supabase en el entorno');
}

const supabase = createClient(zeusSupabaseUrl, zeusServiceRoleKey);

const SERVICE_DEFAULTS: Record<string, {
  tag: string;
  cta: string;
  href: string;
  image_path: string;
  icon: string;
}> = {
  asesoria: {
    tag: 'SERVICIO PRINCIPAL',
    cta: 'Agendar sesión',
    href: '/asesorias',
    image_path: '/prospectos/zeus/asesorias.png',
    icon: '⚡',
  },
  tecnico: {
    tag: 'SOPORTE ESPECIALIZADO',
    cta: 'Ver soporte',
    href: '/tecnicos',
    image_path: '/prospectos/zeus/tecnicos.png',
    icon: '🔧',
  },
  empresas: {
    tag: 'ESCALA EMPRESARIAL',
    cta: 'Solicitar asesoría',
    href: '/agenda',
    image_path: '/prospectos/zeus/hero.png',
    icon: '🏢',
  },
  digitales: {
    tag: 'CATÁLOGO',
    cta: 'Explorar catálogo',
    href: '/tienda',
    image_path: '/prospectos/zeus/products.png',
    icon: '📦',
  },
  biblioteca: {
    tag: 'REPOSITORIO ABIERTO',
    cta: 'Explorar biblioteca',
    href: '/biblioteca',
    image_path: '/prospectos/zeus/biblioteca.png',
    icon: '📚',
  },
};

function normalizePublicService(service: any) {
  const defaults = SERVICE_DEFAULTS[service.type] || {
    tag: 'SERVICIO',
    cta: 'Ver más',
    href: '/agenda',
    image_path: '/prospectos/zeus/hero.png',
    icon: '✨',
  };

  return {
    ...service,
    name: service.name || service.title,
    title: service.title || service.name || 'Servicio Zeus',
    tag: service.tag || defaults.tag,
    cta: service.cta || defaults.cta,
    href: service.href || defaults.href,
    image_path: service.image_path || defaults.image_path,
    icon: service.icon || defaults.icon,
    price_label: service.price_label || 'Consultar',
  };
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('zeus_services')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const services = (data || [])
      .filter((service: any) => service?.status !== 'inactive' && service?.active !== false)
      .map(normalizePublicService);

    return NextResponse.json({ services });
  } catch (error: any) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
