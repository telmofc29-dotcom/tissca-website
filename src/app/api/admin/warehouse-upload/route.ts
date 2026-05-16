// src/app/api/admin/warehouse-upload/route.ts
//
// Admin-only file upload for warehouse asset thumbnails and 3D models.
// Uses Supabase Storage buckets: asset-thumbnails, asset-meshes
//
// POST /api/admin/warehouse-upload
//   FormData: file (required), bucket ('thumbnail' | 'model'), assetId (optional subfolder)
//   Returns: { path, fullPath, bucket, size, type }
//
// Stored reference format: "<bucket>/<owner_id>/<folder>/<filename>"
// Render via: /api/storage/<fullPath> (signed URL proxy)

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveUserFromToken } from '@/lib/workspace-data';

const ALLOWED_THUMBNAIL_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_MODEL_TYPES = [
  'model/ply',
  'model/vnd.usdz+zip',
  'application/octet-stream',
  'model/gltf-binary',
];
const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_MODEL_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') || null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved?.authId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin gate: verify user is platform staff
    const supabase = createServerSupabaseClient();
    const { data: staffRecord } = await supabase
      .from('tissca_staff')
      .select('is_active')
      .eq('user_id', resolved.authId)
      .maybeSingle();

    if (!staffRecord?.is_active) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bucketType = (formData.get('bucket') as string) || 'thumbnail';
    const assetId = formData.get('assetId') as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate bucket type
    if (bucketType !== 'thumbnail' && bucketType !== 'model') {
      return NextResponse.json({ error: 'Invalid bucket type. Use "thumbnail" or "model".' }, { status: 400 });
    }

    // Select bucket and validation rules
    const bucketName = bucketType === 'thumbnail' ? 'asset-thumbnails' : 'asset-meshes';
    const allowedTypes = bucketType === 'thumbnail' ? ALLOWED_THUMBNAIL_TYPES : ALLOWED_MODEL_TYPES;
    const maxSize = bucketType === 'thumbnail' ? MAX_THUMBNAIL_SIZE : MAX_MODEL_SIZE;

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${maxSize / 1024 / 1024}MB` },
        { status: 400 },
      );
    }

    // Build deterministic storage path: <owner_id>/<assetId|timestamp>/<sanitised_filename>
    // Path traversal prevention: strip leading dots and slashes from filename
    const rawName = file.name.replace(/^[./\\]+/, '');
    const sanitisedName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'upload';
    const folder = assetId || Date.now().toString();
    const storagePath = `${resolved.authId}/${folder}/${sanitisedName}`;

    // Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('[warehouse-upload] Upload failed:', error.message);
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
    }

    // Return the canonical reference path (bucket/path).
    // Clients render via /api/storage/<fullPath> which generates signed URLs.
    const fullPath = `${bucketName}/${data.path}`;

    return NextResponse.json({
      path: data.path,
      fullPath,
      bucket: bucketName,
      size: file.size,
      type: file.type,
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/admin/warehouse-upload] Failed:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
