-- ═══════════════════════════════════════════════════════════════════════
-- TISSCA: Bootstrap `crm_history` table
--
-- PURPOSE:
-- Ensures the `crm_history` table exists in any environment.
-- On live servers where the table already exists this is a no-op.
--
-- This is an append-only audit log for all CRM entity events:
--   • lead created / updated / deleted / converted_to_job
--   • job created / updated / deleted / deposit_paid
--   • document generated / regenerated
--   • task created / updated / deleted (uses workspace_id + snapshot_json)
--   • room_layout / asset events
--
-- Dual scoping: older events use business_id, task events use workspace_id.
-- getHistory() merges both scopes and deduplicates by id.
--
-- SAFETY:
-- - Production-safe, fully idempotent (IF NOT EXISTS throughout)
-- - No DROP, no ALTER COLUMN, no DELETE, no TRUNCATE
-- - Additive only
--
-- RUN IN: Supabase SQL Editor
-- DEPENDS ON: none (soft references only)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.crm_history (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dual scoping: business_id for CRM entities, workspace_id for tasks
  business_id     uuid,
  workspace_id    uuid,

  -- What changed
  entity_type     text,                   -- 'lead', 'job', 'task', 'document', 'room_layout', 'asset'
  entity_id       text,                   -- UUID of the changed entity

  -- What happened
  action          text,                   -- 'created', 'updated', 'deleted', 'generated', 'regenerated', 'converted_to_job', 'deposit_paid', etc.

  -- Full entity state at the moment (tasks only)
  snapshot_json   jsonb,

  -- Event metadata (name, title, reference, version, etc.)
  details         jsonb,

  -- Who did it
  performed_by    uuid,                   -- auth.users.id (CRM events)
  created_by      uuid,                   -- auth.users.id (task events — Android-aligned)

  -- Cross-platform deduplication key: format "${entityId}:${action}:${timestamp}"
  client_event_id text,

  -- Timestamp
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_crm_history_business_id
  ON public.crm_history(business_id)
  WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_history_workspace_id
  ON public.crm_history(workspace_id)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_history_entity
  ON public.crm_history(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_crm_history_created_at
  ON public.crm_history(created_at DESC);

-- Partial unique index for task dedup (client_event_id is only set for tasks)
CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_history_client_event
  ON public.crm_history(client_event_id)
  WHERE client_event_id IS NOT NULL;

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.crm_history ENABLE ROW LEVEL SECURITY;
