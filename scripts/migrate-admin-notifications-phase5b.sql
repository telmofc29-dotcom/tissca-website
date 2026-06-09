-- scripts/migrate-admin-notifications-phase5b.sql
--
-- Phase 5B: Private Staff Notes + My Workbench Foundation
--
-- PREREQUISITES:
--   Phase 5A migration must already be applied (workflow_status, claimed_at,
--   notification_activity table all exist).
--
-- Safe to rerun: all blocks are idempotent via IF NOT EXISTS and DO $$ / EXCEPTION guards.
-- Never modifies or drops existing columns, constraints, or data.
--
-- Run in Supabase SQL Editor. Do NOT use any ORM migration runner.
--
-- SECURITY MODEL:
--   notification_notes is a private troubleshooting layer.
--   - Assigned staff (admin_notifications.assigned_to) can read/write notes.
--   - Superadmin can read/write ALL notes (enforced server-side via service-role client).
--   - Other staff CANNOT read note content.
--   RLS SELECT policy below covers the assigned-staff path. Superadmin override is
--   handled by the service-role API routes which bypass RLS. All client access is
--   API-mediated — there is no direct browser DB access to this table.

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCK 1 — notification_notes: private append-and-edit troubleshooting notes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_notes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source notification (cascades on delete)
  notification_id uuid        NOT NULL
    REFERENCES public.admin_notifications(id) ON DELETE CASCADE,

  -- Author (staff member who wrote the note)
  staff_user_id   uuid        NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Note body
  note            text        NOT NULL,

  -- Note category
  note_type       text        NOT NULL DEFAULT 'internal',
  -- Valid values enforced by CHECK below:
  --   internal | resolution | escalation_reason
  --   user_context | engineering_note | accounting_note

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz
);

-- CHECK on note_type values
DO $$ BEGIN
  ALTER TABLE public.notification_notes
    ADD CONSTRAINT notif_notes_type_check
    CHECK (note_type IN (
      'internal', 'resolution', 'escalation_reason',
      'user_context', 'engineering_note', 'accounting_note'
    ));
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'notif_notes_type_check already exists — skipping.';
END $$;

-- Index: fetch notes for a specific notification (most recent first)
CREATE INDEX IF NOT EXISTS idx_notif_notes_notification_id
  ON public.notification_notes (notification_id, created_at DESC);

-- Index: author lookups / audit
CREATE INDEX IF NOT EXISTS idx_notif_notes_staff_user_id
  ON public.notification_notes (staff_user_id);

-- Index: created_at for chronological scans
CREATE INDEX IF NOT EXISTS idx_notif_notes_created_at
  ON public.notification_notes (created_at DESC);

-- Index: note_type filtering
CREATE INDEX IF NOT EXISTS idx_notif_notes_note_type
  ON public.notification_notes (note_type);

-- Enable RLS
ALTER TABLE public.notification_notes ENABLE ROW LEVEL SECURITY;

-- SELECT policy: a staff member may read notes for notifications that are
-- assigned to them (any of the fan-out rows for the event has assigned_to = auth.uid()).
-- Superadmin read-all is enforced server-side via the service-role client (bypasses RLS).
-- Client-side direct DB access: not available (all reads go through API routes).
DO $$ BEGIN
  CREATE POLICY "staff_see_assigned_notes"
    ON public.notification_notes
    FOR SELECT
    USING (
      notification_id IN (
        SELECT id FROM public.admin_notifications
        WHERE assigned_to = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'staff_see_assigned_notes policy already exists — skipping.';
END $$;

-- No INSERT / UPDATE / DELETE client-side policies.
-- All writes go through service-role API routes only, which independently
-- re-validate that the caller is the assigned staff member or a superadmin.

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES (run manually after migration to confirm success)
-- ─────────────────────────────────────────────────────────────────────────────

-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'notification_notes'
-- ORDER BY ordinal_position;

-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'public.notification_notes'::regclass;

-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'notification_notes';

-- SELECT polname FROM pg_policies
-- WHERE tablename = 'notification_notes';
