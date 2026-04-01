import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/epub+zip',
  'application/zip',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/jpg',
  'image/gif',
  'image/svg+xml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'audio/mpeg',
  'video/mp4',
  'application/octet-stream'
];

const BUCKET_CONFIG = {
  public: false,
  fileSizeLimit: 524288000,
  allowedMimeTypes: ALLOWED_MIME_TYPES
};

export async function POST(req: NextRequest) {
  try {
    const { path, bucket = 'zeus-assets' } = await req.json();

    if (!path) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!;
    const supabaseServiceKey = process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingBucket, error: getBucketError } = await supabase.storage.getBucket(bucket);

    if (getBucketError) {
      const { error: createBucketError } = await supabase.storage.createBucket(bucket, BUCKET_CONFIG);
      if (createBucketError && !String(createBucketError.message || '').toLowerCase().includes('already exists')) {
        return NextResponse.json({ error: createBucketError.message || 'No se pudo crear el bucket de storage' }, { status: 500 });
      }
    } else if (existingBucket) {
      const { error: bucketUpdateError } = await supabase.storage.updateBucket(bucket, BUCKET_CONFIG);
      if (bucketUpdateError) {
        console.warn('Bucket update warning:', bucketUpdateError.message);
      }
    }

    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path, {
      upsert: true
    });

    if (error || !data?.token) {
      return NextResponse.json({ error: error?.message || 'No se pudo generar URL firmada de upload' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      path,
      bucket,
      token: data.token,
      signedUrl: data.signedUrl
    });
  } catch (err: any) {
    console.error('Signed upload URL error:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
