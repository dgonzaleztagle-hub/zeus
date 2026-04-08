import { NextResponse } from 'next/server';
import { listZeleriCards } from '@/lib/zeleri';
import { isZeleriFallbackEnabled } from '@/lib/payments';

/**
 * GET /api/zeus/enroll/cards?email=xxx
 *
 * Consulta las tarjetas enroladas de un cliente en Zeleri.
 * Llamado desde el modal después de que el usuario completa el iframe,
 * para obtener el card_id de la tarjeta recién registrada.
 */
export async function GET(request: Request) {
  try {
    if (!isZeleriFallbackEnabled()) {
      return NextResponse.json({ error: 'Fallback Zeleri deshabilitado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'email requerido' }, { status: 400 });
    }

    const result = await listZeleriCards(email);
    const cards  = result.data?.cards || [];

    return NextResponse.json({ cards });

  } catch (error: any) {
    console.error('[EnrollCards] Error:', error.message);
    return NextResponse.json({ error: error.message || 'Error al consultar tarjetas' }, { status: 500 });
  }
}
