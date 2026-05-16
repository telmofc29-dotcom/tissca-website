-- phase_h5_tisschat_backend_lock.sql
-- TissChat Phase 6 — Backend Contract Lock
--
-- New tables:
--   user_devices — device registration for push notifications (APNs/FCM/Web)
--
-- Contract tightening:
--   conversation_members.role CHECK constraint
--   messages.message_type expanded for full structured message parity
--
-- Depends on: phase_h1, phase_h2, phase_h3, phase_h4

-- ─── 1. User Devices ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_devices (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL,
  platform      text        NOT NULL,          -- 'ios' | 'android' | 'web'
  device_token  text        NOT NULL,          -- APNs/FCM/Web push token
  device_name   text,                          -- human-readable label (optional)
  is_active     boolean     NOT NULL DEFAULT true,
  last_used_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_token)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user
  ON user_devices (user_id);

CREATE INDEX IF NOT EXISTS idx_user_devices_active
  ON user_devices (user_id, is_active) WHERE is_active = true;

-- Platform CHECK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_devices_platform_check'
  ) THEN
    ALTER TABLE user_devices
      ADD CONSTRAINT user_devices_platform_check
      CHECK (platform IN ('ios', 'android', 'web'));
  END IF;
END $$;

-- RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Users can see their own devices
CREATE POLICY "devices_select_own"
  ON user_devices FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own devices
CREATE POLICY "devices_insert_own"
  ON user_devices FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own devices
CREATE POLICY "devices_update_own"
  ON user_devices FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own devices
CREATE POLICY "devices_delete_own"
  ON user_devices FOR DELETE
  USING (user_id = auth.uid());

-- ─── 2. Expand message_type for full structured parity ─────────────────────
-- Android/iOS support: text, image, document, card, lead, job, quote, invoice, asset
-- Current constraint only allows: text, image, document, card, lead, job

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_type_check
  CHECK (message_type IN ('text', 'image', 'document', 'card', 'lead', 'job', 'quote', 'invoice', 'asset'));

-- ─── 3. Lock conversation_members.role values ──────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversation_members_role_check'
  ) THEN
    ALTER TABLE conversation_members
      ADD CONSTRAINT conversation_members_role_check
      CHECK (role IN ('admin', 'member'));
  END IF;
END $$;

-- ─── 4. Lock delivery_status values (re-assert) ───────────────────────────
-- Already exists from phase_h1, but re-assert to be explicit in the lock file

-- No change needed — existing constraint covers:
-- CHECK (delivery_status IN ('failed', 'saved', 'sending', 'sent', 'delivered', 'read'))
