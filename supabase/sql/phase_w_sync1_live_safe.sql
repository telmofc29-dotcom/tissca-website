-- phase_w_sync1_live_safe.sql
-- WEBSITE LIVE-SAFE TISSCHAT ALIGNMENT PATCH
--
-- This patch is SAFE to run against the LIVE TISSCA server.
-- It is idempotent — running it multiple times produces the same result.
--
-- DESIGN PRINCIPLES:
--   - The LIVE server is authoritative. We NEVER create tables that already exist.
--   - Every DDL operation uses IF NOT EXISTS / IF EXISTS guards.
--   - Data migrations are wrapped in DO blocks that check table/column existence.
--   - RLS policies use conditional creation to avoid duplicate-policy errors.
--
-- LIVE SERVER TABLES (confirmed):
--   conversations, conversation_members, conversation_member_state,
--   messages, message_reactions, message_links, user_devices,
--   workspaces (with plan_tier), workspace_members
--
-- WEBSITE-ONLY ARTIFACTS (may exist on website DB, do NOT exist on live):
--   conversation_reads (table), conversation_members.is_muted/is_archived (columns)
--
-- WHAT THIS PATCH DOES:
--   1. Adds missing columns to conversations (IF NOT EXISTS)
--   2. Adds missing columns to conversation_members (IF NOT EXISTS)
--   3. Backfills conversations.type from is_group (WHERE guard)
--   4. Backfills conversation_members.workspace_id (WHERE NULL guard)
--   5. Creates message_audit_log (IF NOT EXISTS, uncertain if on live)
--   6. Conditionally migrates conversation_reads → conversation_member_state (website cleanup)
--   7. Conditionally drops website-only columns/tables (IF EXISTS)
--   8. Creates indexes (IF NOT EXISTS)
--   9. Creates DM key unique index (IF NOT EXISTS)

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. conversations — add missing columns (safe: IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS type            text NOT NULL DEFAULT 'dm',
  ADD COLUMN IF NOT EXISTS created_by      uuid,
  ADD COLUMN IF NOT EXISTS last_message_id uuid,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS dm_key          text;

-- Backfill type from is_group (safe: WHERE guard prevents double-update)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'is_group'
  ) THEN
    UPDATE public.conversations SET type = 'group' WHERE is_group = true AND type = 'dm';
  END IF;
END $$;

-- DM dedup unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_dm_key
  ON public.conversations(workspace_id, dm_key) WHERE dm_key IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. conversation_members — add missing columns (safe: IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS id           uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- Backfill workspace_id from conversations (WHERE NULL guard)
UPDATE public.conversation_members cm
  SET workspace_id = c.workspace_id
  FROM public.conversations c
  WHERE cm.conversation_id = c.id AND cm.workspace_id IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. message_audit_log — uncertain if on live, so CREATE IF NOT EXISTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.message_audit_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid        NOT NULL,
  actor_id        uuid        NOT NULL,
  action          text        NOT NULL,
  entity_type     text        NOT NULL DEFAULT 'message',
  entity_id       uuid,
  conversation_id uuid,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_workspace ON public.message_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_conversation ON public.message_audit_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.message_audit_log(actor_id);

-- Constraint (conditional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_log_action_check'
  ) THEN
    ALTER TABLE public.message_audit_log
      ADD CONSTRAINT audit_log_action_check
      CHECK (action IN ('message_send', 'message_delete', 'conversation_create', 'conversation_delete', 'member_add', 'member_remove', 'group_rename'));
  END IF;
END $$;

-- RLS (conditional)
ALTER TABLE public.message_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'message_audit_log' AND policyname = 'audit_select'
  ) THEN
    CREATE POLICY "audit_select" ON public.message_audit_log FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'message_audit_log' AND policyname = 'audit_insert'
  ) THEN
    CREATE POLICY "audit_insert" ON public.message_audit_log FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Website cleanup — migrate conversation_reads if it exists
