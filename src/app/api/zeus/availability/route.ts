import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { reconcileAndClassifyBookings } from '@/lib/booking-locks';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!
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

    // 4. Obtener reservas del dia y reconciliar pending expirados antes de filtrar
    const { data: bookings } = await supabase
      .from('zeus_bookings')
      .select('id, booking_slot, payment_status, payment_id, created_at')
      .eq('booking_date', date)
      .in('payment_status', ['paid', 'pending']);

    const { blocking } = await reconcileAndClassifyBookings(supabase, bookings || []);
    const bookedSlots = blocking.map((b) => b.booking_slot).filter(Boolean) || [];

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
