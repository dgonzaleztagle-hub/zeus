import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const zeusSupabaseUrl = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL;
const zeusServiceRoleKey = process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY;

if (!zeusSupabaseUrl || !zeusServiceRoleKey) {
  throw new Error('Faltan variables ZEUS de Supabase: NEXT_PUBLIC_ZEUS_SUPABASE_URL y/o ZEUS_SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(zeusSupabaseUrl, zeusServiceRoleKey);

function isMissingTableError(error: any) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes("could not find the table") ||
    message.includes("relation") && message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

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

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('zeus_products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({
          products: [],
          warning: 'Tabla zeus_products no disponible en este entorno aún'
        });
      }
      throw error;
    }

    const productsWithSignedImages = await Promise.all(
      (data || []).map(async (product: any) => {
        if (!product.image_url) return product;

        const coverPath = normalizeStoragePath(product.image_url);
        if (!coverPath) return product;

        const { data: signed, error: signedError } = await supabase
          .storage
          .from('zeus-assets')
          .createSignedUrl(coverPath, 60 * 60);

        if (signedError || !signed?.signedUrl) {
          return {
            ...product,
            image_url: null,
          };
        }

        return {
          ...product,
          image_url: signed.signedUrl,
        };
      })
    );

    return NextResponse.json({ products: productsWithSignedImages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, price, is_free, file_path, image_url } = body;

    // Sanitizar precio: asegurar número positivo y entero (CLP)
    const sanitizedPrice = Math.max(0, Math.floor(Number(price) || 0));
    const isFreeProduct = Boolean(is_free) || sanitizedPrice === 0;

    if (!isFreeProduct && sanitizedPrice < 1000) {
      return NextResponse.json(
        { error: 'Los productos pagados deben tener un precio mínimo de $1.000 CLP para operar con Zeleri.' },
        { status: 400 }
      );
    }

    const productData = {
      name,
      description,
      price: sanitizedPrice,
      is_free: isFreeProduct,
      file_path,
      image_url,
      active: true
    };

    let result;
    if (id) {
      // Update
      const { data, error } = await supabase
        .from('zeus_products')
        .update(productData)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        if (isMissingTableError(error)) {
          return NextResponse.json({ error: 'La tabla zeus_products no existe en este entorno. Ejecuta la migracion de Zeus en Supabase.' }, { status: 503 });
        }
        throw error;
      }
      result = data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('zeus_products')
        .insert(productData)
        .select()
        .single();
      if (error) {
        if (isMissingTableError(error)) {
          return NextResponse.json({ error: 'La tabla zeus_products no existe en este entorno. Ejecuta la migracion de Zeus en Supabase.' }, { status: 503 });
        }
        throw error;
      }
      result = data;
    }

    return NextResponse.json({ success: true, product: result });
  } catch (error: any) {
    console.error('Error managing product:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    // Hacemos un soft delete (desactivar)
    const { error } = await supabase
      .from('zeus_products')
      .update({ active: false })
      .eq('id', id);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ error: 'La tabla zeus_products no existe en este entorno. Ejecuta la migracion de Zeus en Supabase.' }, { status: 503 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
