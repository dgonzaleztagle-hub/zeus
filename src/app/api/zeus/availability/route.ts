import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Falta el parámetro date' }, { status: 400 });
  }

  try {
    // 1. Obtener el día de la semana (0-6)
    const dayOfWeek = new Date(date).getUTCDay();

    // 2. Obtener los slots base para ese día de la semana
    const { data: settings } = await supabase
      .from('zeus_agenda_settings')
      .select('slots')
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .single();

    if (!settings) {
      return NextResponse.json({ slots: [] }); // Día no disponible
    }

    let availableSlots = [...settings.slots];

    // 3. Obtener bloqueos manuales para esa fecha
    const { data: overrides } = await supabase
      .from('zeus_availability_overrides')
      .select('block_slot')
      .eq('block_date', date);

    const blockedSlots = overrides?.map(o => o.block_slot) || [];

    // Si hay un bloqueo de día completo (block_slot es null)
    if (overrides?.some(o => o.block_slot === null)) {
      return NextResponse.json({ slots: [] });
    }

    // 4. Obtener reservas ya confirmadas/pagadas
    const { data: bookings } = await supabase
      .from('zeus_bookings')
      .select('booking_slot')
      .eq('booking_date', date)
      .in('payment_status', ['paid', 'pending']); // Bloqueamos también los que están en proceso de pago

    const bookedSlots = bookings?.map(b => b.booking_slot) || [];

    // 5. Filtrar la disponibilidad final
    const finalSlots = availableSlots.filter(
      slot => !blockedSlots.includes(slot) && !bookedSlots.includes(slot)
    );

    return NextResponse.json({ slots: finalSlots });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
