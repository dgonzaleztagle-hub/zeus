
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Asegura que el bucket acepte documentos Office y archivos de prueba comunes.
    await supabase.storage.updateBucket(bucket, {
      public: false,
      fileSizeLimit: 52428800,
      allowedMimeTypes: [
        'application/pdf',
        'application/zip',
        'image/png',
        'image/jpeg',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
      ]
    });

    const buffer = await file.arrayBuffer();
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({
        error: error.message,
        supported_mime_types: [
          'pdf', 'zip', 'png', 'jpg', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'
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
