-- ═══════════════════════════════════════════════════════════════════════
-- TISSCA Phase F2: CRM Client Links Migration
--
-- PURPOSE:
-- Add client_id FK to leads and jobs tables, linking them to the
-- canonical clients table — the single source of truth for contact data.
--
-- This mirrors the existing pattern used by quotes and invoices:
--   quotes.client_id   → clients(id) ON DELETE CASCADE  (NOT NULL)
--   invoices.client_id → clients(id) ON DELETE CASCADE  (NOT NULL)
--
-- For leads and jobs, client_id is NULLABLE because:
--   - Early-stage leads may not yet have a client
--   - Jobs created independently may not have a client initially
--   - ON DELETE SET NULL ensures lead/job is not lost if client is removed
--
-- SAFETY:
-- - Production-safe, rerunnable (IF NOT EXISTS throughout)
-- - No DROP, no ALTER COLUMN, no DELETE, no TRUNCATE
-- - Additive only — two columns, two indexes
--
-- RUN IN: Supabase SQL Editor
-- DEPENDS ON: clients table (DATABASE_SCHEMA.sql table 9),
--             leads table, jobs table
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. leads.client_id — link lead to canonical client record
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS client_id uuid
  REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_client_id
  ON public.leads(client_id);

-- ───────────────────────────────────────────────────────────────────────
-- 2. jobs.client_id — link job to canonical client record
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS client_id uuid
  REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_client_id
  ON public.jobs(client_id);

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICATION (optional — run after migration to confirm)
-- ═══════════════════════════════════════════════════════════════════════
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('leads', 'jobs')
--   AND column_name = 'client_id';
--
-- Expected: 2 rows, both uuid, both YES (nullable)
-- ═══════════════════════════════════════════════════════════════════════
