-- migrate-feedback-phase1.sql
-- Additive migration — Phase 1: unified cross-platform feedback
-- Run once in Supabase SQL Editor or via migration tooling.
-- All columns are additive; existing rows get default values.

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS user_id        UUID,
  ADD COLUMN IF NOT EXISTS workspace_id   UUID,
  ADD COLUMN IF NOT EXISTS platform       TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS app_version    TEXT,
  ADD COLUMN IF NOT EXISTS build_number   TEXT,
  ADD COLUMN IF NOT EXISTS os_version     TEXT,
  ADD COLUMN IF NOT EXISTS device_model   TEXT,
  ADD COLUMN IF NOT EXISTS screenshots    TEXT[],
  ADD COLUMN IF NOT EXISTS alpha_tester   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_reply    TEXT,
  ADD COLUMN IF NOT EXISTS replied_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS triage_tags    TEXT[];

-- Add platform CHECK constraint (idempotent via exception block)
DO $$ BEGIN
  ALTER TABLE feedback ADD CONSTRAINT feedback_platform_check
    CHECK (platform IN ('web', 'android', 'ios', 'api'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feedback_user_id      ON feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_workspace_id ON feedback (workspace_id);
CREATE INDEX IF NOT EXISTS idx_feedback_platform     ON feedback (platform);
CREATE INDEX IF NOT EXISTS idx_feedback_alpha_tester ON feedback (alpha_tester) WHERE alpha_tester = true;
CREATE INDEX IF NOT EXISTS idx_feedback_created_at   ON feedback(created_at DESC);