--    (This table was created by website-only phase_h1. It does NOT exist on the
--     live server. This block is a no-op on live.)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Only run if conversation_reads exists (website-only table)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'conversation_reads'
  ) THEN
    -- Migrate read cursors into conversation_member_state
    INSERT INTO public.conversation_member_state (conversation_id, user_id, workspace_id, last_read_at, is_muted, is_archived)
    SELECT
      cr.conversation_id,
      cr.user_id,
      COALESCE(c.workspace_id, '00000000-0000-0000-0000-000000000000'),
      cr.last_read_at,
      COALESCE(
        (SELECT cm.is_muted FROM public.conversation_members cm WHERE cm.conversation_id = cr.conversation_id AND cm.user_id = cr.user_id),
        false
      ),
      COALESCE(
        (SELECT cm.is_archived FROM public.conversation_members cm WHERE cm.conversation_id = cr.conversation_id AND cm.user_id = cr.user_id),
        false
      )
    FROM public.conversation_reads cr
    LEFT JOIN public.conversations c ON c.id = cr.conversation_id
    ON CONFLICT (conversation_id, user_id) DO UPDATE
      SET last_read_at = EXCLUDED.last_read_at,
          is_muted     = EXCLUDED.is_muted,
          is_archived  = EXCLUDED.is_archived;

    RAISE NOTICE 'Migrated conversation_reads → conversation_member_state';
  ELSE
    RAISE NOTICE 'conversation_reads does not exist — skipping migration (expected on live server)';
  END IF;
END $$;

-- Seed conversation_member_state for members that have mute/archive but no read cursor
-- (Only if is_muted column exists on conversation_members — website-only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conversation_members' AND column_name = 'is_muted'
  ) THEN
    INSERT INTO public.conversation_member_state (conversation_id, user_id, workspace_id, is_muted, is_archived)
    SELECT
      cm.conversation_id,
      cm.user_id,
      COALESCE(cm.workspace_id, c.workspace_id, '00000000-0000-0000-0000-000000000000'),
      COALESCE(cm.is_muted, false),
      COALESCE(cm.is_archived, false)
    FROM public.conversation_members cm
    LEFT JOIN public.conversations c ON c.id = cm.conversation_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.conversation_member_state cms
      WHERE cms.conversation_id = cm.conversation_id AND cms.user_id = cm.user_id
    );

    RAISE NOTICE 'Seeded conversation_member_state from conversation_members mute/archive';
  ELSE
    RAISE NOTICE 'conversation_members.is_muted does not exist — skipping mute/archive seed (expected on live server)';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Website cleanup — drop obsolete website-only artifacts (IF EXISTS)
--    All conditional — safe no-ops on the live server.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop website-only table
DROP TABLE IF EXISTS public.conversation_reads;

-- Drop website-only columns from conversation_members
ALTER TABLE public.conversation_members
  DROP COLUMN IF EXISTS is_muted,
  DROP COLUMN IF EXISTS is_archived;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Indexes on existing live tables (IF NOT EXISTS — safe)
-- ═══════════════════════════════════════════════════════════════════════════════

-- conversation_member_state indexes (may already exist on live)
CREATE INDEX IF NOT EXISTS idx_cms_user ON public.conversation_member_state(user_id);
CREATE INDEX IF NOT EXISTS idx_cms_workspace ON public.conversation_member_state(workspace_id);

-- message_links indexes (may already exist on live)
CREATE INDEX IF NOT EXISTS idx_message_links_message ON public.message_links(message_id);
CREATE INDEX IF NOT EXISTS idx_message_links_entity ON public.message_links(entity_type, entity_id);

-- message_links constraint (conditional — may already exist on live)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'message_links_entity_type_check'
  ) THEN
    ALTER TABLE public.message_links
      ADD CONSTRAINT message_links_entity_type_check
      CHECK (entity_type IN ('lead', 'job', 'invoice', 'quote', 'asset'));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. Done
-- ═══════════════════════════════════════════════════════════════════════════════

COMMIT;

-- End of live-safe patch.
-- This file is idempotent. Safe to run multiple times.
-- messages remains on realtime from phase_h1. No realtime changes needed.
