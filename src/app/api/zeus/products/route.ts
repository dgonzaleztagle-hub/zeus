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

export async function GET() {
  try {
    const { data: products, error } = await supabase
      .from('zeus_products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const productsWithSignedImages = await Promise.all(
      (products || []).map(async (product: any) => {
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
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
