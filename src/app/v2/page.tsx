'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { addDays, eachDayOfInterval, format, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

type ViewId = 'overview' | 'agenda' | 'asesorias' | 'tecnico' | 'empresas' | 'productos' | 'pagos';
type ToastType = 'success' | 'error' | 'info';
type ServiceType = 'asesoria' | 'tecnico' | 'empresas';

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-zeus-bypass': 'zeus_master_key_2026',
};

const HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const SIDEBAR_ITEMS: Array<{ id: ViewId; label: string; helper: string }> = [
  { id: 'overview', label: 'Resumen', helper: 'Estado general del negocio' },
  { id: 'agenda', label: 'Agenda', helper: 'Reservas y bloqueos manuales' },
  { id: 'asesorias', label: 'Asesorías', helper: 'Servicios de acompañamiento' },
  { id: 'tecnico', label: 'Técnico', helper: 'Servicios operativos y soporte' },
  { id: 'empresas', label: 'Empresas', helper: 'Oferta corporativa y B2B' },
  { id: 'productos', label: 'Productos', helper: 'Biblioteca e inventario digital' },
  { id: 'pagos', label: 'Pagos', helper: 'Transacciones confirmadas' },
];

const EMPTY_PRODUCT = {
  name: '',
  price: 0,
  description: '',
  is_free: false,
  file_path: '',
  image_url: '',
};

