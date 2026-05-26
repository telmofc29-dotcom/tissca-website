-- migrate-feedback-phase4.sql
-- Triage + Release Intelligence
-- Additive migration — all columns use IF NOT EXISTS.
-- Existing rows: severity defaults to 'medium', all other new columns default to NULL.
-- Apply once in Supabase SQL Editor.

-- ─── New columns ─────────────────────────────────────────────────────────────

ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS severity           TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS reproducibility    TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fixed_in_version   TEXT,
  ADD COLUMN IF NOT EXISTS duplicate_of_id    TEXT;

-- ─── CHECK constraints (idempotent via exception blocks) ─────────────────────

DO $$ BEGIN
  ALTER TABLE feedback ADD CONSTRAINT feedback_severity_check
    CHECK (severity IN ('low', 'medium', 'high', 'critical'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE feedback ADD CONSTRAINT feedback_reproducibility_check
    CHECK (reproducibility IS NULL OR reproducibility IN (
      'always', 'sometimes', 'rare', 'unable_to_reproduce'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend the status CHECK to include new lifecycle states.
-- Drop the old constraint first (safe — we're adding a superset of old values).
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_status_check;

DO $$ BEGIN
  ALTER TABLE feedback ADD CONSTRAINT feedback_status_check
    CHECK (status IN (
      -- Phase 4 lifecycle states
      'new', 'investigating', 'planned', 'in_progress',
      'fixed', 'released', 'closed', 'duplicate',
      -- Legacy states — kept for backward compat with existing rows
      'in-progress', 'done'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_feedback_severity
  ON feedback (severity);

CREATE INDEX IF NOT EXISTS idx_feedback_critical_open
  ON feedback (severity, status)
  WHERE severity = 'critical';

-- Composite index for release intelligence queries (group by app_version)
CREATE INDEX IF NOT EXISTS idx_feedback_appversion_severity
  ON feedback (app_version, severity)
  WHERE app_version IS NOT NULL;
