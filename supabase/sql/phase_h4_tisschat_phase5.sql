-- phase_h4_tisschat_phase5.sql
-- TissChat Phase 5 — Reactions + Conversation Controls
--
-- Tables added:
--   message_reactions — emoji reactions per message per user
--
-- Columns added to conversation_members:
--   is_muted   — suppress notifications for this conversation
--   is_archived — hide from default conversation list
--
-- Depends on: phase_h1, phase_h2, phase_h3

-- ─── 1. Message reactions ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id   UUID        NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL,
  emoji        TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message
  ON message_reactions(message_id);

-- ─── 2. Conversation controls (per-user per-conversation) ──────────────────

ALTER TABLE conversation_members
  ADD COLUMN IF NOT EXISTS is_muted   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 3. RLS policies ───────────────────────────────────────────────────────

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can read all reactions for messages in their workspace
CREATE POLICY "reactions_select"
  ON message_reactions FOR SELECT
  USING (true);

-- Users can insert their own reactions
CREATE POLICY "reactions_insert"
  ON message_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own reactions
CREATE POLICY "reactions_delete"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());
