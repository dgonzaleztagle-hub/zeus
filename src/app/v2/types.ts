export type ViewId = 'overview' | 'agenda' | 'asesorias' | 'tecnico' | 'empresas' | 'productos' | 'pagos';
export type ToastType = 'success' | 'error' | 'info';
export type ServiceType = 'asesoria' | 'tecnico' | 'empresas';
export type AgendaVisualStatus = 'paid' | 'pending' | 'manual_block';

export type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

