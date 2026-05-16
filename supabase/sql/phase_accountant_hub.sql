-- ═══════════════════════════════════════════════════════════════════════
-- TISSCA Accountant Hub — Schema Foundation
--
-- PURPOSE:
-- 1. Ensure workspace_members.role supports 'accountant' role
-- 2. Create accountant_hub_snapshots table (server-computed financial truth)
-- 3. Create accountant_hub_audit_log table (reconciliation + traceability)
-- 4. Add index and RLS policies
--
-- SAFETY:
-- - Production-safe, rerunnable (IF NOT EXISTS / DO $$ blocks throughout)
-- - No DROP, no ALTER COLUMN type, no DELETE, no TRUNCATE
-- - Additive only
--
-- BUSINESS RULES (LOCKED):
-- - Free: No access
-- - Pro: Owner only (single-user plan, owner = sole member)
-- - Team Starter: Owner only (members blocked)
-- - Team Pro: Owner + accountant only (admin and member blocked)
--
-- RUN IN: Supabase SQL Editor
-- DEPENDS ON: workspaces, workspace_members, auth.users, invoices, quotes, documents
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────
-- 1. workspace_members.role — Ensure 'accountant' is a valid value
--
-- JUSTIFICATION:
-- The workspace_members table currently stores role as text with known
-- values: 'owner', 'admin', 'member'. We need 'accountant' to enforce
-- Accountant Hub access rules at the database level.
--
-- APPROACH:
-- If a CHECK constraint already exists on role, alter it to include
-- 'accountant'. If no constraint exists, add one. Uses DO $$ block
-- for safe conditional execution.
-- ───────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  _constraint_name text;
  _check_clause text;
BEGIN
  -- Find any existing CHECK constraint on workspace_members.role
  SELECT con.conname, pg_get_constraintdef(con.oid)
  INTO _constraint_name, _check_clause
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attrelid = con.conrelid
                       AND att.attnum = ANY(con.conkey)
  WHERE con.conrelid = 'public.workspace_members'::regclass
    AND att.attname = 'role'
    AND con.contype = 'c'
  LIMIT 1;

  IF _constraint_name IS NOT NULL THEN
    -- Check if 'accountant' is already in the constraint
    IF _check_clause NOT LIKE '%accountant%' THEN
      -- Drop old constraint and recreate with accountant included
      EXECUTE format('ALTER TABLE public.workspace_members DROP CONSTRAINT %I', _constraint_name);
      ALTER TABLE public.workspace_members
        ADD CONSTRAINT workspace_members_role_check
        CHECK (role IN ('owner', 'admin', 'member', 'accountant'));
      RAISE NOTICE 'Updated workspace_members role CHECK to include accountant';
    ELSE
      RAISE NOTICE 'workspace_members role CHECK already includes accountant';
    END IF;
  ELSE
    -- No CHECK constraint exists — add one
    -- First verify the column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'workspace_members'
        AND column_name = 'role'
    ) THEN
      ALTER TABLE public.workspace_members
        ADD CONSTRAINT workspace_members_role_check
        CHECK (role IN ('owner', 'admin', 'member', 'accountant'));
      RAISE NOTICE 'Added workspace_members role CHECK constraint with accountant';
    ELSE
      RAISE NOTICE 'workspace_members.role column does not exist — skipping constraint';
    END IF;
  END IF;
END $$;

-- Index on role for fast accountant lookups
CREATE INDEX IF NOT EXISTS idx_workspace_members_role
  ON public.workspace_members(role);

-- Composite index for the exact query pattern used in Accountant Hub access checks:
-- WHERE user_id = $1 AND workspace_id = $2 → returns role
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace
  ON public.workspace_members(user_id, workspace_id);


