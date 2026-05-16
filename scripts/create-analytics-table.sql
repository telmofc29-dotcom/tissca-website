-- Additive migration: create analytics_events table for page views and event tracking.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- Run this against your Supabase project via the SQL Editor.

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL DEFAULT 'page_view',
  page_path TEXT NOT NULL,
  referrer TEXT,
  -- Geo fields (populated server-side from request headers / IP enrichment)
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  -- Device / UA fields
  device_type TEXT DEFAULT 'desktop',
  browser TEXT,
  os TEXT,
  -- Session / visitor tracking (best-effort fingerprint)
  visitor_id TEXT,
  session_id TEXT,
  -- CTA / interaction metadata
  event_label TEXT,
  event_value TEXT,
  -- Rich metadata (jsonb for flexible event context)
  metadata JSONB,
  -- Privacy-safe IP hash (never store raw IPs)
  ip_hash TEXT,
  -- Timestamps
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_occurred_at ON analytics_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_page_path ON analytics_events (page_path);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor_id ON analytics_events (visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_country ON analytics_events (country);
CREATE INDEX IF NOT EXISTS idx_analytics_country_code ON analytics_events (country_code);
CREATE INDEX IF NOT EXISTS idx_analytics_city ON analytics_events (city);
CREATE INDEX IF NOT EXISTS idx_analytics_ip_hash ON analytics_events (ip_hash);

-- RLS: only service role can read/write (admin access via API routes)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API routes use service role key)
CREATE POLICY IF NOT EXISTS "Service role full access on analytics_events"
  ON analytics_events
  FOR ALL
  USING (true)
  WITH CHECK (true);
