-- scripts/migrate-admin-notifications-phase5a.sql
--
-- Phase 5A: Core Operational Workflow Infrastructure
--
-- PREREQUISITES:
--   Run this FIRST to audit existing roles before applying the tissca_staff constraint:
--     SELECT DISTINCT role FROM public.tissca_staff;
--   All roles must be one of: superadmin, admin, engineer, accountant, support
--   If any non-conforming role exists, remediate it before running block 2.
--
-- Safe to rerun: all blocks are idempotent via DO $$ / EXCEPTION guards and IF NOT EXISTS.
-- Never modifies or drops existing columns, constraints, or data.
--
-- Run in Supabase SQL Editor. Do NOT use any ORM migration runner.

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 1 — admin_notifications: workflow_status + claimed_at + indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. Add workflow_status column (default 'NEW' so all existing rows are initialised)
DO $$ BEGIN
  ALTER TABLE public.admin_notifications
    ADD COLUMN workflow_status text NOT NULL DEFAULT 'NEW';
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'workflow_status column already exists — skipping.';
END $$;

-- 1b. Add CHECK constraint on workflow_status
DO $$ BEGIN
  ALTER TABLE public.admin_notifications
    ADD CONSTRAINT admin_notif_workflow_status_check
    CHECK (workflow_status IN (
      'NEW', 'INVESTIGATING', 'WAITING_USER', 'WAITING_ENGINEER',
      'WAITING_ACCOUNTANT', 'ESCALATED', 'RESOLVED', 'DISMISSED', 'REOPENED'
    ));
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'admin_notif_workflow_status_check already exists — skipping.';
END $$;

-- 1c. Add claimed_at (set only when first claimed — nullable)
DO $$ BEGIN
  ALTER TABLE public.admin_notifications
    ADD COLUMN claimed_at timestamptz;
EXCEPTION WHEN duplicate_column THEN
  RAISE NOTICE 'claimed_at column already exists — skipping.';
END $$;

-- 1d. Index: My Workbench query pattern (assigned_to + workflow_status)
CREATE INDEX IF NOT EXISTS idx_admin_notif_workbench
  ON public.admin_notifications (assigned_to, workflow_status)
  WHERE assigned_to IS NOT NULL;

-- 1e. Index: Global inbox status filter
CREATE INDEX IF NOT EXISTS idx_admin_notif_status
  ON public.admin_notifications (workflow_status, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 2 — tissca_staff: formalise role values with CHECK constraint
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ⚠️  ONLY run this block after verifying SELECT DISTINCT role FROM public.tissca_staff
--     returns only: superadmin, admin, engineer, accountant, support (or NULL)
--
-- If any row has a role value not in this list, the ALTER will fail.
-- In that case: UPDATE public.tissca_staff SET role = '...' WHERE role = '...' first.

DO $$ BEGIN
  ALTER TABLE public.tissca_staff
    ADD CONSTRAINT tissca_staff_role_check
    CHECK (role IN ('superadmin', 'admin', 'engineer', 'accountant', 'support'));
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'tissca_staff_role_check already exists — skipping.';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 3 — notification_activity: immutable append-only audit trail
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_activity (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source notification (cascades on delete)
  notification_id uuid        NOT NULL
    REFERENCES public.admin_notifications(id) ON DELETE CASCADE,

  -- Actor (staff member who performed the action; NULL = system)
  actor_id        uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Action discriminator
  action          text        NOT NULL,
  -- Valid values enforced by CHECK below:
  --   CREATED | VIEWED | CLAIMED | ASSIGNED | REASSIGNED | STATUS_CHANGED
  --   ESCALATED | NOTE_ADDED | RESOLVED | DISMISSED | REOPENED | READ | READ_ALL

  -- Status transition (populated for STATUS_CHANGED, CLAIMED, RESOLVED, DISMISSED, REOPENED)
  from_status     text,
  to_status       text,

  -- Assignment transition (populated for CLAIMED, ASSIGNED, REASSIGNED, ESCALATED)
  from_assignee   uuid  REFERENCES auth.users(id) ON DELETE SET NULL,
  to_assignee     uuid  REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Note preview — first 200 chars of note body when action = NOTE_ADDED
  note_preview    text,

  -- Reason text — escalation reason, resolution note, reopen rationale, etc.
  reason          text,

  -- Arbitrary structured payload for extensibility
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,

  -- Immutable timestamp
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

-- CHECK on action values
DO $$ BEGIN
  ALTER TABLE public.notification_activity
    ADD CONSTRAINT notif_activity_action_check
    CHECK (action IN (
      'CREATED', 'VIEWED', 'CLAIMED', 'ASSIGNED', 'REASSIGNED',
      'STATUS_CHANGED', 'ESCALATED', 'NOTE_ADDED', 'RESOLVED',
      'DISMISSED', 'REOPENED', 'READ', 'READ_ALL'
    ));
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'notif_activity_action_check already exists — skipping.';
END $$;

-- Index: fetch timeline for a specific notification (most recent first)
CREATE INDEX IF NOT EXISTS idx_notif_activity_notification_id
  ON public.notification_activity (notification_id, occurred_at DESC);

-- Index: audit queries by actor
CREATE INDEX IF NOT EXISTS idx_notif_activity_actor_id
  ON public.notification_activity (actor_id)
  WHERE actor_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.notification_activity ENABLE ROW LEVEL SECURITY;

-- SELECT policy: staff see activity for notifications they own or are assigned to.
-- Superadmin read-all is enforced server-side via service-role client (bypasses RLS).
-- Client-side direct DB access: not available (all reads go through API routes).
DO $$ BEGIN
  CREATE POLICY "staff_see_own_activity"
    ON public.notification_activity
    FOR SELECT
    USING (
      notification_id IN (
        SELECT id FROM public.admin_notifications
        WHERE  staff_user_id = auth.uid()
            OR assigned_to   = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'staff_see_own_activity policy already exists — skipping.';
END $$;

-- No INSERT / UPDATE / DELETE client-side policies.
-- All writes go through service-role API routes only (append-only by convention).

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES (run manually after migration to confirm success)
-- ─────────────────────────────────────────────────────────────────────────────

-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'admin_notifications'
--   AND column_name IN ('workflow_status', 'claimed_at');

-- SELECT conname, consrc FROM pg_constraint
-- WHERE conrelid = 'public.admin_notifications'::regclass
--   AND conname = 'admin_notif_workflow_status_check';

-- SELECT COUNT(*) FROM public.notification_activity;

-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'public.tissca_staff'::regclass
--   AND conname = 'tissca_staff_role_check';
