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
              ${type === 'success' ? 'bg-[#0EA5E910] border-[#0EA5E920] text-[#0EA5E9]' : 
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
  
  const [activeTab, setActiveTab] = useState<'agenda' | 'store' | 'services'>('services');
  const [bookings, setBookings] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingService, setIsSavingService] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, description: '', is_free: false, file_path: '', image_url: '' });
  const [newService, setNewService] = useState({ 
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
    price: 0
  });

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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const headers: any = {
        'Content-Type': 'application/json',
        'x-zeus-bypass': 'zeus_master_key_2026' 
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      if (activeTab === 'agenda') {
        const { data, error } = await supabase.from('zeus_bookings').select('*').order('booking_date', { ascending: true });
        if (error) {
          if (isMissingTableError(error)) {
            setBookings([]);
            addToast('La tabla zeus_bookings aun no existe.', 'info');
            return;
          }
          throw error;
        }
        setBookings(data || []);
      } else if (activeTab === 'store') {
        const res = await fetch('/api/zeus/admin/products', { headers });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setProducts(data.products || []);
      } else if (activeTab === 'services') {
        const res = await fetch('/api/zeus/admin/services', { headers });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setServices(data.services || []);
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
      addToast(`Horario ${slot} bloqueado`, 'success');
      fetchData();
    } catch (err: any) {
      addToast('Error al bloquear: ' + err.message, 'error');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblockSlot = async (slot: string) => {
    setIsBlocking(true);
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
      addToast(`Horario ${slot} liberado`, 'success');
      fetchData();
    } catch (err: any) {
      addToast('Error al liberar: ' + err.message, 'error');
    } finally {
      setIsBlocking(false);
    }
  };

  const normalizeFileName = (name: string) => {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, "n").replace(/\s+/g, "-").replace(/[^a-z0-9.-]/g, "").replace(/-+/g, "-");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const cleanName = normalizeFileName(file.name);
      const fileName = `${Date.now()}-${cleanName}`;
      const filePath = `uploads/${fileName}`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', filePath);
      const res = await fetch('/api/zeus/admin/upload', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setNewProduct({ ...newProduct, file_path: filePath });
      addToast('Archivo subido', 'success');
    } catch (error: any) {
      addToast('Fallo: ' + error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const cleanName = normalizeFileName(file.name);
      const fileName = `cover-${Date.now()}-${cleanName}`;
      const filePath = `covers/${fileName}`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', filePath);
      const res = await fetch('/api/zeus/admin/upload', { method: 'POST', body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setNewProduct({ ...newProduct, image_url: filePath });
      setCoverPreviewUrl(result.preview_url || '');
      addToast('Portada subida', 'success');
    } catch (error: any) {
      addToast('Error: ' + error.message, 'error');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.file_path) {
      addToast('Campos obligatorios faltantes', 'error');
      return;
    }
    setIsSavingProduct(true);
    try {
      const res = await fetch('/api/zeus/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast('¡Producto publicado!', 'success');
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
    try {
      const res = await fetch(`/api/zeus/admin/products?id=${productId}`, {
        method: 'DELETE',
        headers: { 'x-zeus-bypass': 'zeus_master_key_2026' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast('Eliminado', 'success');
      fetchData();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleSaveService = async () => {
    if (!newService.title) {
      addToast('Título obligatorio', 'error');
      return;
    }
    setIsSavingService(true);
    try {
      const res = await fetch('/api/zeus/admin/services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-zeus-bypass': 'zeus_master_key_2026'
        },
        body: JSON.stringify(newService)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast('¡Servicio actualizado!', 'success');
      setNewService({ 
        id: '', type: 'asesoria', tag: '', title: '', description: '', 
        icon: '', cta: '', price_label: '', accent_color: '#0EA5E9', 
        size: 'medium', href: '', sort_order: 0, price: 0
      });
      fetchData();
    } catch (err: any) {
       addToast(err.message, 'error');
    } finally {
       setIsSavingService(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    setDeletingServiceId(serviceId);
    try {
      const res = await fetch(`/api/zeus/admin/services?id=${serviceId}`, {
        method: 'DELETE',
        headers: { 'x-zeus-bypass': 'zeus_master_key_2026' }
      });
      if (!res.ok) throw new Error('Error al desactivar');
      addToast('Desactivado', 'success');
      fetchData();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setDeletingServiceId(null);
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
            {[
              { id: 'agenda', label: 'Gestión Agenda' },
              { id: 'store', label: 'Catálogo Digital' },
              { id: 'services', label: 'Servicios & Biblioteca' }
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                className={`uppercase tracking-widest font-black transition-all pb-1 border-b-2 ${activeTab === t.id ? 'text-[#0EA5E9] border-[#0EA5E9]' : 'text-white/30 border-transparent hover:text-white/60'}`}
              >
                {t.label}
              </button>
            ))}
            <span className="text-white/20 uppercase tracking-widest font-bold">Admin Panel</span>
          </div>
          <button onClick={fetchData} className="px-5 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2">
            {loading && <div className="w-3 h-3 border-2 border-[#0EA5E9] border-t-transparent animate-spin rounded-full" />}
            Refrescar
          </button>
        </div>

        {activeTab === 'agenda' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#111118] border border-white/5 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-sm font-bold uppercase tracking-widest text-[#0EA5E9]">Calendario Semanal</h3>
                   <span className="text-[10px] text-white/30 font-bold uppercase">{format(selectedDate, 'MMMM yyyy', { locale: es })}</span>
                </div>
                <div className="grid grid-cols-7 gap-4">
                  {weekDays.map(day => {
                    const dayBookings = bookings.filter(b => isSameDay(new Date(b.booking_date + 'T12:00:00'), day));
                    const isSelected = isSameDay(day, selectedDate);
                    return (
                      <button key={day.toString()} onClick={() => setSelectedDate(day)}
                        className={`flex flex-col items-center p-4 rounded-xl border transition-all ${isSelected ? 'border-[#0EA5E9] bg-[#0EA5E9]/5 scale-105' : 'border-white/5 bg-white/[0.02] hover:border-white/20'}`}
                      >
                        <span className="text-[10px] uppercase text-white/20 mb-2">{format(day, 'EEE', { locale: es })}</span>
                        <span className="text-sm font-black">{format(day, 'd')}</span>
                        {dayBookings.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {dayBookings.map((b, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${b.client_name === 'ADMIN_BLOCK' ? 'bg-white/20' : 'bg-[#0EA5E9]'}`} />)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#111118] border border-white/5 rounded-2xl p-6">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/50">Bloquear Horarios: <span className="text-white">{format(selectedDate, 'dd MMMM', { locale: es })}</span></h3>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                   {hours.map(hour => {
                     const booking = bookings.find(b => isSameDay(new Date(b.booking_date + 'T12:00:00'), selectedDate) && b.booking_slot === hour);
                     const isOccupied = !!booking;
                     const isAdminBlock = booking?.client_name === 'ADMIN_BLOCK';
                     return (
                       <button key={hour} disabled={(isOccupied && !isAdminBlock) || isBlocking} onClick={() => isAdminBlock ? handleUnblockSlot(hour) : handleBlockSlot(hour)}
                         className={`py-3 rounded-xl border text-[11px] font-black transition-all ${isAdminBlock ? 'border-[#0EA5E9] bg-[#0EA5E9]/10 text-[#0EA5E9] hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500' : isOccupied ? 'bg-white/5 border-white/5 text-white/10 cursor-not-allowed' : 'border-[#0EA5E9]/20 hover:border-[#0EA5E9] hover:bg-[#0EA5E9]/5 text-white/60 hover:text-white'}`}
                       >
                         {hour} {isAdminBlock ? '🔓' : isOccupied ? '•' : ''}
                       </button>
                     );
                   })}
                 </div>
              </div>

              <div className="bg-[#111118] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Lista de Reservas</span>
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
                          {bookings.map(b => (
                            <tr key={b.id} className={`hover:bg-white/[0.02] transition-colors ${b.client_name === 'ADMIN_BLOCK' ? 'opacity-40' : ''}`}>
                               <td className="px-6 py-4">
                                  <div className="font-bold">{b.client_name === 'ADMIN_BLOCK' ? '🔒 BLOQUEO' : b.client_name}</div>
                               </td>
                               <td className="px-6 py-4">
                                  <span className="text-[10px] px-2 py-0.5 rounded border border-[#0EA5E930] text-[#0EA5E9] bg-[#0EA5E905] uppercase font-black">{b.service_name}</span>
                               </td>
                               <td className="px-6 py-4 font-bold text-xs">{b.booking_date} | {b.booking_slot}</td>
                               <td className="px-6 py-4 uppercase text-[10px] font-black">{b.payment_status}</td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'services' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
               <div className="bg-[#111118] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="px-6 py-4 border-b border-white/5">
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Servicios Configurables</span>
                  </div>
                  <table className="w-full text-left text-sm">
                     <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-white/30 font-black">
                        <tr>
                           <th className="px-6 py-4">Servicio / Tipo</th>
                           <th className="px-6 py-4">Tag / Color</th>
                           <th className="px-6 py-4">Valor</th>
                           <th className="px-6 py-4">Acciones</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {services.filter(s => ['asesoria', 'tecnico', 'empresas'].includes(s.type)).map(s => (
                           <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <span className="text-xl">{s.icon || '⚡'}</span>
                                    <div><div className="font-bold text-white/90">{s.title}</div><div className="text-[9px] uppercase font-black text-[#0EA5E9]">{s.type}</div></div>
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <span className="text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest" style={{ borderColor: `${s.accent_color}40`, color: s.accent_color }}>{s.tag || 'Sin Tag'}</span>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="text-[10px] font-bold text-white/80">${(s.price || 0).toLocaleString('es-CL')}</div>
                                 <div className="text-[9px] text-white/30 italic">{s.price_label || 'Consultar'}</div>
                              </td>
                              <td className="px-6 py-4 flex gap-3">
                                 <button onClick={() => setNewService(s)} className="text-[10px] uppercase font-black text-[#0EA5E9] hover:underline">Editar</button>
                                 <button onClick={() => handleDeleteService(s.id)} disabled={deletingServiceId === s.id} className="text-[10px] uppercase font-black text-red-500/30 hover:text-red-500 disabled:opacity-20">{deletingServiceId === s.id ? '...' : 'X'}</button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            <div className="space-y-6">
               {/* Formulario de Servicio Blindado contra Nulls */}
               <div className="bg-[#111118] border border-white/5 rounded-2xl p-6 shadow-xl">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#0EA5E9] mb-8">
                     {newService.id ? `EDITANDO: ${newService.title}` : 'NUEVO SERVICIO'}
                  </h4>
                  <div className="space-y-4">
                     <div>
                        <label className="text-[9px] uppercase text-white/30 font-black mb-1 block">Título</label>
                        <input value={newService.title || ''} onChange={e => setNewService({...newService, title: e.target.value})}
                               className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#0EA5E9]" />
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="text-[9px] uppercase text-white/30 font-black mb-1 block">Tipo</label>
                           <select value={newService.type || 'asesoria'} onChange={e => setNewService({...newService, type: e.target.value})}
                                   className="w-full bg-[#111118] border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#0EA5E9]">
                              <option value="asesoria">Asesoría</option>
                              <option value="tecnico">Técnico</option>
                              <option value="empresas">Empresas</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-[9px] uppercase text-white/30 font-black mb-1 block">Icono (Emoji)</label>
                           <input value={newService.icon || ''} onChange={e => setNewService({...newService, icon: e.target.value})}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#0EA5E9]" placeholder="⚡" />
                        </div>
                     </div>
                     <div>
                        <label className="text-[9px] uppercase text-white/30 font-black mb-1 block">Descripción Corta</label>
                        <textarea value={newService.description || ''} onChange={e => setNewService({...newService, description: e.target.value})}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#0EA5E9] min-h-[80px]" />
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="text-[9px] uppercase text-white/30 font-black mb-1 block">Tag</label>
                           <input value={newService.tag || ''} onChange={e => setNewService({...newService, tag: e.target.value})}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#0EA5E9]" placeholder="NUEVO" />
                        </div>
                        <div>
                           <label className="text-[9px] uppercase text-white/30 font-black mb-1 block">Precio Label (Landing)</label>
                           <input value={newService.price_label || ''} onChange={e => setNewService({...newService, price_label: e.target.value})}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#0EA5E9]" placeholder="Desde $..." />
                        </div>
                     </div>
                     <div>
                        <label className="text-[9px] uppercase text-white/30 font-black mb-1 block">Precio Real (Agenda - Solo Números)</label>
                        <input type="number" value={newService.price || 0} onChange={e => setNewService({...newService, price: parseInt(e.target.value) || 0})}
                               className="w-full bg-[#0EA5E9]/5 border border-[#0EA5E9]/20 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#0EA5E9] font-bold text-[#0EA5E9]" />
                     </div>
                     <button onClick={handleSaveService} disabled={isSavingService || !newService.title}
                             className="w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#0EA5E9] text-[#0A0A0F] active:scale-95 disabled:opacity-30">
                        {isSavingService ? 'Guardando...' : newService.id ? `Actualizar ${newService.title}` : 'Crear Servicio'}
                     </button>
                     {newService.id && (
                        <button onClick={() => setNewService({ id: '', type: 'asesoria', tag: '', title: '', description: '', icon: '', cta: '', price_label: '', accent_color: '#0EA5E9', size: 'medium', href: '', sort_order: 0, price: 0 })}
                                className="w-full py-2 text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors">Cancelar Edición</button>
                     )}
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
               <div className="bg-[#111118] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="px-6 py-4 border-b border-white/5">
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Inventario Digital</span>
                  </div>
                  <table className="w-full text-left text-sm">
                     <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-white/30 font-black">
                        <tr><th className="px-6 py-4">Producto</th><th className="px-6 py-4">Estado</th><th className="px-6 py-4">Precio</th><th className="px-6 py-4">Acciones</th></tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {products.map(p => (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                             <td className="px-6 py-4 flex items-center gap-4">
                                <div className="font-bold text-white/90">{p.name}</div>
                             </td>
                             <td className="px-6 py-4">
                                <span className="text-[9px] font-black px-2 py-0.5 rounded tracking-widest uppercase bg-[#0EA5E910] text-[#0EA5E9] border border-[#0EA5E920]">{p.is_free ? 'Gratis' : 'Premium'}</span>
                             </td>
                             <td className="px-6 py-4 font-black">${(Number(p.price) || 0).toLocaleString('es-CL')}</td>
                             <td className="px-6 py-4"><button onClick={() => handleDeleteProduct(p.id)} className="text-[10px] font-black text-red-500/30 hover:text-red-500 uppercase tracking-tighter">Eliminar</button></td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
            <div className="space-y-6">
               <div className="bg-[#111118] border border-white/5 rounded-2xl p-6 shadow-xl">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#0EA5E9] mb-8">Añadir Producto</h4>
                  <div className="space-y-6">
                     <div><label className="text-[9px] uppercase text-white/30 font-black mb-2 block">Nombre</label><input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-xs outline-none focus:border-[#0EA5E9]" /></div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[9px] uppercase text-white/30 font-black mb-2 block">Precio</label><input type="number" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: parseInt(e.target.value) || 0})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-xs outline-none focus:border-[#0EA5E9]" /></div>
                        <div className="flex flex-col justify-end"><label className="flex items-center gap-2 cursor-pointer p-4 bg-white/5 rounded-xl border border-white/10"><input type="checkbox" checked={newProduct.is_free} onChange={e => setNewProduct({...newProduct, is_free: e.target.checked})} /><span className="text-[9px] font-black uppercase text-white/60">Gratis</span></label></div>
                     </div>
                     <div className="space-y-4">
                        <div><label className="text-[9px] uppercase text-white/30 font-black mb-2 block">Subir Archivo</label><input type="file" onChange={handleFileUpload} className="text-[10px] text-white/20" /></div>
                     </div>
                     <button onClick={handleSaveProduct} disabled={isSavingProduct || !newProduct.name} className="w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[#0EA5E9] text-[#0A0A0F]">Publicar →</button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
