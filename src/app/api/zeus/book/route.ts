import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      service_id, 
      service_name, 
      amount, 
      client_name, 
      client_email, 
      client_whatsapp, 
      date, 
      slot,
      simulate_payment
    } = body;

    // 1. Validaciones básicas
    if (!date || !slot || !client_email || !client_name) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: date, slot, client_email, client_name' }, { status: 400 });
    }

    // 2. Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client_email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    // 3. Validar fecha es válida y no es pasada
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bookingDate < today) {
      return NextResponse.json({ error: 'No se puede reservar para fechas pasadas' }, { status: 400 });
    }

    // 4. Validar formato de slot (HH:MM)
    const slotRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!slotRegex.test(slot)) {
      return NextResponse.json({ error: 'Formato de horario inválido (debe ser HH:MM)' }, { status: 400 });
    }

    // 5. Validar y sanitizar monto
    const sanitizedAmount = Number(amount) || 0;
    if (isNaN(sanitizedAmount) || sanitizedAmount < 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    // 6. Verificar disponibilidad de último minuto (evitar double-booking)
    // Usamos una consulta RPC o transacción para atomicidad
    const { data: existing, error: checkError } = await supabase
      .from('zeus_bookings')
      .select('id')
      .eq('booking_date', date)
      .eq('booking_slot', slot)
      .in('payment_status', ['paid', 'pending'])
      .limit(1);

    if (checkError) {
      console.error('Availability check error:', checkError);
      throw checkError;
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'El horario ya no está disponible' }, { status: 409 });
    }

    const isSimulatedPaid = Boolean(simulate_payment);

    // 7. Crear la reserva (pagada si está en simulación)
    const { data: booking, error: bookingError } = await supabase
      .from('zeus_bookings')
      .insert({
        service_id: service_id || null,
        service_name,
        amount: sanitizedAmount,
        client_name: client_name.trim(),
        client_email: client_email.toLowerCase(),
        client_whatsapp: client_whatsapp || null,
        booking_date: date,
        booking_slot: slot,
        payment_status: isSimulatedPaid ? 'paid' : 'pending',
        payment_method: isSimulatedPaid ? 'simulated' : null,
        notes: isSimulatedPaid ? 'Pago simulado aprobado para pruebas (Toku pendiente)' : null
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // 8. (Opcional en futuro) Aquí se generaría el link de Toku próximamente
    // Por ahora, devolvemos el ID de reserva
    return NextResponse.json({ 
      success: true, 
      booking_id: booking.id,
      message: isSimulatedPaid ? 'Reserva creada con pago simulado aprobado' : 'Reserva creada, pendiente de pago',
      data: booking
    });

  } catch (error: any) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
