-- phase_w5_quote_invoice_lead_job_bridge.sql
--
-- PURPOSE:
-- Add nullable bridge columns so website quotes/invoices can optionally link
-- back to CRM leads/jobs. This allows the PDF routes to look up tool_attachments
-- for the parent lead/job and render tool-aware items instead of the generic
-- quote_items/invoice_items fallback.
--
-- SAFETY:
-- - All new columns are nullable — existing records are unaffected.
-- - ON DELETE SET NULL — deleting a lead/job does not cascade-delete quotes/invoices.
-- - Indexes are partial (WHERE NOT NULL) — no overhead on the NULL majority.
-- - No RLS changes needed: workspace_id scoping already present on both tables.
-- - No data migration required.
--
-- BACKWARD COMPATIBILITY:
-- - Existing quotes/invoices with lead_id = NULL behave exactly as before.
-- - PDF routes check the column before attempting the tool_attachments join.
--
-- DATE: 2026-05-19
-- PHASE: W5

-- ── quotes: add optional lead link ──────────────────────────────────────────

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS lead_id uuid
    REFERENCES public.leads(id) ON DELETE SET NULL;

-- Partial index: only non-null rows, keeps insert performance unaffected
CREATE INDEX IF NOT EXISTS idx_quotes_lead_id
  ON public.quotes(lead_id)
  WHERE lead_id IS NOT NULL;

-- ── invoices: add optional lead + job links ───────────────────────────────

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS lead_id uuid
    REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_id  uuid
    REFERENCES public.jobs(id)  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_lead_id
  ON public.invoices(lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_job_id
  ON public.invoices(job_id)
  WHERE job_id IS NOT NULL;
