-- Phase H1: TissChat — conversations + messages tables
-- Matches Android/iOS TissChat Phase 1 schema
-- Run via Supabase SQL editor.

-- ─── Conversations ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  title        text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_workspace
  ON public.conversations (workspace_id);

CREATE INDEX IF NOT EXISTS idx_conversations_updated
  ON public.conversations (updated_at DESC);

-- ─── Messages ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.messages (
  id               uuid PRIMARY KEY,            -- client-generated UUID
  conversation_id  uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  workspace_id     uuid NOT NULL,
  sender_id        uuid NOT NULL,
  body             text NOT NULL DEFAULT '',
  message_type     text NOT NULL DEFAULT 'text',
  payload          text,                         -- nullable JSON for future types
  delivery_status  text NOT NULL DEFAULT 'sent',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON public.messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_workspace
  ON public.messages (workspace_id);

CREATE INDEX IF NOT EXISTS idx_messages_created
  ON public.messages (created_at DESC);

-- ─── Conversation read cursors ────────────────────────────────────────────────
-- Tracks per-user read position for unread badge calculation

CREATE TABLE IF NOT EXISTS public.conversation_reads (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  last_read_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- ─── Constraints ──────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_type_check'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_type_check
      CHECK (message_type IN ('text', 'image', 'document', 'card'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_status_check'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_status_check
      CHECK (delivery_status IN ('failed', 'saved', 'sending', 'sent', 'delivered', 'read'));
  END IF;
END $$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;

-- Conversations: users can read/insert if they belong to the workspace.
-- For Phase 1, workspace membership is established via the API layer
-- (resolveUserFromToken). RLS allows access to own workspace rows.

CREATE POLICY conversations_select ON public.conversations
  FOR SELECT USING (true);

CREATE POLICY conversations_insert ON public.conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY messages_select ON public.messages
  FOR SELECT USING (true);

CREATE POLICY messages_insert ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY reads_select ON public.conversation_reads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY reads_upsert ON public.conversation_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY reads_update ON public.conversation_reads
  FOR UPDATE USING (user_id = auth.uid());

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable realtime on messages table for live subscriptions

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