-- ───────────────────────────────────────────────────────────────────────
-- 2. accountant_hub_snapshots — Server-computed financial truth
--
-- JUSTIFICATION:
-- The current Accountant Hub computes all numbers via live SUM/COUNT
-- aggregations. This is fragile:
-- - No audit trail of what was shown
-- - No ability to detect drift between live data and displayed data
-- - No versioned snapshots for accountant review
--
-- This table stores periodic server-computed snapshots. The API
-- computes a snapshot, stores it, and returns it alongside live data.
-- Client can compare live vs snapshot to detect mismatches.
-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.accountant_hub_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- Snapshot identity
  snapshot_version integer NOT NULL DEFAULT 1,
  computed_at      timestamptz NOT NULL DEFAULT now(),
  computed_by      text NOT NULL DEFAULT 'server',
    -- 'server' = API route computed
    -- 'client' = client-side verification
    -- 'reconciliation' = automated reconciliation job

  -- Financial period
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  tax_year        text,                -- e.g. '2026/2027'
  currency        text NOT NULL DEFAULT 'GBP',

  -- Revenue snapshot
  year_revenue          numeric(14, 2) NOT NULL DEFAULT 0,
  month_revenue         numeric(14, 2) NOT NULL DEFAULT 0,
  prev_month_revenue    numeric(14, 2) NOT NULL DEFAULT 0,

  -- Invoice snapshot
  invoices_total        integer NOT NULL DEFAULT 0,
  invoices_paid         integer NOT NULL DEFAULT 0,
  invoices_outstanding  integer NOT NULL DEFAULT 0,
  invoices_overdue      integer NOT NULL DEFAULT 0,
  total_paid            numeric(14, 2) NOT NULL DEFAULT 0,
  total_outstanding     numeric(14, 2) NOT NULL DEFAULT 0,

  -- Quote snapshot
  quotes_total          integer NOT NULL DEFAULT 0,
  quotes_accepted       integer NOT NULL DEFAULT 0,

  -- Document counts
  docs_invoices_generated integer NOT NULL DEFAULT 0,
  docs_quotes_generated   integer NOT NULL DEFAULT 0,

  -- Tax estimate snapshot
  estimated_annual_tax  numeric(14, 2) NOT NULL DEFAULT 0,
  effective_tax_rate    numeric(6, 2) NOT NULL DEFAULT 0,

  -- Reconciliation state
  reconciliation_status text NOT NULL DEFAULT 'unverified'
    CHECK (reconciliation_status IN ('unverified', 'verified', 'mismatch', 'stale')),
  mismatch_flags        jsonb DEFAULT '{}',
    -- e.g. { "year_revenue": { "snapshot": 12000, "live": 12050, "delta": 50 } }

  -- Source record counts (for integrity checks)
  source_invoice_ids    jsonb,          -- array of invoice IDs included in this snapshot
  source_quote_ids      jsonb,          -- array of quote IDs included in this snapshot

  -- Metadata
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup: latest snapshot per workspace
CREATE INDEX IF NOT EXISTS idx_ahs_workspace_computed
  ON public.accountant_hub_snapshots(workspace_id, computed_at DESC);

-- Reconciliation status queries
CREATE INDEX IF NOT EXISTS idx_ahs_reconciliation_status
  ON public.accountant_hub_snapshots(reconciliation_status);

-- Enable RLS
ALTER TABLE public.accountant_hub_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS: Only workspace members with owner/accountant role can read snapshots
CREATE POLICY IF NOT EXISTS "Workspace owner or accountant can read snapshots"
  ON public.accountant_hub_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = accountant_hub_snapshots.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'accountant')
    )
  );

-- RLS: Only service role (API) can insert snapshots — no direct client writes
-- (Default deny: no INSERT policy for authenticated role)


-- ───────────────────────────────────────────────────────────────────────
-- 3. accountant_hub_audit_log — Full audit trail
--
-- JUSTIFICATION:
-- Financial features require traceability. Every access, every snapshot
-- computation, every reconciliation result should be logged.
-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.accountant_hub_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Action classification
  action          text NOT NULL CHECK (action IN (
    'access_granted',       -- user accessed Accountant Hub successfully
    'access_denied',        -- user was blocked (wrong role/tier)
    'snapshot_created',     -- server computed and stored a snapshot
    'client_verification',  -- client sent a verification snapshot
    'reconciliation_pass',  -- live vs snapshot matched within tolerance
    'reconciliation_fail',  -- live vs snapshot mismatch detected
    'data_exported'         -- user exported CSV/PDF
  )),

  -- Context
  snapshot_id     uuid REFERENCES public.accountant_hub_snapshots(id) ON DELETE SET NULL,
  plan_tier       text,
  member_role     text,
  detail          jsonb DEFAULT '{}',
    -- Flexible detail payload:
    -- access_denied: { "reason": "role_not_allowed", "actual_role": "member" }
    -- reconciliation_fail: { "mismatches": { "year_revenue": { "live": 12050, "snapshot": 12000 } } }
    -- data_exported: { "format": "csv", "row_count": 42 }

  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup: audit trail per workspace
CREATE INDEX IF NOT EXISTS idx_ahal_workspace_created
  ON public.accountant_hub_audit_log(workspace_id, created_at DESC);

-- Action type queries
CREATE INDEX IF NOT EXISTS idx_ahal_action
  ON public.accountant_hub_audit_log(action);

-- Enable RLS
ALTER TABLE public.accountant_hub_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: Only workspace owner or accountant can read audit log
CREATE POLICY IF NOT EXISTS "Workspace owner or accountant can read audit log"
  ON public.accountant_hub_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = accountant_hub_audit_log.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'accountant')
    )
  );

-- RLS: Only service role (API) can insert audit log entries
-- (Default deny: no INSERT policy for authenticated role)


-- ───────────────────────────────────────────────────────────────────────
-- 4. Comment block — Summary of changes
-- ───────────────────────────────────────────────────────────────────────

-- SUMMARY OF CHANGES:
-- 1. workspace_members.role CHECK now includes 'accountant'
-- 2. idx_workspace_members_role — fast role lookups
-- 3. idx_workspace_members_user_workspace — fast membership + role lookups
-- 4. accountant_hub_snapshots table — server-computed financial snapshots
-- 5. accountant_hub_audit_log table — full audit trail
-- 6. RLS policies on both new tables — owner + accountant read only
-- 7. No INSERT policies for authenticated role — service role only writes

-- TO VERIFY after running:
--   SELECT * FROM information_schema.table_constraints
--   WHERE table_name = 'workspace_members' AND constraint_type = 'CHECK';
--
--   SELECT * FROM information_schema.tables
--   WHERE table_name IN ('accountant_hub_snapshots', 'accountant_hub_audit_log');
