'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { format, startOfWeek, addDays, eachDayOfInterval, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

// Sistema de Notificaciones Local para el Admin
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20, x: 20 }}
    animate={{ opacity: 1, y: 0, x: 0 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 backdrop-blur-xl
              ${type === 'success' ? 'bg-[#00FF8710] border-[#00FF8720] text-[#00FF87]' : 
                type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 
                'bg-white/5 border-white/10 text-white'}`}
  >
    <div className="text-xl">{type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</div>
    <div className="font-bold text-sm">{message}</div>
    <button onClick={onClose} className="ml-4 opacity-40 hover:opacity-100 transition-opacity">✕</button>
  </motion.div>
);

export default function ZeusAdminPage() {
  const zeusSupabaseUrl = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL;
  const zeusSupabaseAnonKey = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_ANON_KEY;

  if (!zeusSupabaseUrl || !zeusSupabaseAnonKey) {
    throw new Error('Faltan variables ZEUS publicas: NEXT_PUBLIC_ZEUS_SUPABASE_URL y/o NEXT_PUBLIC_ZEUS_SUPABASE_ANON_KEY');
  }

  const supabase = createBrowserClient(
    zeusSupabaseUrl,
    zeusSupabaseAnonKey
  );
  
  const [activeTab, setActiveTab] = useState<'agenda' | 'store'>('store');
  const [bookings, setBookings] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, description: '', is_free: false, file_path: '', image_url: '' });
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [toasts, setToasts] = useState<{id: number, message: string, type: 'success' | 'error' | 'info'}[]>([]);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState('');

  // Estados de Carga
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Lógica de Bloqueo de Horarios
  const [isBlocking, setIsBlocking] = useState(false);
  const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const isMissingTableError = (error: any) => {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.includes('could not find the table') ||
      (message.includes('relation') && message.includes('does not exist')) ||
      message.includes('schema cache')
    );
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'agenda') {
        const { data, error } = await supabase.from('zeus_bookings').select('*').order('booking_date', { ascending: true });
        if (error) {
          if (isMissingTableError(error)) {
            setBookings([]);
            addToast('La tabla zeus_bookings aun no existe en este entorno. Ejecuta la migracion de Zeus en Supabase.', 'info');
            return;
          }
          throw error;
        }
        setBookings(data || []);
      } else {
        const res = await fetch('/api/zeus/admin/products');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.warning) addToast(data.warning, 'info');
        setProducts(data.products || []);
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleBlockSlot = async (slot: string) => {
    setIsBlocking(true);
    addToast(`Bloqueando ${slot}...`, 'info');
    try {
      const { error } = await supabase.from('zeus_bookings').insert({
        client_name: 'ADMIN_BLOCK',
        client_email: 'admin@zeus.sh',
        service_name: 'Bloqueo Manual',
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        booking_slot: slot,
        payment_status: 'paid',
        amount: 0
      });

      if (error) throw error;
      
      addToast(`Horario ${slot} bloqueado exitosamente`, 'success');
      fetchData();
    } catch (err: any) {
      addToast('Error al bloquear: ' + err.message, 'error');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblockSlot = async (slot: string) => {
    setIsBlocking(true);
    addToast(`Desbloqueando ${slot}...`, 'info');
    try {
      const { error } = await supabase
        .from('zeus_bookings')
        .delete()
        .match({ 
          booking_date: format(selectedDate, 'yyyy-MM-dd'), 
          booking_slot: slot,
          client_name: 'ADMIN_BLOCK' 
        });

      if (error) throw error;
      
      addToast(`Horario ${slot} liberado exitosamente`, 'success');
      fetchData();
    } catch (err: any) {
      addToast('Error al liberar: ' + err.message, 'error');
    } finally {
      setIsBlocking(false);
    }
  };

  const normalizeFileName = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .replace(/ñ/g, "n")
      .replace(/\s+/g, "-") // Espacios por guiones
      .replace(/[^a-z0-9.-]/g, "") // Solo alfanuméricos, puntos y guiones
      .replace(/-+/g, "-"); // Evitar guiones seguidos
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    addToast('Subiendo archivo digital...', 'info');
    try {
      const cleanName = normalizeFileName(file.name);
      const fileName = `${Date.now()}-${cleanName}`;
      const filePath = `uploads/${fileName}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', filePath);

      const res = await fetch('/api/zeus/admin/upload', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Fallo en la subida');

      setNewProduct({ ...newProduct, file_path: filePath });
      addToast('Archivo subido correctamente', 'success');
    } catch (error: any) {
      addToast('Fallo en subida: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    addToast('Subiendo portada...', 'info');
    try {
      const cleanName = normalizeFileName(file.name);
      const fileName = `cover-${Date.now()}-${cleanName}`;
      const filePath = `covers/${fileName}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', filePath);

      const res = await fetch('/api/zeus/admin/upload', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error de permisos: ' + result.error);

      // Guardamos el path en DB; la API devuelve URL firmada para renderizar portada
      setNewProduct({ ...newProduct, image_url: filePath });
      setCoverPreviewUrl(result.preview_url || '');
      addToast('Portada subida con éxito', 'success');
    } catch (error: any) {
      addToast('Error en portada: ' + error.message, 'error');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.file_path) {
      addToast('Nombre y archivo son obligatorios', 'error');
      return;
    }

    setIsSavingProduct(true);
    addToast('Guardando producto...', 'info');
    try {
      const res = await fetch('/api/zeus/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProduct)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      addToast('¡Producto publicado exitosamente!', 'success');
      setNewProduct({ name: '', price: 0, description: '', is_free: false, file_path: '', image_url: '' });
      setCoverPreviewUrl('');
      fetchData();
    } catch (err: any) {
       addToast(err.message, 'error');
    } finally {
       setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setDeletingProductId(productId);
    addToast('Eliminando producto...', 'info');
    try {
      const res = await fetch(`/api/zeus/admin/products?id=${productId}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar');

      addToast('Producto eliminado correctamente', 'success');
      fetchData();
    } catch (err: any) {
      addToast(err.message || 'Error al eliminar', 'error');
    } finally {
      setDeletingProductId(null);
    }
  };

  const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start, end: addDays(start, 6) });

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white p-8 md:p-12 font-sans overflow-x-hidden">
      <AnimatePresence>
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))} />
        ))}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-4 text-[10px] items-center">
            {['agenda', 'store'].map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={`uppercase tracking-widest font-black transition-all pb-1 border-b-2 ${
                  activeTab === t
                    ? 'text-[#00FF87] border-[#00FF87]'
                    : 'text-white/30 border-transparent hover:text-white/60'
                }`}
              >
                {t === 'agenda' ? 'Gestión Agenda' : 'Catálogo Digital'}
              </button>
            ))}
            <span className="text-white/20 uppercase tracking-widest font-bold">Admin Panel</span>
          </div>

          <button
            onClick={fetchData}
            className="px-5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2"
          >
            {loading && <div className="w-3 h-3 border-2 border-[#00FF87] border-t-transparent animate-spin rounded-full" />}
            Refrescar
          </button>
        </div>

        {activeTab === 'agenda' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Calendario Semanal Interactivo */}
              <div className="bg-[#111118] border border-white/5 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-sm font-bold uppercase tracking-widest text-[#00FF87]">Calendario Semanal</h3>
                   <span className="text-[10px] text-white/30 font-bold uppercase">{format(selectedDate, 'MMMM yyyy', { locale: es })}</span>
                </div>
                <div className="grid grid-cols-7 gap-4">
                  {weekDays.map(day => {
                    const dayBookings = bookings.filter(b => {
                      if (!b.booking_date) return false;
                      try {
                        return isSameDay(new Date(b.booking_date + 'T12:00:00'), day);
                      } catch {
                        return false;
                      }
                    });
                    const isSelected = isSameDay(day, selectedDate);
                    return (
                      <button 
                        key={day.toString()} 
                        onClick={() => setSelectedDate(day)}
                        className={`flex flex-col items-center p-4 rounded-xl border transition-all 
                                  ${isSelected ? 'border-[#00FF87] bg-[#00FF87]/5 scale-105' : 'border-white/5 bg-white/[0.02] hover:border-white/20'}`}
                      >
                        <span className="text-[10px] uppercase text-white/20 mb-2">{format(day, 'EEE', { locale: es })}</span>
                        <span className="text-sm font-black">{format(day, 'd')}</span>
                        {dayBookings.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {dayBookings.map((b, i) => (
                              <div key={i} className={`w-1.5 h-1.5 rounded-full ${b.client_name === 'ADMIN_BLOCK' ? 'bg-white/20' : 'bg-[#00FF87]'}`} />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Bloqueo Horario Real */}
              <div className="bg-[#111118] border border-white/5 rounded-2xl p-6">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/50">Bloquear Horarios: <span className="text-white">{format(selectedDate, 'dd MMMM', { locale: es })}</span></h3>
                    {isBlocking && <span className="text-[10px] text-[#00FF87] animate-pulse uppercase font-black">Procesando...</span>}
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                   {hours.map(hour => {
                     const booking = bookings.find(b => {
                       if (!b.booking_date) return false;
                       try {
                         return isSameDay(new Date(b.booking_date + 'T12:00:00'), selectedDate) && b.booking_slot === hour;
                       } catch {
                         return false;
                       }
                     });
                     const isOccupied = !!booking;
                     const isAdminBlock = booking?.client_name === 'ADMIN_BLOCK';

                     return (
                       <button 
                         key={hour}
                         disabled={(isOccupied && !isAdminBlock) || isBlocking}
                         onClick={() => isAdminBlock ? handleUnblockSlot(hour) : handleBlockSlot(hour)}
                         className={`py-3 rounded-xl border text-[11px] font-black transition-all
                                   ${isAdminBlock 
                                     ? 'border-[#00FF87] bg-[#00FF87]/10 text-[#00FF87] hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500' 
                                     : isOccupied 
                                       ? 'bg-white/5 border-white/5 text-white/10 cursor-not-allowed' 
                                       : 'border-[#00FF87]/20 hover:border-[#00FF87] hover:bg-[#00FF87]/5 text-white/60 hover:text-white'}`}
                       >
                         {hour} {isAdminBlock ? '🔓' : isOccupied ? '•' : ''}
                       </button>
                     );
                   })}
                 </div>
              </div>

              {/* Lista de Reservas Detallada */}
              <div className="bg-[#111118] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Lista de Reservas</span>
                     <span className="text-[10px] text-white/20">{bookings.length} registros</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-white/40 font-black sticky top-0">
                          <tr>
                             <th className="px-6 py-4">Cliente / Tipo</th>
                             <th className="px-6 py-4">Servicio</th>
                             <th className="px-6 py-4">Fecha/Hora</th>
                             <th className="px-6 py-4">Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {bookings.length > 0 ? bookings.map(b => (
                            <tr key={b.id} className={`hover:bg-white/[0.02] transition-colors ${b.client_name === 'ADMIN_BLOCK' ? 'opacity-40' : ''}`}>
                               <td className="px-6 py-4">
                                  <div className="font-bold">{b.client_name === 'ADMIN_BLOCK' ? '🔒 BLOQUEO MANUAL' : b.client_name}</div>
                                  <div className="text-[10px] text-white/40 font-mono italic">{b.client_email}</div>
                               </td>
                               <td className="px-6 py-4">
                                  <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-black tracking-tighter
                                                  ${b.client_name === 'ADMIN_BLOCK' ? 'border-white/10 text-white/40 bg-white/5' : 'border-[#00FF8730] text-[#00FF87] bg-[#00FF8705]'}`}>
                                    {b.service_name}
                                  </span>
                               </td>
                               <td className="px-6 py-4">
                                  <div className="font-bold">{format(new Date(b.booking_date + 'T12:00:00'), 'dd MMM', { locale: es })}</div>
                                  <div className="text-[10px] text-[#00FF87] font-black">{b.booking_slot}</div>
                               </td>
                               <td className="px-6 py-4">
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${b.payment_status === 'paid' ? 'text-[#00FF87]' : 'text-orange-400'}`}>
                                     {b.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                                  </span>
                               </td>
                            </tr>
                          )) : (
                            <tr>
                               <td colSpan={4} className="px-6 py-12 text-center text-white/10 italic font-medium">No hay reservas registradas en este período</td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                  </div>
              </div>
            </div>

            {/* Sidebar con Métricas Reales */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-[#00FF8710] to-transparent border border-[#00FF8720] rounded-2xl p-8 relative overflow-hidden group shadow-xl">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">💎</div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#00FF87] mb-8">Rendimiento Agenda</h4>
                  <div className="space-y-8">
                     <div>
                        <div className="text-4xl font-black">{bookings.filter(b => b.payment_status === 'paid' && b.client_name !== 'ADMIN_BLOCK').length}</div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-1">Citas Pagadas</div>
                     </div>
                     <div className="h-px bg-white/5" />
                     <div>
                        <div className="text-4xl font-black text-[#00D4FF]">
                          ${bookings.reduce((acc, curr) => {
                            const amount = typeof curr.amount === 'number' ? curr.amount : parseFloat(curr.amount || 0);
                            return acc + (curr.payment_status === 'paid' && !isNaN(amount) ? amount : 0);
                          }, 0).toLocaleString('es-CL')}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-1">Ingresos Acumulados</div>
                     </div>
                     <div className="h-px bg-white/5" />
                     <div>
                        <div className="text-4xl font-black text-white/20">
                          {bookings.filter(b => b.client_name === 'ADMIN_BLOCK').length}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-1">Bloqueos Manuales</div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
               {/* Tabla de Productos con Feedback de Acciones */}
               <div className="bg-[#111118] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="px-6 py-4 border-b border-white/5">
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Inventario Digital</span>
                  </div>
                  <table className="w-full text-left text-sm">
                     <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-white/30 font-black">
                        <tr>
                           <th className="px-6 py-4">Producto / Preview</th>
                           <th className="px-6 py-4">Estado</th>
                           <th className="px-6 py-4">Precio</th>
                           <th className="px-6 py-4">Acciones</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {products.length > 0 ? products.map(p => (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                             <td className="px-6 py-4 flex items-center gap-4">
                                <div className="relative group/img">
                                   {p.image_url ? (
                                     <img src={p.image_url} className="w-12 h-12 rounded-lg object-cover border border-white/10 group-hover/img:scale-105 transition-transform" alt="" />
                                   ) : (
                                     <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-xl">📦</div>
                                   )}
                                </div>
                                <div>
                                   <div className="font-bold text-white/90 group-hover:text-white transition-colors">{p.name}</div>
                                   <div className="text-[9px] font-mono text-white/30 truncate max-w-[200px] mt-1">{p.file_path}</div>
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase
                                                ${p.is_free ? 'bg-[#00D4FF10] text-[#00D4FF] border border-[#00D4FF20]' : 'bg-[#00FF8710] text-[#00FF87] border border-[#00FF8720]'}`}>
                                   {p.is_free ? 'Gratis' : 'Premium'}
                                </span>
                             </td>
                             <td className="px-6 py-4 font-black text-white/80">${(Number(p.price) || 0).toLocaleString('es-CL')}</td>
                             <td className="px-6 py-4">
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  disabled={deletingProductId === p.id}
                                  className="text-[10px] font-black text-red-500/30 hover:text-red-500 hover:scale-110 transition-all uppercase tracking-tighter disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {deletingProductId === p.id ? 'Eliminando...' : 'Eliminar'}
                                </button>
                             </td>
                          </tr>
                        )) : (
                          <tr>
                             <td colSpan={4} className="px-6 py-12 text-center text-white/10 italic">Cargando inventario o vacío...</td>
                          </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>

            <div className="space-y-6">
               {/* Formulario con Rigor en Validaciones */}
               <div className="bg-[#111118] border border-white/5 rounded-2xl p-6 shadow-xl">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#00FF87] mb-8 flex justify-between">
                     Añadir Producto
                     {isSavingProduct && <div className="w-3 h-3 border-2 border-[#00FF87] border-t-transparent animate-spin rounded-full" />}
                  </h4>
                  <div className="space-y-6">
                     <div>
                        <label className="text-[9px] uppercase text-white/30 font-black mb-2 block">Nombre del Recurso</label>
                        <input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                               className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-xs outline-none focus:border-[#00FF87] transition-all" placeholder="Ej: Manual de Identidad" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[9px] uppercase text-white/30 font-black mb-2 block">Precio (CLP)</label>
                           <input type="number" value={newProduct.price || ''} onChange={e => {
  const val = e.target.value === '' ? 0 : parseInt(e.target.value);
  const normalized = isNaN(val) ? 0 : val;
  setNewProduct({
    ...newProduct,
    price: normalized,
    // Si tiene precio > 0, deja de ser gratis
    is_free: normalized > 0 ? false : newProduct.is_free,
  });
}}
                                  disabled={newProduct.is_free}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-xs outline-none focus:border-[#00FF87]" />
                        </div>
                        <div className="flex flex-col justify-end">
                           <label className="flex items-center gap-2 cursor-pointer p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/[0.08] transition-all">
                              <input
                                type="checkbox"
                                className="accent-[#00FF87]"
                                checked={newProduct.is_free}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  setNewProduct({
                                    ...newProduct,
                                    is_free: checked,
                                    // Si marca gratis, forzamos precio 0
                                    price: checked ? 0 : newProduct.price,
                                  });
                                }}
                              />
                              <span className="text-[9px] font-black uppercase text-white/60">Gratis</span>
                           </label>
                        </div>
                     </div>
                     
                     {/* Sistema de Subida con Estados de Verdad */}
                     <div className="space-y-4">
                        <div>
                           <label className="text-[9px] uppercase text-white/30 font-black mb-2 block">Subir Portada {isUploadingCover && '⏳'}</label>
                           <div className={`relative h-28 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all overflow-hidden
                                         ${isUploadingCover ? 'border-[#00FF87] bg-[#00FF8705]' : 'border-white/10 hover:border-white/20'}`}>
                              <input type="file" onChange={handleCoverUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={isUploadingCover} accept="image/*" />
                              {coverPreviewUrl ? (
                                <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={coverPreviewUrl} className="h-full w-full object-cover" alt="" />
                              ) : (
                                <>
                                   <span className="text-2xl mb-2">{isUploadingCover ? '🛠️' : '🖼️'}</span>
                                   <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold">Seleccionar Póster</span>
                                </>
                              )}
                           </div>
                        </div>

                        <div>
                           <label className="text-[9px] uppercase text-white/30 font-black mb-2 block">Cargar Producto Digital {isUploading && '⏳'}</label>
                           <div className={`relative h-28 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all 
                                         ${isUploading ? 'border-[#00FF87] bg-[#00FF8705]' : 'border-white/10 hover:border-white/20'}`}>
                              <input
                                type="file"
                                onChange={handleFileUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                disabled={isUploading}
                                accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                              />
                              {newProduct.file_path ? (
                                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center">
                                   <div className="text-[10px] text-[#00FF87] font-black uppercase mb-1">✓ Archivo Verificado</div>
                                   <div className="text-[8px] text-white/30 truncate max-w-[140px] italic">{newProduct.file_path.split('/').pop()}</div>
                                </motion.div>
                              ) : (
                                <>
                                   <span className="text-2xl mb-2">{isUploading ? '📤' : '📥'}</span>
                                   <span className="text-[8px] uppercase tracking-widest text-white/40 font-bold">Subir Recurso</span>
                                </>
                              )}
                           </div>
                        </div>
                     </div>

                     <button 
                        onClick={handleSaveProduct} 
                        disabled={isSavingProduct || !newProduct.name || !newProduct.file_path || isUploading || isUploadingCover}
                        className="w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group"
                        style={{ background: '#00FF87', color: '#0A0A0F', boxShadow: '0 0 40px rgba(0,255,135,0.1)' }}
                     >
                        <span className="group-hover:tracking-[0.2em] transition-all">
                           {isSavingProduct ? 'Sincronizando...' : 'Publicar Ahora →'}
                        </span>
                     </button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
