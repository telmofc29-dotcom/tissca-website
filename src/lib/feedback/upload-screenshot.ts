// src/lib/feedback/upload-screenshot.ts
//
// Shared server-side helper for uploading feedback screenshots to Supabase Storage.
// Called exclusively by POST /api/feedback/upload-screenshot — never from client code.
//
// Bucket: feedback-screenshots
//   - Public read (CDN URL is permanent, no signing required)
//   - Service-role write (via createServerSupabaseClient)
//   - No user PII in storage paths
//
// Storage path: {uuid}.{ext}
//   Plain flat layout. UUID is generated server-side; extension is derived from
//   validated MIME type — the client-supplied filename is never used.

import { createServerSupabaseClient } from '@/lib/supabase';

export const FEEDBACK_SCREENSHOTS_BUCKET = 'feedback-screenshots';

/** Allowed MIME types → canonical file extension. */
export const ALLOWED_SCREENSHOT_TYPES: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};

/** 5 MB hard cap — matches the native contract doc. */
export const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;

export interface ScreenshotUploadResult {
  /** Full public CDN URL returned by Supabase Storage. */
  url: string;
  /** Storage path within the bucket, e.g. "a1b2c3d4-....webp" */
  path: string;
  /** File size in bytes. */
  size: number;
  /** Validated MIME type. */
  mimeType: string;
}

/**
 * Upload a single screenshot buffer to the feedback-screenshots bucket.
 *
 * Validates MIME type and size, generates a UUID-based storage path,
 * uploads via service-role client, and returns the public CDN URL.
 *
 * Throws on validation failure or Supabase error — the caller (API route)
 * is responsible for converting errors to HTTP responses.
 *
 * Compatible with future Android/iOS uploads: callers obtain a Buffer from
 * `file.arrayBuffer()` before invoking this function — File/Blob is never
 * passed here, keeping this helper environment-agnostic.
 */
export async function uploadFeedbackScreenshot(
  buffer: Buffer,
  mimeType: string,
  size: number,
): Promise<ScreenshotUploadResult> {
  const ext = ALLOWED_SCREENSHOT_TYPES[mimeType];
  if (!ext) {
    throw new Error(
      `Invalid MIME type: ${mimeType}. Allowed: ${Object.keys(ALLOWED_SCREENSHOT_TYPES).join(', ')}`,
    );
  }

  if (size > MAX_SCREENSHOT_SIZE) {
    throw new Error(
      `File too large: ${(size / 1024 / 1024).toFixed(1)}MB. Max: ${MAX_SCREENSHOT_SIZE / 1024 / 1024}MB`,
    );
  }

  // Extension is derived from validated MIME — filename is never trusted.
  const storagePath = `${crypto.randomUUID()}.${ext}`;

  const supabase = createServerSupabaseClient();

  const { error } = await supabase.storage
    .from(FEEDBACK_SCREENSHOTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(FEEDBACK_SCREENSHOTS_BUCKET)
    .getPublicUrl(storagePath);

  return {
    url: urlData.publicUrl,
    path: storagePath,
    size,
    mimeType,
  };
}
