-- ═══════════════════════════════════════════════════════════════════════
-- TISSCA: Bootstrap `tool_attachments` table
--
-- PURPOSE:
-- Ensures the `tool_attachments` table exists in any environment.
-- On live servers where the table already exists this is a no-op.
--
-- Tool attachments link structured tool output (e.g. General Estimate)
-- to leads and/or jobs. The `result_data` JSONB column stores the
-- full ToolAttachmentResultData payload including line items, totals,
-- cost buckets, and financial breakdowns.
--
-- Dual-ID model:
--   lead_id  — set when tool is created in lead context
--   job_id   — set during lead→job conversion (lead_id kept for audit)
--
-- SAFETY:
-- - Production-safe, fully idempotent (IF NOT EXISTS throughout)
-- - No DROP, no ALTER COLUMN, no DELETE, no TRUNCATE
-- - Additive only
--
-- RUN IN: Supabase SQL Editor
-- DEPENDS ON: businesses table, leads table, jobs table
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tool_attachments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid        NOT NULL,

  -- Dual-ID linking: pre-conversion (lead) and post-conversion (job)
  lead_id         uuid,                   -- FK to leads; kept after conversion for audit
  job_id          uuid,                   -- FK to jobs; set on lead→job conversion

  -- Legacy classification (deprecated — use result_data.tool_key instead)
  tool_type       text,                   -- 'calculator' | 'estimator'
  tool_name       text,                   -- Human-readable name

  -- Full structured payload stored as JSONB
  -- Shape: { tool_key, preview_text, total_value, payload: { line_items[], ... } }
  result_data     jsonb,

  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tool_attachments_business_id
  ON public.tool_attachments(business_id);

CREATE INDEX IF NOT EXISTS idx_tool_attachments_lead_id
  ON public.tool_attachments(lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tool_attachments_job_id
  ON public.tool_attachments(job_id)
  WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tool_attachments_created_at
  ON public.tool_attachments(created_at DESC);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.tool_attachments ENABLE ROW LEVEL SECURITY;
