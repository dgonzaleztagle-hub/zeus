import type { ServiceType, ViewId } from './types';

export const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-zeus-bypass': 'zeus_master_key_2026',
};

export const HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export const SIDEBAR_ITEMS: Array<{ id: ViewId; label: string; helper: string }> = [
  { id: 'overview', label: 'Resumen', helper: 'Estado general del negocio' },
  { id: 'agenda', label: 'Agenda', helper: 'Reservas y bloqueos manuales' },
  { id: 'asesorias', label: 'Asesorías', helper: 'Servicios de acompañamiento' },
  { id: 'tecnico', label: 'Técnico', helper: 'Servicios operativos y soporte' },
  { id: 'empresas', label: 'Empresas', helper: 'Oferta corporativa y B2B' },
  { id: 'productos', label: 'Productos', helper: 'Biblioteca e inventario digital' },
  { id: 'pagos', label: 'Pagos', helper: 'Transacciones confirmadas' },
];

export const EMPTY_PRODUCT = {
  name: '',
  price: 0,
  description: '',
  is_free: false,
  file_path: '',
  image_url: '',
};

export const EMPTY_SERVICE: {
  id: string;
  type: ServiceType;
  tag: string;
  title: string;
  description: string;
  icon: string;
  cta: string;
  price_label: string;
  accent_color: string;
  size: string;
  href: string;
  sort_order: number;
  price: number;
} = {
  id: '',
  type: 'asesoria',
  tag: '',
  title: '',
  description: '',
  icon: '',
  cta: '',
  price_label: '',
  accent_color: '#0EA5E9',
  size: 'medium',
  href: '',
  sort_order: 0,
  price: 0,
};

