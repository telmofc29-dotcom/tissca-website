-- migrate-admin-notifications-phase2.sql
--
-- Phase 2: platform_events + admin_notifications tables
-- Idempotent: all CREATE TABLE / CREATE INDEX / constraint additions use
-- IF NOT EXISTS / exception blocks so this can be re-run safely.
--
-- Run once in the Supabase SQL Editor after deploying the code changes.
-- No destructive changes. Purely additive.

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: public.platform_events
-- Central, append-only event log. All modules write here. Never modified.
-- Service-role writes via API routes. No direct client access.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.platform_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification
  module          text        NOT NULL,
  event_type      text        NOT NULL,
  severity        text        NOT NULL DEFAULT 'info',
  source          text        NOT NULL DEFAULT 'system',

  -- Routing / attribution
  workspace_id    uuid        REFERENCES public.workspaces(id)  ON DELETE SET NULL,
  user_id         uuid        REFERENCES auth.users(id)          ON DELETE SET NULL,
  actor_staff_id  uuid        REFERENCES auth.users(id)          ON DELETE SET NULL,

  -- Payload
  title           text        NOT NULL,
  body            text,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Entity reference for deep-linking
  entity_type     text,
  entity_id       text,
  deep_link       text,

  -- Timestamps
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Deduplication: UNIQUE NULL allows multiple NULLs; non-null values must be distinct
  idempotency_key text        UNIQUE
);

-- ─── Check constraints (idempotent via exception blocks) ──────────────────

DO $$ BEGIN
  ALTER TABLE public.platform_events
    ADD CONSTRAINT platform_events_severity_check
    CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.platform_events
    ADD CONSTRAINT platform_events_source_check
    CHECK (source IN ('system', 'webhook', 'api', 'cron', 'user_action'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.platform_events
    ADD CONSTRAINT platform_events_module_check
    CHECK (module IN (
      'feedback', 'crm', 'invoices', 'quotes', 'planner', 'chat',
      'sync', 'subscription', 'admin', 'release', 'ai', 'accountant'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_platform_events_module
  ON public.platform_events (module);

CREATE INDEX IF NOT EXISTS idx_platform_events_event_type
  ON public.platform_events (event_type);

CREATE INDEX IF NOT EXISTS idx_platform_events_severity
  ON public.platform_events (severity);

CREATE INDEX IF NOT EXISTS idx_platform_events_workspace_id
  ON public.platform_events (workspace_id)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_events_occurred_at
  ON public.platform_events (occurred_at DESC);

-- Composite for inbox queries filtering by module + severity
CREATE INDEX IF NOT EXISTS idx_platform_events_module_severity
  ON public.platform_events (module, severity);

-- ─── Row Level Security ───────────────────────────────────────────────────
-- Service-role bypasses RLS for all writes (API routes use service key).
-- No direct client access. Staff reads are served by API routes only.

ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE policies for client role — intentionally absent.
-- Service role key bypasses RLS; anon/authenticated clients cannot read events directly.


-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: public.admin_notifications
-- Per-staff inbox. Fan-out from platform_events (one row per staff member).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to source event (cascade delete keeps inbox clean)
  event_id        uuid        REFERENCES public.platform_events(id) ON DELETE CASCADE,

  -- Target staff member
  staff_user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Read / dismiss state
  is_read         boolean     NOT NULL DEFAULT false,
  read_at         timestamptz,
  is_dismissed    boolean     NOT NULL DEFAULT false,
  dismissed_at    timestamptz,

  -- Assignment (Phase 3 — columns present now for schema stability)
  assigned_to     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at     timestamptz,
  handled_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at      timestamptz,

  -- Escalation (Phase 3)
  escalated       boolean     NOT NULL DEFAULT false,
  escalated_at    timestamptz,
  escalation_reason text,

  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────

-- Primary inbox query: staff_user_id + unread + not dismissed, newest first
CREATE INDEX IF NOT EXISTS idx_admin_notif_staff_unread
  ON public.admin_notifications (staff_user_id, is_read, is_dismissed, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notif_event_id
  ON public.admin_notifications (event_id);

CREATE INDEX IF NOT EXISTS idx_admin_notif_assigned
  ON public.admin_notifications (assigned_to)
  WHERE assigned_to IS NOT NULL;

-- ─── Row Level Security ───────────────────────────────────────────────────

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Each staff member sees only their own rows
DO $$ BEGIN
  CREATE POLICY "staff_see_own_notifications"
    ON public.admin_notifications
    FOR SELECT
    USING (staff_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Each staff member updates only their own rows
DO $$ BEGIN
  CREATE POLICY "staff_update_own_notifications"
    ON public.admin_notifications
    FOR UPDATE
    USING (staff_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- INSERT and DELETE: service-role only (no client policy needed — service role bypasses RLS)
