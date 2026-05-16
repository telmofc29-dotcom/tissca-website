-- Additive migration: add is_blocked column to the existing feedback table.
-- Safe to run multiple times (uses IF NOT EXISTS pattern).
-- Run this against your Supabase project via the SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback' AND column_name = 'is_blocked'
  ) THEN
    ALTER TABLE feedback ADD COLUMN is_blocked BOOLEAN DEFAULT NULL;
  END IF;
END
$$;

-- Index for quickly finding blocked submissions
CREATE INDEX IF NOT EXISTS idx_feedback_is_blocked ON feedback (is_blocked) WHERE is_blocked = true;
