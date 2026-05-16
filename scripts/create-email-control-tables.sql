-- ═══════════════════════════════════════════════════════════
-- TISSCA Email Control System — Additive Migration
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New)
-- ═══════════════════════════════════════════════════════════

-- ── 1. user_email_preferences ──
-- Per-user email communication preferences.
-- One row per user. Created with defaults on first settings page load.
CREATE TABLE IF NOT EXISTS user_email_preferences (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL UNIQUE,          -- auth.users id
  product_updates   BOOLEAN DEFAULT TRUE,
  feature_emails    BOOLEAN DEFAULT TRUE,
  upgrade_emails    BOOLEAN DEFAULT TRUE,
  billing_emails    BOOLEAN DEFAULT TRUE,
  reminder_emails   BOOLEAN DEFAULT TRUE,
  support_followup  BOOLEAN DEFAULT TRUE,
  weekly_summary    BOOLEAN DEFAULT TRUE,
  unsubscribed_all  BOOLEAN DEFAULT FALSE,         -- master kill switch for non-essential
  frequency         TEXT DEFAULT 'immediate',       -- immediate | daily | weekly
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uep_user ON user_email_preferences(user_id);

ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own preferences
CREATE POLICY "Users manage own email prefs"
  ON user_email_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can read all (for trigger engine)
CREATE POLICY "Service role full access - email prefs"
  ON user_email_preferences FOR ALL
  USING (auth.role() = 'service_role');

-- ── 2. email_campaign_settings ──
-- Admin-controlled per-campaign toggles and configuration.
CREATE TABLE IF NOT EXISTS email_campaign_settings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_type    TEXT NOT NULL UNIQUE,      -- matches EmailTriggerType
  enabled         BOOLEAN DEFAULT TRUE,
  priority        INT DEFAULT 5,
  min_gap_hours   INT DEFAULT 72,            -- minimum hours between same trigger
  max_per_day     INT DEFAULT 1,             -- max emails per 24h per recipient
  description     TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_campaign_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - campaign settings"
  ON email_campaign_settings FOR ALL
  USING (auth.role() = 'service_role');

-- Seed default campaign settings
INSERT INTO email_campaign_settings (trigger_type, enabled, priority, min_gap_hours, max_per_day, description)
VALUES
  ('high_intent_upgrade', TRUE, 10, 72, 1, 'Trigger when user shows strong upgrade intent (score ≥ 50 + billing signals)'),
  ('revenue_ready', TRUE, 8, 72, 1, 'Trigger for members with active workflow usage + billing interest'),
  ('activation_needed', TRUE, 5, 168, 1, 'Trigger for new members who have not explored workspace features'),
  ('feature_discovery', TRUE, 3, 168, 1, 'Trigger for members using few features — suggest more'),
  ('stuck_user', TRUE, 1, 168, 1, 'Trigger for members showing signs of being stuck or inactive')
ON CONFLICT (trigger_type) DO NOTHING;

-- ── 3. email_templates ──
-- Admin-editable email templates. Overrides hardcoded defaults when present.
CREATE TABLE IF NOT EXISTS email_templates (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key    TEXT NOT NULL UNIQUE,      -- matches EmailTemplateKey
  enabled         BOOLEAN DEFAULT TRUE,
  subject         TEXT NOT NULL,
  preview_text    TEXT DEFAULT '',
  html_body       TEXT NOT NULL,
  text_body       TEXT NOT NULL,
  updated_by      UUID,                      -- admin user who last edited
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only - email templates"
  ON email_templates FOR ALL
  USING (auth.role() = 'service_role');
