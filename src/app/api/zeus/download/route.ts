import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!,
  process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeStoragePath(value: string | null | undefined) {
  if (!value) return '';
  const cleaned = value.trim();
  const uploadMatch = cleaned.match(/(?:^|\/)(uploads\/[^?]+)/);
  if (uploadMatch?.[1]) return uploadMatch[1];
  const coverMatch = cleaned.match(/(?:^|\/)(covers\/[^?]+)/);
  if (coverMatch?.[1]) return coverMatch[1];
  const marker = '/storage/v1/object/public/zeus-assets/';
  if (cleaned.includes(marker)) {
    return cleaned.split(marker)[1] || '';
  }
  return cleaned.replace(/^\/+/, '');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token de descarga inválido o ausente' }, { status: 400 });
    }

    // 1. Verificar el token y obtener product_id
    const { data: tokenData, error: tokenError } = await supabase
      .from('zeus_download_tokens')
      .select('id, product_id, used, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token query error or no data:', tokenError);
      return NextResponse.json({ error: 'Token no encontrado o expirado' }, { status: 404 });
    }

    if (tokenData.used) {
      return NextResponse.json({ error: 'Este enlace de descarga ya ha sido utilizado' }, { status: 410 });
    }

    // Verificar expiración temporal (24h por defecto)
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'El enlace de descarga ha expirado' }, { status: 410 });
    }

    // 2. Obtener el archivo del producto
    const { data: product, error: productError } = await supabase
      .from('zeus_products')
      .select('name, file_path')
      .eq('id', tokenData.product_id)
      .single();

    if (productError || !product) {
      console.error('Product query error:', productError);
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const filePath = normalizeStoragePath(product.file_path);

    if (!filePath) {
      return NextResponse.json({ error: 'Ruta de archivo inválida en producto' }, { status: 400 });
    }

    const { data: signData, error: signError } = await supabase
      .storage
      .from('zeus-assets')
      .createSignedUrl(filePath, 60, { download: product.name || true });

    if (signError) {
      console.error('Storage sign error:', signError);
      return NextResponse.json({ error: signError.message || 'Archivo no encontrado en storage' }, { status: 404 });
    }

    // 3. "Quemar" token solo si la URL se generó correctamente
    const { error: updateError } = await supabase
      .from('zeus_download_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    if (updateError) throw updateError;

    // 4. Registrar la descarga en logs (no bloqueante)
    const { error: logError } = await supabase
      .from('zeus_download_logs')
      .insert({
        product_id: tokenData.product_id,
        token_id: tokenData.id,
        client_email: null,
        downloaded_at: new Date().toISOString()
      });

    if (logError) {
      // No detenemos la descarga por un fallo de auditoría
      console.error('Log error (no-critical):', logError);
    }

    return NextResponse.redirect(signData.signedUrl);
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json({ error: error.message || 'Error interno al procesar la descarga' }, { status: 500 });
  }
}
