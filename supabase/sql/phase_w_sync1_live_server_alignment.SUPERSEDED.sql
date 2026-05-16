-- phase_w_sync1_live_server_alignment.sql
-- WEBSITE PHASE W-SYNC-1 — Live Server Contract Alignment
--
-- This migration aligns the Website schema with the LIVE TISSCA server contract.
--
-- CHANGES:
--   1. Create conversation_member_state (replaces conversation_reads for read/delivered/mute/archive)
--   2. Add missing fields to conversations (type, created_by, last_message_id, last_message_at, dm_key)
--   3. Add workspace_id + id to conversation_members; remove is_muted/is_archived
--   4. Create message_links (normalised entity references)
--   5. Create message_audit_log (audit trail for chat actions)
--   6. Migrate data from conversation_reads → conversation_member_state
--   7. Drop conversation_reads
--
-- DEPENDS ON: phase_h1, h2, h3, h4, h5

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. conversation_member_state
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.conversation_member_state (
  conversation_id   uuid        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL,
  workspace_id      uuid        NOT NULL,
  last_delivered_message_id uuid,
  last_delivered_at  timestamptz,
  last_read_message_id uuid,
  last_read_at       timestamptz,
  is_muted           boolean    NOT NULL DEFAULT false,
  is_archived        boolean    NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cms_user ON public.conversation_member_state(user_id);
CREATE INDEX IF NOT EXISTS idx_cms_workspace ON public.conversation_member_state(workspace_id);

ALTER TABLE public.conversation_member_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms_select_own" ON public.conversation_member_state
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cms_insert_own" ON public.conversation_member_state
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "cms_update_own" ON public.conversation_member_state
  FOR UPDATE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. conversations — add missing live-server fields
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS type          text NOT NULL DEFAULT 'dm',
  ADD COLUMN IF NOT EXISTS created_by    uuid,
  ADD COLUMN IF NOT EXISTS last_message_id uuid,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS dm_key        text;

-- Backfill type from is_group
UPDATE public.conversations SET type = 'group' WHERE is_group = true AND type = 'dm';

-- Create unique index on dm_key for DM dedup (nulls excluded)
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_dm_key
  ON public.conversations(workspace_id, dm_key) WHERE dm_key IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. conversation_members — add workspace_id + id; remove mute/archive
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS id           uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- Backfill workspace_id from conversations table
UPDATE public.conversation_members cm
  SET workspace_id = c.workspace_id
  FROM public.conversations c
  WHERE cm.conversation_id = c.id AND cm.workspace_id IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Migrate conversation_reads → conversation_member_state
-- ═══════════════════════════════════════════════════════════════════════════════

-- Migrate existing read cursors
INSERT INTO public.conversation_member_state (conversation_id, user_id, workspace_id, last_read_at, is_muted, is_archived)
SELECT
  cr.conversation_id,
  cr.user_id,
  COALESCE(c.workspace_id, '00000000-0000-0000-0000-000000000000'),
  cr.last_read_at,
  COALESCE(cm.is_muted, false),
  COALESCE(cm.is_archived, false)
FROM public.conversation_reads cr
LEFT JOIN public.conversations c ON c.id = cr.conversation_id
LEFT JOIN public.conversation_members cm ON cm.conversation_id = cr.conversation_id AND cm.user_id = cr.user_id
ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET last_read_at = EXCLUDED.last_read_at,
      is_muted = EXCLUDED.is_muted,
      is_archived = EXCLUDED.is_archived;

-- Also seed state for members with mute/archive but no read cursor
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Drop conversation_reads (replaced by conversation_member_state)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.conversation_reads;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Remove is_muted/is_archived from conversation_members (now on member_state)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.conversation_members
  DROP COLUMN IF EXISTS is_muted,
  DROP COLUMN IF EXISTS is_archived;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. message_links — normalised entity references
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.message_links (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL,
  message_id    uuid        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  entity_type   text        NOT NULL,
  entity_id     uuid        NOT NULL,
  label         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_links_message ON public.message_links(message_id);
CREATE INDEX IF NOT EXISTS idx_message_links_entity ON public.message_links(entity_type, entity_id);

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

ALTER TABLE public.message_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "links_select" ON public.message_links FOR SELECT USING (true);
CREATE POLICY "links_insert" ON public.message_links FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. message_audit_log — audit trail for chat actions
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.message_audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL,
  actor_id      uuid        NOT NULL,
  action        text        NOT NULL,
  entity_type   text        NOT NULL DEFAULT 'message',
  entity_id     uuid,
  conversation_id uuid,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_workspace ON public.message_audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_conversation ON public.message_audit_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.message_audit_log(actor_id);

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

ALTER TABLE public.message_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select" ON public.message_audit_log FOR SELECT USING (true);
CREATE POLICY "audit_insert" ON public.message_audit_log FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. Realtime — ensure new tables are NOT on realtime (only messages is)
-- ═══════════════════════════════════════════════════════════════════════════════

-- messages already on realtime from phase_h1. No changes needed.
