
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

const inferMimeType = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    epub: 'application/epub+zip',
    zip: 'application/zip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4'
  };

  return mimeMap[extension] || 'application/octet-stream';
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;
    const bucket = formData.get('bucket') as string || 'zeus-assets';

    if (!file || !path) {
      return NextResponse.json({ error: 'Missing file or path' }, { status: 400 });
    }

    // Validar tamaño de archivo (máx 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Archivo muy grande (máx 50MB)' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_ZEUS_SUPABASE_URL!;
    const supabaseServiceKey = process.env.ZEUS_SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const contentType = file.type || inferMimeType(file.name);

    // Intentamos mantener el bucket alineado, pero si esto falla no bloqueamos el upload.
    const { error: bucketUpdateError } = await supabase.storage.updateBucket(bucket, {
      public: false,
      fileSizeLimit: 52428800,
      allowedMimeTypes: ALLOWED_MIME_TYPES
    });
    if (bucketUpdateError) {
      console.warn('Bucket update warning:', bucketUpdateError.message);
    }

    const buffer = await file.arrayBuffer();
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({
        error: error.message,
        detected_content_type: contentType,
        file_name: file.name,
        supported_mime_types: [
          'pdf', 'epub', 'zip', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'mp3', 'mp4'
        ]
      }, { status: 500 });
    }

    const { data: previewData } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60);

    return NextResponse.json({ 
      success: true,
      data,
      path,
      bucket,
      preview_url: previewData?.signedUrl || null
    });
  } catch (err: any) {
    console.error('Server error upload:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
