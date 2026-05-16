-- ═══════════════════════════════════════════════════════════
-- TISSCA Email Intelligence Tables
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New)
-- ═══════════════════════════════════════════════════════════

-- ── email_queue ──
-- Pending emails waiting to be sent. The scheduler populates this;
-- the sender drains it.
CREATE TABLE IF NOT EXISTS email_queue (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id    TEXT,                     -- analytics visitor_id (nullable for system emails)
  email         TEXT NOT NULL,            -- recipient email address
  trigger_type  TEXT NOT NULL,            -- high_intent_upgrade | activation_needed | feature_discovery | stuck_user | revenue_ready
  template_key  TEXT NOT NULL,            -- upgrade_push | activation | feature_discovery | stuck_help | revenue_push
  subject       TEXT NOT NULL,
  context       JSONB DEFAULT '{}'::JSONB, -- dynamic data for template rendering (signals, score, features, etc.)
  priority      INT DEFAULT 0,           -- higher = more important (high_intent_upgrade = 10)
  status        TEXT DEFAULT 'pending',   -- pending | processing | sent | failed | cancelled
  error         TEXT,                     -- error message if failed
  scheduled_at  TIMESTAMPTZ DEFAULT NOW(), -- when the email should be sent (allows delay)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  sent_at       TIMESTAMPTZ,
  attempts      INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_email ON email_queue(email);
CREATE INDEX IF NOT EXISTS idx_email_queue_trigger ON email_queue(trigger_type);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_at);

-- ── email_history ──
-- Permanent log of all sent emails. Used for dedup + rate-limiting + audit.
CREATE TABLE IF NOT EXISTS email_history (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_id      UUID REFERENCES email_queue(id) ON DELETE SET NULL,
  visitor_id    TEXT,
  email         TEXT NOT NULL,
  trigger_type  TEXT NOT NULL,
  template_key  TEXT NOT NULL,
  subject       TEXT NOT NULL,
  context       JSONB DEFAULT '{}'::JSONB,
  status        TEXT NOT NULL,            -- sent | failed
  error         TEXT,
  provider_id   TEXT,                     -- Resend message ID for tracking
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_history_email ON email_history(email);
CREATE INDEX IF NOT EXISTS idx_email_history_trigger ON email_history(trigger_type);
CREATE INDEX IF NOT EXISTS idx_email_history_sent ON email_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_history_visitor ON email_history(visitor_id);

-- ── RLS ──
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;

-- Service-role only (no anon/authenticated access)
CREATE POLICY "Service role only - email_queue"
  ON email_queue FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role only - email_history"
  ON email_history FOR ALL
  USING (auth.role() = 'service_role');
