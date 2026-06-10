-- scripts/setup-feedback-screenshots-bucket.sql
--
-- Mobile Feedback — Screenshot Storage Bucket setup.
--
-- The feedback screenshot upload endpoint (POST /api/feedback/upload-screenshot)
-- and the shared helper src/lib/feedback/upload-screenshot.ts both require a
-- Supabase Storage bucket named `feedback-screenshots`. Until it exists the
-- upload endpoint returns HTTP 503 with a clear message.
--
-- This script is the documented, manual infra step. Run it ONCE in the
-- Supabase SQL Editor (same convention as the migrate-*.sql files).
-- It does NOT create the bucket from application runtime code — by design.
--
-- Bucket requirements (must match src/lib/feedback/upload-screenshot.ts):
--   - Visibility:        public read (CDN URLs, no signing)
--   - Write access:      service-role only (API route handles writes)
--   - Max object size:   5 MB
--   - Allowed MIME:      image/jpeg, image/png, image/webp
--
-- Idempotent: safe to rerun. Never drops or modifies existing objects.

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 1 — Create the bucket (public, 5 MB cap, image MIME allowlist)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-screenshots',
  'feedback-screenshots',
  true,                                                  -- public read
  5242880,                                               -- 5 MB (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/png', 'image/webp']         -- allowed MIME types
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 2 — Public read policy (SELECT) on objects in this bucket
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Writes (INSERT/UPDATE/DELETE) are intentionally NOT granted here: all writes
-- go through the service-role API route, which bypasses RLS.

DO $$ BEGIN
  CREATE POLICY "feedback_screenshots_public_read"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'feedback-screenshots');
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'feedback_screenshots_public_read policy already exists — skipping.';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION (run manually after setup)
-- ─────────────────────────────────────────────────────────────────────────────

-- SELECT id, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets WHERE id = 'feedback-screenshots';

-- SELECT polname FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
--   AND polname = 'feedback_screenshots_public_read';
