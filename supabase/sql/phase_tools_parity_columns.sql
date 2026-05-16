-- ═══════════════════════════════════════════════════════════════════════
-- TISSCA: Tool Attachments — Android Parity Columns
--
-- PURPOSE:
-- Adds Android-compatible top-level columns to tool_attachments:
--   tool_key, tool_title, values_text, total, user_notes, raw_payload
-- These columns mirror the Android Kotlin data contract so that
-- cross-platform queries can work at column level, not JSONB paths.
--
-- SAFETY:
-- - Production-safe, fully idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- - No DROP, no ALTER COLUMN type, no DELETE, no TRUNCATE
-- - Additive only — existing result_data column untouched
--
-- ALSO ADDS:
-- - survey_date on leads table (Android parity)
-- - materials_delivery_date, work_start_date, work_finish_date on leads table
--
-- RUN IN: Supabase SQL Editor (before deployment)
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Tool Attachments: Android Parity Columns ───────────────────────────────

ALTER TABLE public.tool_attachments
  ADD COLUMN IF NOT EXISTS tool_key          text,
  ADD COLUMN IF NOT EXISTS tool_title        text,
  ADD COLUMN IF NOT EXISTS values_text       text,
  ADD COLUMN IF NOT EXISTS total             numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_notes        text,
  ADD COLUMN IF NOT EXISTS raw_payload       text;

-- Index on tool_key for cross-platform filtering
CREATE INDEX IF NOT EXISTS idx_tool_attachments_tool_key
  ON public.tool_attachments(tool_key)
  WHERE tool_key IS NOT NULL;

-- ─── Leads: CRM Date Columns ────────────────────────────────────────────────

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS survey_date              timestamptz,
  ADD COLUMN IF NOT EXISTS materials_delivery_date  timestamptz,
  ADD COLUMN IF NOT EXISTS work_start_date          timestamptz,
  ADD COLUMN IF NOT EXISTS work_finish_date         timestamptz;

-- Index on survey_date for calendar queries
CREATE INDEX IF NOT EXISTS idx_leads_survey_date
  ON public.leads(survey_date)
  WHERE survey_date IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════
-- END — Run this in Supabase SQL Editor before deploying this code update
-- ═══════════════════════════════════════════════════════════════════════
