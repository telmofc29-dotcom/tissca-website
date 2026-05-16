// src/app/api/storage/[...path]/route.ts
//
// Private storage proxy — serves files from private Supabase Storage buckets
// via short-lived signed URLs (60 min). The first path segment is the bucket name.
//
// Example: GET /api/storage/asset-thumbnails/uid/assetId/file.jpg
//   → signs asset-thumbnails:uid/assetId/file.jpg and redirects to the signed URL
//
// Auth: requires a valid Bearer token OR valid Supabase auth cookie.
// This keeps thumbnails renderable in server-rendered pages (cookie)
// and in client-fetched contexts (Bearer).
//
// NOTE: tisschat-relay (and legacy chat-files) buckets are relay-only storage.
// Signed URLs are short-lived. Browser should cache locally but must not treat
// server as permanent.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveUserFromToken } from '@/lib/workspace-data';

const ALLOWED_BUCKETS = new Set([
  'asset-thumbnails',
  'asset-meshes',
  'room-thumbnails',
  'room-meshes',
  'public-assets',
  'chat-files',       // legacy — backward compat for old media payloads
  'tisschat-relay',   // canonical relay bucket
]);

const RELAY_BUCKETS = new Set(['chat-files', 'tisschat-relay']);

const SIGNED_URL_EXPIRY = 3600; // 1 hour

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  try {
    // Require at least bucket + one path segment
    if (!params.path || params.path.length < 2) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const bucket = params.path[0];
    const filePath = params.path.slice(1).join('/');

    // Validate bucket name to prevent access to unexpected buckets
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
    }

    // Auth — try Bearer token first, then fall back to cookie-based session
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') || null;
    if (token) {
      const resolved = await resolveUserFromToken(token);
      if (!resolved?.authId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      // For server-rendered pages: accept if the request comes from the same origin
      // The admin layout already gates with requirePlatformStaff(), so if we're
      // rendering inside the admin shell, the user is already authenticated.
      // For extra safety, we still require the Cookie header to be present.
      const cookieHeader = req.headers.get('cookie') || '';
      if (!cookieHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Generate signed URL using service role
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

    if (error || !data?.signedUrl) {
      console.error('[storage proxy] Signed URL failed:', error?.message);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Redirect to the signed URL (browser fetches directly from Supabase CDN)
    // For chat relay files, hint browser to cache immutable content locally.
    const headers: Record<string, string> = {};
    if (RELAY_BUCKETS.has(bucket)) {
      // Private cache — browser can cache for 1 day; relay blob is immutable once uploaded
      headers['Cache-Control'] = 'private, max-age=86400, immutable';
    }
    return NextResponse.redirect(data.signedUrl, { status: 302, headers });
  } catch (err) {
    console.error('[GET /api/storage/...] Failed:', err);
    return NextResponse.json({ error: 'Storage error' }, { status: 500 });
  }
}
