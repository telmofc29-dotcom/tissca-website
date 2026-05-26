// src/app/api/feedback/upload-screenshot/route.ts
//
// POST /api/feedback/upload-screenshot
//
// Accepts multipart/form-data with a single image file (field name: "file").
// Validates MIME type and size, uploads to Supabase Storage
// (feedback-screenshots bucket), and returns the public CDN URL.
//
// The returned URL is stored in feedback.screenshots[] when the client
// subsequently calls POST /api/feedback.
//
// Auth:        Optional Bearer token — anonymous uploads allowed,
//              matching the same policy as POST /api/feedback.
// Rate limit:  20 uploads per IP per minute.
// Max size:    5 MB per file.
// Allowed MIME: image/jpeg, image/png, image/webp.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import {
  uploadFeedbackScreenshot,
  ALLOWED_SCREENSHOT_TYPES,
  MAX_SCREENSHOT_SIZE,
} from '@/lib/feedback/upload-screenshot';

const screenshotLimiter = rateLimit({ interval: 60_000, limit: 20 });

export async function POST(req: NextRequest) {
  // ── Rate limit by IP ────────────────────────────────────────────────────
  const ip = getClientIp(req);
  if (!screenshotLimiter.check(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // ── Parse multipart form data ───────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file field required (multipart/form-data)' }, { status: 400 });
  }

  // ── Validate MIME type ──────────────────────────────────────────────────
  // Never trust the filename extension — validate the Content-Type reported
  // by the multipart part. Browsers and mobile SDKs set this from the system
  // MIME registry, which is reliable for image types.
  if (!ALLOWED_SCREENSHOT_TYPES[file.type]) {
    return NextResponse.json(
      {
        error: `Invalid file type: ${file.type}. Allowed: ${Object.keys(ALLOWED_SCREENSHOT_TYPES).join(', ')}`,
      },
      { status: 400 },
    );
  }

  // ── Validate file size ──────────────────────────────────────────────────
  if (file.size === 0) {
    return NextResponse.json({ error: 'Empty file not allowed' }, { status: 400 });
  }

  if (file.size > MAX_SCREENSHOT_SIZE) {
    return NextResponse.json(
      {
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${MAX_SCREENSHOT_SIZE / 1024 / 1024}MB`,
      },
      { status: 400 },
    );
  }

  // ── Upload ──────────────────────────────────────────────────────────────
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadFeedbackScreenshot(buffer, file.type, file.size);

    return NextResponse.json(
      {
        success: true,
        url: result.url,
        path: result.path,
        size: result.size,
      },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed';

    // Surface a clear error if the bucket hasn't been created in Supabase yet.
    if (msg.toLowerCase().includes('bucket not found') || msg.toLowerCase().includes('bucket')) {
      console.error('[POST /api/feedback/upload-screenshot] Bucket missing:', msg);
      return NextResponse.json(
        {
          error:
            'Screenshot storage not configured. Create the feedback-screenshots bucket in Supabase Storage.',
        },
        { status: 503 },
      );
    }

    console.error('[POST /api/feedback/upload-screenshot] Upload failed:', msg);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
