-- ═══════════════════════════════════════════════════════════
-- TISSCA Email Tracking + Unsubscribe Tables — Additive Migration
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New)
-- ═══════════════════════════════════════════════════════════

-- ── 1. unsubscribe_tokens ──
-- One-time-use tokens for unsubscribe links in emails.
CREATE TABLE IF NOT EXISTS unsubscribe_tokens (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_unsub_token ON unsubscribe_tokens(token);
CREATE INDEX IF NOT EXISTS idx_unsub_user ON unsubscribe_tokens(user_id);

ALTER TABLE unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - unsubscribe_tokens"
  ON unsubscribe_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- ── 2. email_opens ──
-- Tracks when emails are opened via tracking pixel.
CREATE TABLE IF NOT EXISTS email_opens (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id      UUID NOT NULL,              -- references email_history.id
  opened_at     TIMESTAMPTZ DEFAULT NOW(),
  ip_address    TEXT,
  user_agent    TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_opens_email ON email_opens(email_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_at ON email_opens(opened_at);

ALTER TABLE email_opens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - email_opens"
  ON email_opens FOR ALL
  USING (auth.role() = 'service_role');

-- ── 3. email_clicks ──
-- Tracks link clicks in emails.
CREATE TABLE IF NOT EXISTS email_clicks (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id      UUID NOT NULL,              -- references email_history.id
  url           TEXT NOT NULL,
  clicked_at    TIMESTAMPTZ DEFAULT NOW(),
  ip_address    TEXT,
  user_agent    TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_clicks_email ON email_clicks(email_id);
CREATE INDEX IF NOT EXISTS idx_email_clicks_at ON email_clicks(clicked_at);

ALTER TABLE email_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - email_clicks"
  ON email_clicks FOR ALL
  USING (auth.role() = 'service_role');

-- ── 4. email_system_settings ──
-- Global admin toggles for the email system.
CREATE TABLE IF NOT EXISTS email_system_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - email_system_settings"
  ON email_system_settings FOR ALL
  USING (auth.role() = 'service_role');

-- Seed defaults
INSERT INTO email_system_settings (key, value)
VALUES
  ('tracking_enabled', 'true'),
  ('unsubscribe_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
