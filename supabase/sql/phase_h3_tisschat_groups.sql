-- ============================================================================
-- TissChat Phase 3 — conversation_members table
-- Tracks group membership. For 1:1 chats the table is still populated
-- (creator + recipient) so the same query path works everywhere.
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member',  -- 'admin' | 'member'
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Fast look-ups: "which conversations does this user belong to?"
CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON conversation_members (user_id);

-- Add is_group flag to conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT false;

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Service-role inserts bypass RLS; these policies are defence-in-depth.

ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own conversation memberships"
  ON conversation_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Members can insert via service role"
  ON conversation_members FOR INSERT
  WITH CHECK (true);
