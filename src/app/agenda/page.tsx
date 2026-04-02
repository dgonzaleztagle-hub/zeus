'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedGradient } from '@/components/premium/AnimatedGradient';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import ZeleriPayModal from '@/components/ZeleriPayModal';

export default function AgendaPage() {
  const [services, setServices] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Cargar servicios dinámicos
  useEffect(() => {
    const loadServices = async () => {
      try {
        const res = await fetch('/api/zeus/services');
        const data = await res.json();
        // FILTRO CRÍTICO: Solo tipos de agendamiento real
        const agendaServices = (data.services || []).filter((s: any) => 
          ['asesoria', 'tecnico', 'empresas'].includes(s.type)
        );
        setServices(agendaServices);
        if (agendaServices.length > 0) setSelectedService(agendaServices[0]);
      } catch (error) {
        console.error('Error loading dynamic services:', error);
      }
    };
    loadServices();
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', whatsapp: '' });
  const [payModalOpen, setPayModalOpen] = useState(false);

  const fetchAvailability = useCallback(async (date: Date) => {
    setIsLoadingSlots(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const res = await fetch(`/api/zeus/availability?date=${dateStr}`);
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (step === 2) {
      fetchAvailability(selectedDate);
    }
  }, [step, selectedDate, fetchAvailability]);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleCheckout = async () => {
    if (!formData.name || !formData.email || !formData.whatsapp || !selectedSlot || !selectedService) {
      alert('Por favor completa todos los campos');
      return;
    }
    if ((selectedService?.price || 0) < 1000) {
      alert('Zeleri solo permite pagos desde $1.000 CLP');
      return;
    }
    setPayModalOpen(true);
  };

  // Generar días del calendario
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });
  const leadingEmptyDays = Array.from({ length: startOfMonth(currentMonth).getDay() });

  return (
    <div className="relative pt-32 pb-24 min-h-screen overflow-hidden text-white font-sans">
      <AnimatedGradient
        colors={['#0EA5E905', '#00D4FF03', '#0A0A0F00']}
        speed={15}
        blur={120}
        opacity={1}
      />

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-black mb-4" style={{ letterSpacing: '-.03em' }}>
              Reservar <span style={{ color: '#0EA5E9' }}>Espacio.</span>
            </h1>
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-12 h-1 rounded-full transition-all duration-500" 
                     style={{ background: step >= i ? '#0EA5E9' : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
        </div>

        <div className="bg-[#111118] border border-white/5 rounded-3xl p-8 md:p-12 min-h-[500px] flex flex-col relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
                <h3 className="text-xl font-bold mb-8">1. Selecciona el servicio</h3>
                {services.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20">
                    <div className="w-8 h-8 border-2 border-[#0EA5E9] border-t-transparent animate-spin rounded-full mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando Servicios...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {services.map(s => (
                      <button key={s.id} onClick={() => setSelectedService(s)}
                        className="p-6 rounded-2xl border text-left transition-all group"
                        style={{ 
                          background: selectedService?.id === s.id ? 'rgba(14,165,233,0.1)' : 'transparent',
                          borderColor: selectedService?.id === s.id ? '#0EA5E9' : 'rgba(255,255,255,0.1)' 
                        }}>
                        <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{s.icon || '💡'}</div>
                        <div className="font-bold text-sm mb-1">{s.title || s.name}</div>
                        <div className="text-xs font-black" style={{ color: '#0EA5E9' }}>${(s.price || 0).toLocaleString('es-CL')}</div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-auto pt-10 flex justify-end">
                   <button 
                     onClick={nextStep} 
                     disabled={!selectedService}
                     className="px-8 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-20 translate-y-4" 
                     style={{ background: '#0EA5E9', color: '#0A0A0F' }}>Continuar →</button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1">
                <h3 className="text-xl font-bold mb-8">2. Elige fecha y hora</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <button onClick={()=>setCurrentMonth(m => addMonths(m, -1))} className="text-sm opacity-50 hover:opacity-100">←</button>
                      <h4 className="text-sm font-bold capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</h4>
                      <button onClick={()=>setCurrentMonth(m => addMonths(m, 1))} className="text-sm opacity-50 hover:opacity-100">→</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-[10px] text-center mb-2 uppercase tracking-widest text-white/30 font-bold">
                       {['D','L','M','M','J','V','S'].map((d, idx)=><div key={idx}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {leadingEmptyDays.map((_, index) => (
                        <div key={`empty-${index}`} className="h-10" aria-hidden="true" />
                      ))}
                      {daysInMonth.map(day => (
                        <button key={day.toString()} disabled={day < new Date() && !isToday(day)}
                                onClick={() => setSelectedDate(day)}
                                className={`h-10 rounded-lg text-xs font-semibold flex items-center justify-center transition-all disabled:opacity-5 
                                          ${isSameDay(selectedDate, day) ? 'ring-2 ring-[#0EA5E9]' : ''}`}
                                style={{ 
                                  background: isSameDay(selectedDate, day) ? '#0EA5E9' : 'rgba(255,255,255,0.03)',
                                  color: isSameDay(selectedDate, day) ? '#0A0A0F' : isToday(day) ? '#0EA5E9' : 'white'
                                }}>
                          {format(day, 'd')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 flex items-center gap-2">
                       Horas Disponibles {isLoadingSlots && <span className="w-2 h-2 rounded-full bg-[#0EA5E9] animate-ping" />}
                    </p>
                    {availableSlots.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                         {availableSlots.map(t => (
                           <button key={t} 
                                   onClick={() => setSelectedSlot(t)}
                                   className={`py-3 rounded-xl border text-xs font-bold transition-all ${selectedSlot === t ? 'scale-105 shadow-lg' : 'hover:bg-white/5'}`}
                                   style={{ 
                                     background: selectedSlot === t ? '#0EA5E9' : 'transparent',
                                     color: selectedSlot === t ? '#0A0A0F' : 'white',
                                     borderColor: selectedSlot === t ? '#0EA5E9' : 'rgba(255,255,255,0.1)'
                                   }}>
                             {t}
                           </button>
                         ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl">
                         <p className="text-xs text-white/20 italic">No hay horarios disponibles para este día</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-auto pt-10 flex justify-between">
                   <button onClick={prevStep} className="text-sm font-bold opacity-50 hover:opacity-100 transition-opacity">← Atrás</button>
                   <button disabled={!selectedSlot || isLoadingSlots} onClick={nextStep} 
                           className="px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-20" 
                           style={{ background: '#0EA5E9', color: '#0A0A0F' }}>Casi listo →</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1">
                <h3 className="text-xl font-bold mb-8">3. Datos de contacto</h3>
                <div className="grid gap-6 max-w-sm">
                   <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-black">Nombre Completo</label>
                      <input type="text" placeholder="Tu nombre" 
                             className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:border-[#0EA5E9] outline-none transition-all"
                             value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-black">Email</label>
                      <input type="email" placeholder="correo@ejemplo.cl" 
                             className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:border-[#0EA5E9] outline-none transition-all"
                             value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/30 font-black">WhatsApp</label>
                      <input type="tel" placeholder="+56 9..." 
                             className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:border-[#0EA5E9] outline-none transition-all"
                             value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                   </div>
                </div>

                <div className="mt-12 p-6 rounded-2xl bg-[#0EA5E9]/5 border border-[#0EA5E9]/10 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity -rotate-12 translate-x-4">
                      <span className="text-6xl text-[#0EA5E9]">{selectedService.icon}</span>
                   </div>
                   <div className="flex justify-between items-center mb-4 relative z-10">
                      <span className="text-sm font-bold uppercase tracking-tight">{selectedService.name}</span>
                      <span className="text-xl font-black" style={{ color: '#0EA5E9' }}>${selectedService.price.toLocaleString('es-CL')}</span>
                   </div>
                   <div className="text-xs text-white/40 font-medium relative z-10">
                      {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })} a las {selectedSlot}
                   </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center">
                   <button onClick={prevStep} className="text-sm font-bold opacity-50 hover:opacity-100 transition-opacity">← Atrás</button>
                   <button onClick={handleCheckout} disabled={!formData.name || !formData.email || !formData.whatsapp}
                           className="px-10 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:grayscale"
                           style={{ background: 'linear-gradient(135deg, #0EA5E9, #00D4FF)', color: '#0A0A0F', boxShadow: '0 0 30px rgba(14,165,233,0.3)' }}>
                     Ir a pagar →
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="mt-8 text-center text-[10px] font-bold tracking-widest uppercase opacity-20">
          Powered by HojaCero Agenda Engine
        </p>
      </div>

      {selectedService && selectedSlot && (
        <ZeleriPayModal
          isOpen={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          type="service"
          itemId={selectedService.id}
          itemName={selectedService.title || selectedService.name}
          amount={selectedService.price}
          date={format(selectedDate, 'yyyy-MM-dd')}
          slot={selectedSlot}
          prefillName={formData.name}
          prefillEmail={formData.email}
          prefillPhone={formData.whatsapp}
        />
      )}

    </div>
  );
}
