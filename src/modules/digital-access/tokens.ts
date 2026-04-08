import { v4 as uuidv4 } from 'uuid';

type SupabaseLike = any;

export function normalizeZeusAssetPath(value: string | null | undefined) {
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

export async function findActiveDownloadToken(params: {
  supabase: SupabaseLike;
  productId: string;
  clientEmail?: string | null;
}) {
  const normalizedEmail = params.clientEmail?.trim().toLowerCase() || null;

  let query = params.supabase
    .from('zeus_download_tokens')
    .select('token, expires_at')
    .eq('product_id', params.productId)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  query = normalizedEmail === null
    ? query.is('client_email', null)
    : query.eq('client_email', normalizedEmail);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function issueDownloadToken(params: {
  supabase: SupabaseLike;
  productId: string;
  clientEmail?: string | null;
  expiresInMinutes?: number;
}) {
  const token = uuidv4();
  const expiresInMinutes = params.expiresInMinutes ?? 24 * 60;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
  const normalizedEmail = params.clientEmail?.trim().toLowerCase() || null;

  const { error } = await params.supabase
    .from('zeus_download_tokens')
    .insert({
      product_id: params.productId,
      token,
      client_email: normalizedEmail,
      expires_at: expiresAt,
      used: false,
    });

  if (error) throw error;

  return {
    token,
    expiresAt,
  };
}