const EMPTY_SERVICE = {
  id: '',
  type: 'asesoria' as ServiceType,
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

function Toast({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const tone =
    item.type === 'success'
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
      : item.type === 'error'
        ? 'border-red-400/20 bg-red-400/10 text-red-300'
        : 'border-white/10 bg-white/5 text-white/80';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, x: 12 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${tone}`}
    >
      <div className="text-sm font-black uppercase tracking-[0.22em]">{item.type}</div>
      <p className="text-sm font-semibold">{item.message}</p>
      <button onClick={onClose} className="ml-2 text-white/40 hover:text-white">
        ✕
      </button>
    </motion.div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <div className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300/80">{eyebrow}</div>
        <h1 className="text-3xl font-black tracking-[-0.04em] md:text-4xl">{title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-white/45">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/30">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{value}</div>
      <div className="mt-2 text-xs leading-relaxed text-white/35">{hint}</div>
    </div>
  );
}

function ModuleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-white/8 bg-[#10131C]/88 shadow-[0_26px_120px_rgba(0,0,0,0.32)]">
      <div className="border-b border-white/6 px-6 py-4">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/35">{title}</div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export default function AdminV2Page() {
  const zeusSupabaseUrl = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL;
  const zeusSupabaseAnonKey = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_ANON_KEY;

  if (!zeusSupabaseUrl || !zeusSupabaseAnonKey) {
    throw new Error('Faltan variables ZEUS públicas para admin v2.');
  }

  const supabase = useMemo(
    () => createBrowserClient(zeusSupabaseUrl, zeusSupabaseAnonKey),
    [zeusSupabaseUrl, zeusSupabaseAnonKey],
  );

  const [view, setView] = useState<ViewId>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);
  const [newService, setNewService] = useState(EMPTY_SERVICE);
  const [serviceToDeactivate, setServiceToDeactivate] = useState<any | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingService, setIsSavingService] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.round(Math.random() * 1000);
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [bookingsResult, paidBookingsResult, productsResponse, servicesResponse] = await Promise.all([
          supabase.from('zeus_bookings').select('*').order('booking_date', { ascending: true }),
          supabase.from('zeus_bookings').select('*').eq('payment_status', 'paid').not('client_name', 'eq', 'ADMIN_BLOCK').order('created_at', { ascending: false }),
          fetch('/api/zeus/admin/products', { headers: ADMIN_HEADERS }),
          fetch('/api/zeus/admin/services', { headers: ADMIN_HEADERS }),
        ]);

        if (bookingsResult.error) throw bookingsResult.error;
        if (paidBookingsResult.error) throw paidBookingsResult.error;

        const productsJson = await productsResponse.json();
        const servicesJson = await servicesResponse.json();

        if (!productsResponse.ok) throw new Error(productsJson.error || 'No se pudo cargar productos');
        if (!servicesResponse.ok) throw new Error(servicesJson.error || 'No se pudo cargar servicios');

        setBookings(bookingsResult.data || []);
        setPayments(paidBookingsResult.data || []);
        setProducts(productsJson.products || []);
        setServices(servicesJson.services || []);
      } catch (error: any) {
        addToast(error.message || 'No pudimos cargar el panel.', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [refreshTick, supabase]);

  const paidBookings = useMemo(
    () => bookings.filter((booking) => booking.payment_status === 'paid' && booking.client_name !== 'ADMIN_BLOCK'),
    [bookings],
  );

  const servicesByType = useMemo(() => ({
    asesoria: services.filter((service) => service.type === 'asesoria'),
    tecnico: services.filter((service) => service.type === 'tecnico'),
    empresas: services.filter((service) => service.type === 'empresas'),
  }), [services]);

  const currentServices = useMemo(() => {
    if (view === 'asesorias') return servicesByType.asesoria;
    if (view === 'tecnico') return servicesByType.tecnico;
    if (view === 'empresas') return servicesByType.empresas;
    return [];
  }, [servicesByType, view]);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const nextBookings = useMemo(() => {
    const now = new Date();
    return paidBookings
      .filter((booking) => {
        const bookingDate = new Date(`${booking.booking_date}T${booking.booking_slot || '00:00'}:00`);
        return bookingDate >= now;
      })
      .slice(0, 6);
  }, [paidBookings]);

  const monthPayments = useMemo(() => {
    const now = new Date();
    return payments.filter((payment) => {
      const date = new Date(payment.created_at);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  }, [payments]);

  const monthlyRevenue = monthPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const historicalRevenue = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const averageTicket = payments.length ? Math.round(historicalRevenue / payments.length) : 0;

  async function refreshData() {
    setRefreshTick((current) => current + 1);
  }

  async function handleBlockSlot(slot: string) {
    setIsBlocking(true);
    try {
      const { error } = await supabase.from('zeus_bookings').insert({
        client_name: 'ADMIN_BLOCK',
        client_email: 'admin@zeus.sh',
        service_name: 'Bloqueo Manual',
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        booking_slot: slot,
        payment_status: 'paid',
        amount: 0,
      });

      if (error) throw error;
      addToast(`Horario ${slot} bloqueado`, 'success');
      refreshData();
    } catch (error: any) {
      addToast(error.message || 'No se pudo bloquear el horario.', 'error');
    } finally {
      setIsBlocking(false);
    }
  }

  async function handleUnblockSlot(slot: string) {
    setIsBlocking(true);
    try {
      const { error } = await supabase
        .from('zeus_bookings')
        .delete()
        .match({
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          booking_slot: slot,
          client_name: 'ADMIN_BLOCK',
        });

      if (error) throw error;
      addToast(`Horario ${slot} liberado`, 'success');
      refreshData();
    } catch (error: any) {
      addToast(error.message || 'No se pudo liberar el horario.', 'error');
    } finally {
      setIsBlocking(false);
    }
  }

  function normalizeFileName(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ñ/g, 'n')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9.-]/g, '')
      .replace(/-+/g, '-');
  }

  async function uploadViaSignedUrl(file: File, path: string) {
    const response = await fetch('/api/zeus/admin/upload-url', {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ path, bucket: 'zeus-assets' }),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.error || 'No se pudo preparar la subida');
    }

    const { error } = await supabase.storage.from('zeus-assets').uploadToSignedUrl(path, json.token, file, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    });

    if (error) throw error;
  }

  async function handleProductFileUpload(file: File) {
    setIsUploadingFile(true);
    try {
      const fileName = `${Date.now()}-${normalizeFileName(file.name)}`;
      const filePath = `uploads/${fileName}`;
      await uploadViaSignedUrl(file, filePath);
      setNewProduct((current) => ({ ...current, file_path: filePath }));
      addToast('Archivo del producto subido', 'success');
    } catch (error: any) {
      addToast(error.message || 'No se pudo subir el archivo.', 'error');
    } finally {
      setIsUploadingFile(false);
    }
  }

  async function handleProductCoverUpload(file: File) {
    setIsUploadingCover(true);
    try {
      const fileName = `cover-${Date.now()}-${normalizeFileName(file.name)}`;
      const filePath = `covers/${fileName}`;
      await uploadViaSignedUrl(file, filePath);
      setNewProduct((current) => ({ ...current, image_url: filePath }));
      setCoverPreviewUrl(URL.createObjectURL(file));
      addToast('Portada subida', 'success');
    } catch (error: any) {
      addToast(error.message || 'No se pudo subir la portada.', 'error');
    } finally {
      setIsUploadingCover(false);
    }
  }

  async function handleSaveProduct() {
    if (!newProduct.name || !newProduct.file_path) {
      addToast('Nombre y archivo son obligatorios.', 'error');
      return;
    }

    if (!newProduct.is_free && Number(newProduct.price || 0) < 1000) {
      addToast('Los productos pagados deben costar al menos $1.000 CLP.', 'error');
      return;
    }

    setIsSavingProduct(true);
    try {
      const response = await fetch('/api/zeus/admin/products', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify(newProduct),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo guardar el producto');

      addToast('Producto publicado', 'success');
      setNewProduct(EMPTY_PRODUCT);
      setCoverPreviewUrl('');
      refreshData();
    } catch (error: any) {
      addToast(error.message || 'No se pudo guardar el producto.', 'error');
    } finally {
      setIsSavingProduct(false);
    }
  }

  async function handleDeleteProduct(productId: string) {
    setDeletingProductId(productId);
    try {
      const response = await fetch(`/api/zeus/admin/products?id=${productId}`, {
        method: 'DELETE',
        headers: { 'x-zeus-bypass': 'zeus_master_key_2026' },
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo eliminar');

      addToast('Producto desactivado', 'success');
      refreshData();
    } catch (error: any) {
      addToast(error.message || 'No se pudo eliminar el producto.', 'error');
    } finally {
      setDeletingProductId(null);
    }
  }

  async function handleSaveService() {
    if (!newService.title) {
      addToast('El título del servicio es obligatorio.', 'error');
      return;
    }

    if (Number(newService.price || 0) > 0 && Number(newService.price || 0) < 1000) {
      addToast('Los servicios pagados deben costar al menos $1.000 CLP.', 'error');
      return;
    }

    setIsSavingService(true);
    try {
      const response = await fetch('/api/zeus/admin/services', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify(newService),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo guardar el servicio');

      addToast(newService.id ? 'Servicio actualizado' : 'Servicio creado', 'success');
      setNewService({
        ...EMPTY_SERVICE,
        type: (view === 'asesorias' || view === 'tecnico' || view === 'empresas' ? view : 'asesoria') as ServiceType,
      });
      refreshData();
    } catch (error: any) {
      addToast(error.message || 'No se pudo guardar el servicio.', 'error');
    } finally {
      setIsSavingService(false);
    }
  }

  async function handleDeactivateService(serviceId: string) {
    setDeletingServiceId(serviceId);
    try {
      const response = await fetch(`/api/zeus/admin/services?id=${serviceId}`, {
        method: 'DELETE',
        headers: { 'x-zeus-bypass': 'zeus_master_key_2026' },
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo desactivar');

      addToast('Servicio desactivado', 'success');
      setServiceToDeactivate(null);
      refreshData();
    } catch (error: any) {
      addToast(error.message || 'No se pudo desactivar el servicio.', 'error');
    } finally {
      setDeletingServiceId(null);
    }
  }

  async function handleReactivateService(service: any) {
    setDeletingServiceId(service.id);
    try {
      const response = await fetch('/api/zeus/admin/services', {
        method: 'POST',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          ...service,
          active: true,
          status: 'active',
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo reactivar');

      addToast('Servicio reactivado', 'success');
      refreshData();
    } catch (error: any) {
      addToast(error.message || 'No se pudo reactivar el servicio.', 'error');
    } finally {
      setDeletingServiceId(null);
    }
  }

  const serviceDraftLabel =
    view === 'asesorias' || view === 'tecnico' || view === 'empresas'
      ? view
      : 'asesoria';

  const renderOverview = () => (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Control Central"
        title="Un panel que sí separa operación, oferta y dinero."
        description="La idea de v2 es que cada módulo tenga una responsabilidad clara. No más mezclar agenda, catálogo, servicios y pagos como si fueran la misma cosa."
        action={
          <button
            onClick={refreshData}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.24em] text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            {loading ? 'Sincronizando' : 'Refrescar'}
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Reservas pagadas" value={String(paidBookings.length)} hint="Reservas reales confirmadas, sin mezclar bloqueos manuales." />
        <StatCard label="Ingresos del mes" value={`$${monthlyRevenue.toLocaleString('es-CL')}`} hint="Lectura rápida de tracción mensual para no ir al detalle cada vez." />
        <StatCard label="Productos activos" value={String(products.length)} hint="Biblioteca digital disponible para compra o descarga." />
        <StatCard label="Servicios activos" value={String(services.filter((service) => service.active !== false).length)} hint="Oferta visible distribuida entre asesorías, técnico y empresas." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <ModuleCard title="Próximas reservas">
          {nextBookings.length === 0 ? (
            <p className="text-sm text-white/35">No hay reservas próximas confirmadas.</p>
          ) : (
            <div className="space-y-3">
              {nextBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3">
                  <div>
                    <div className="font-bold text-white">{booking.client_name}</div>
                    <div className="text-xs text-white/35">{booking.service_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-cyan-300">{booking.booking_slot}</div>
                    <div className="text-[11px] text-white/35">{booking.booking_date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ModuleCard>

        <ModuleCard title="Mix de oferta">
          <div className="space-y-3">
            {[
              { label: 'Asesorías', value: servicesByType.asesoria.length, accent: '#67E8F9' },
              { label: 'Técnico', value: servicesByType.tecnico.length, accent: '#FCD34D' },
              { label: 'Empresas', value: servicesByType.empresas.length, accent: '#A78BFA' },
              { label: 'Productos', value: products.length, accent: '#34D399' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-white">{item.label}</div>
                  <div className="text-2xl font-black" style={{ color: item.accent }}>
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ModuleCard>
      </div>
    </div>
  );

  const renderAgenda = () => (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Agenda"
        title="Disponibilidad y operación diaria."
        description="Aquí solo viven reservas y bloqueos. Nada de producto, catálogo ni formularios que no pertenezcan a la agenda."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ModuleCard title="Semana activa">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
            {weekDays.map((day) => {
              const dayBookings = bookings.filter((booking) => isSameDay(new Date(`${booking.booking_date}T12:00:00`), day));
              const isSelected = isSameDay(day, selectedDate);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`rounded-2xl border px-3 py-4 text-left transition ${
                    isSelected ? 'border-cyan-300/60 bg-cyan-300/10' : 'border-white/6 bg-white/[0.02] hover:border-white/15'
                  }`}
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
                    {format(day, 'EEE', { locale: es })}
                  </div>
                  <div className="mt-2 text-2xl font-black">{format(day, 'd')}</div>
                  <div className="mt-3 flex gap-1">
                    {dayBookings.slice(0, 5).map((booking, index) => (
                      <span
                        key={`${booking.id}-${index}`}
                        className={`h-1.5 w-5 rounded-full ${booking.client_name === 'ADMIN_BLOCK' ? 'bg-white/20' : 'bg-cyan-300'}`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </ModuleCard>

        <ModuleCard title={`Bloqueos para ${format(selectedDate, "d 'de' MMMM", { locale: es })}`}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {HOURS.map((hour) => {
              const booking = bookings.find(
                (item) => isSameDay(new Date(`${item.booking_date}T12:00:00`), selectedDate) && item.booking_slot === hour,
              );
              const isOccupied = Boolean(booking);
              const isAdminBlock = booking?.client_name === 'ADMIN_BLOCK';

              return (
                <button
                  key={hour}
                  disabled={(isOccupied && !isAdminBlock) || isBlocking}
                  onClick={() => (isAdminBlock ? handleUnblockSlot(hour) : handleBlockSlot(hour))}
                  className={`rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.2em] transition ${
                    isAdminBlock
                      ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200 hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300'
                      : isOccupied
                        ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-white/20'
                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-cyan-300/40 hover:text-white'
                  }`}
                >
                  {hour}
                </button>
              );
            })}
          </div>
        </ModuleCard>
      </div>

      <ModuleCard title="Reservas registradas">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-white/6 text-[10px] font-black uppercase tracking-[0.28em] text-white/25">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Servicio</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-white/5 text-sm text-white/75">
                  <td className="px-4 py-4 font-semibold">{booking.client_name === 'ADMIN_BLOCK' ? 'Bloqueo manual' : booking.client_name}</td>
                  <td className="px-4 py-4">{booking.service_name}</td>
                  <td className="px-4 py-4">{booking.booking_date} · {booking.booking_slot}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
                      {booking.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ModuleCard>
    </div>
  );

  const renderServices = (typeLabel: string) => (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Servicios"
        title={typeLabel}
        description="Cada familia vive en su propio módulo. Así la navegación responde al negocio y no a cómo se fue parchando el panel anterior."
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ModuleCard title={`Listado ${typeLabel.toLowerCase()}`}>
          <div className="space-y-3">
            {currentServices.length === 0 ? (
              <p className="text-sm text-white/35">Todavía no hay servicios registrados en esta familia.</p>
            ) : (
              currentServices.map((service) => (
                <div key={service.id} className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="text-2xl">{service.icon || '⚡'}</div>
                      <div>
                        <div className="font-bold text-white">{service.title}</div>
                        <div className="mt-1 text-xs text-white/35">{service.description}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em]" style={{ borderColor: `${service.accent_color}30`, color: service.accent_color }}>
                            {service.tag || 'Sin tag'}
                          </span>
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                            ${(Number(service.price) || 0).toLocaleString('es-CL')}
                          </span>
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${service.active === false ? 'border-red-400/30 text-red-300' : 'border-emerald-400/30 text-emerald-300'}`}>
                            {service.active === false ? 'Inactivo' : 'Activo'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-3">
                      <button onClick={() => setNewService({ ...service })} className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300/80 hover:text-cyan-200">
                        Editar
                      </button>
                      {service.active === false ? (
                        <button onClick={() => handleReactivateService(service)} disabled={deletingServiceId === service.id} className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300/80 hover:text-emerald-200 disabled:opacity-40">
                          Reactivar
                        </button>
                      ) : (
                        <button onClick={() => setServiceToDeactivate(service)} disabled={deletingServiceId === service.id} className="text-xs font-black uppercase tracking-[0.2em] text-red-300/80 hover:text-red-200 disabled:opacity-40">
                          Desactivar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ModuleCard>

        <ModuleCard title={newService.id ? 'Editar servicio' : 'Nuevo servicio'}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Título</label>
              <input value={newService.title} onChange={(event) => setNewService((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Tipo</label>
                <select value={newService.type} onChange={(event) => setNewService((current) => ({ ...current, type: event.target.value as ServiceType }))} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-cyan-300/40">
                  <option value="asesoria">Asesoría</option>
                  <option value="tecnico">Técnico</option>
                  <option value="empresas">Empresas</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Icono</label>
                <input value={newService.icon} onChange={(event) => setNewService((current) => ({ ...current, icon: event.target.value }))} placeholder="⚡" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Descripción</label>
              <textarea value={newService.description} onChange={(event) => setNewService((current) => ({ ...current, description: event.target.value }))} className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Tag</label>
                <input value={newService.tag} onChange={(event) => setNewService((current) => ({ ...current, tag: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Label comercial</label>
                <input value={newService.price_label} onChange={(event) => setNewService((current) => ({ ...current, price_label: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Precio real</label>
              <input type="number" value={newService.price || 0} onChange={(event) => setNewService((current) => ({ ...current, price: parseInt(event.target.value, 10) || 0 }))} className="w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-3 text-sm font-bold text-cyan-200 outline-none focus:border-cyan-300/40" />
              {Number(newService.price || 0) > 0 && Number(newService.price || 0) < 1000 && (
                <p className="mt-2 text-xs font-semibold text-amber-300">El mínimo de cobro actual es $1.000 CLP.</p>
              )}
            </div>
            <button onClick={handleSaveService} disabled={isSavingService || !newService.title} className="w-full rounded-2xl bg-cyan-300 px-4 py-4 text-xs font-black uppercase tracking-[0.28em] text-[#081019] transition hover:brightness-110 disabled:opacity-40">
              {isSavingService ? 'Guardando' : newService.id ? 'Actualizar servicio' : 'Crear servicio'}
            </button>
            {newService.id && (
              <button onClick={() => setNewService({ ...EMPTY_SERVICE, type: serviceDraftLabel as ServiceType })} className="w-full text-xs font-black uppercase tracking-[0.24em] text-white/35 hover:text-white">
                Cancelar edición
              </button>
            )}
          </div>
        </ModuleCard>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Biblioteca"
        title="Inventario digital y activos descargables."
        description="Productos, archivos y portadas viven juntos, en su propio módulo. Eso deja de competir con la agenda y los servicios."
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ModuleCard title="Inventario activo">
          <div className="space-y-3">
            {products.length === 0 ? (
              <p className="text-sm text-white/35">No hay productos activos todavía.</p>
            ) : (
              products.map((product) => (
                <div key={product.id} className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-4">
                  <div>
                    <div className="font-bold text-white">{product.name}</div>
                    <div className="mt-1 text-xs text-white/35">{product.description || 'Sin descripción corta'}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-black text-cyan-200">${(Number(product.price) || 0).toLocaleString('es-CL')}</div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{product.is_free ? 'Gratis' : 'Premium'}</div>
                    </div>
                    <button onClick={() => handleDeleteProduct(product.id)} disabled={deletingProductId === product.id} className="text-xs font-black uppercase tracking-[0.2em] text-red-300/80 hover:text-red-200 disabled:opacity-40">
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ModuleCard>

        <ModuleCard title="Publicar producto">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Nombre</label>
              <input value={newProduct.name} onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" />
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Precio</label>
                <input type="number" value={newProduct.price || 0} onChange={(event) => setNewProduct((current) => ({ ...current, price: parseInt(event.target.value, 10) || 0 }))} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" />
              </div>
              <label className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white/55">
                <input type="checkbox" checked={newProduct.is_free} onChange={(event) => setNewProduct((current) => ({ ...current, is_free: event.target.checked }))} />
                Gratis
              </label>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Descripción</label>
              <textarea value={newProduct.description} onChange={(event) => setNewProduct((current) => ({ ...current, description: event.target.value }))} className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" />
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Archivo digital</div>
              <input type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleProductFileUpload(file); }} className="mt-3 w-full text-xs text-white/50" />
              <div className="mt-2 text-xs text-white/35">{isUploadingFile ? 'Subiendo archivo...' : newProduct.file_path || 'Sin archivo cargado'}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">Portada</div>
              <input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleProductCoverUpload(file); }} className="mt-3 w-full text-xs text-white/50" />
              <div className="mt-2 text-xs text-white/35">{isUploadingCover ? 'Subiendo portada...' : newProduct.image_url || 'Sin portada cargada'}</div>
              {coverPreviewUrl && (
                <img src={coverPreviewUrl} alt="Preview portada" className="mt-4 h-40 w-full rounded-2xl border border-white/10 object-cover" />
              )}
            </div>
            <button onClick={handleSaveProduct} disabled={isSavingProduct || !newProduct.name} className="w-full rounded-2xl bg-cyan-300 px-4 py-4 text-xs font-black uppercase tracking-[0.28em] text-[#081019] transition hover:brightness-110 disabled:opacity-40">
              {isSavingProduct ? 'Guardando' : 'Publicar producto'}
            </button>
          </div>
        </ModuleCard>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Pagos"
        title="Lectura financiera sin ruido."
        description="Una sección dedicada a dinero, historial y detalle transaccional. Sin mezclar reservas, catálogo ni configuración de servicios."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Ingresos del mes" value={`$${monthlyRevenue.toLocaleString('es-CL')}`} hint="Suma mensual de reservas efectivamente cobradas." />
        <StatCard label="Pagos del mes" value={`${monthPayments.length}`} hint="Cantidad de operaciones cobradas durante el mes actual." />
        <StatCard label="Ticket promedio" value={`$${averageTicket.toLocaleString('es-CL')}`} hint="Promedio por reserva pagada para lectura rápida." />
      </div>

      <ModuleCard title="Historial de transacciones">
        {payments.length === 0 ? (
          <p className="text-sm text-white/35">Todavía no hay pagos confirmados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-white/6 text-[10px] font-black uppercase tracking-[0.28em] text-white/25">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Reserva</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Pago</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} onClick={() => setSelectedPayment(payment)} className="cursor-pointer border-b border-white/5 text-sm text-white/75 transition hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <div className="font-bold text-white">{payment.client_name}</div>
                      <div className="text-xs text-white/35">{payment.client_email}</div>
                    </td>
                    <td className="px-4 py-4">{payment.service_name}</td>
                    <td className="px-4 py-4">{payment.booking_date} · {payment.booking_slot}</td>
                    <td className="px-4 py-4 font-black text-emerald-300">${(Number(payment.amount) || 0).toLocaleString('es-CL')}</td>
                    <td className="px-4 py-4 font-mono text-xs text-white/35">{payment.payment_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModuleCard>
    </div>
  );

  return (
    <div className="dashboard-container min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.08),_transparent_28%),linear-gradient(180deg,_#07080D_0%,_#0B0E14_100%)]">
      <AnimatePresence>
        {toasts.length > 0 && (
          <div className="fixed bottom-6 right-6 z-[120] space-y-3">
            {toasts.map((item) => (
              <Toast key={item.id} item={item} onClose={() => setToasts((current) => current.filter((toast) => toast.id !== item.id))} />
            ))}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {serviceToDeactivate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#10131C] p-6 shadow-2xl">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-red-300/80">Confirmar cambio</div>
              <h3 className="mt-3 text-2xl font-black tracking-[-0.03em]">{serviceToDeactivate.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/50">Este servicio dejará de mostrarse en la oferta pública, pero seguirá existiendo en la base. La intención es esconderlo, no eliminar su historial.</p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setServiceToDeactivate(null)} className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.24em] text-white/60 hover:text-white">Cancelar</button>
                <button onClick={() => handleDeactivateService(serviceToDeactivate.id)} disabled={deletingServiceId === serviceToDeactivate.id} className="flex-1 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs font-black uppercase tracking-[0.24em] text-red-200 disabled:opacity-40">
                  {deletingServiceId === serviceToDeactivate.id ? 'Procesando' : 'Desactivar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPayment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm" onClick={() => setSelectedPayment(null)}>
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#10131C] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-white/30">Detalle del pago</div>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">{selectedPayment.client_name}</h3>
                </div>
                <button onClick={() => setSelectedPayment(null)} className="text-white/30 hover:text-white">✕</button>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  ['Email', selectedPayment.client_email],
                  ['WhatsApp', selectedPayment.client_whatsapp || '—'],
                  ['Servicio', selectedPayment.service_name],
                  ['Reserva', `${selectedPayment.booking_date} a las ${selectedPayment.booking_slot}`],
                  ['Monto', `$${(Number(selectedPayment.amount) || 0).toLocaleString('es-CL')}`],
                  ['Payment ID', selectedPayment.payment_id || '—'],
                  ['Método', selectedPayment.payment_method || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between gap-4 rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">{label}</span>
                    <span className="text-sm font-semibold text-right">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-white/6 bg-[#090B11]/90 px-6 py-8 xl:border-b-0 xl:border-r">
          <div className="sticky top-0 space-y-8">
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300/75">Zeus Admin v2</div>
              <h1 className="text-3xl font-black tracking-[-0.05em]">Operación ordenada.</h1>
              <p className="text-sm leading-relaxed text-white/42">Prototipo limpio para mostrarle al cliente una versión más lógica del panel sin romper el admin actual.</p>
            </div>

            <nav className="space-y-2">
              {SIDEBAR_ITEMS.map((item) => {
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setView(item.id);
                      if (item.id === 'asesorias' || item.id === 'tecnico' || item.id === 'empresas') {
                        setNewService((current) => ({ ...current, type: item.id as ServiceType }));
                      }
                    }}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${active ? 'border-cyan-300/35 bg-cyan-300/10' : 'border-white/6 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'}`}
                  >
                    <div className={`text-sm font-black ${active ? 'text-cyan-200' : 'text-white'}`}>{item.label}</div>
                    <div className="mt-1 text-xs text-white/35">{item.helper}</div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="px-6 py-8 md:px-8 xl:px-10">
          {loading ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="rounded-3xl border border-white/8 bg-white/[0.03] px-6 py-5 text-sm font-bold uppercase tracking-[0.24em] text-white/40">
                Cargando panel v2...
              </div>
            </div>
          ) : view === 'overview' ? (
            renderOverview()
          ) : view === 'agenda' ? (
            renderAgenda()
          ) : view === 'asesorias' ? (
            renderServices('Asesorías')
          ) : view === 'tecnico' ? (
            renderServices('Técnico')
          ) : view === 'empresas' ? (
            renderServices('Empresas')
          ) : view === 'productos' ? (
            renderProducts()
          ) : (
            renderPayments()
          )}
        </main>
      </div>
    </div>
  );
}
