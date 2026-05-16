-- Create feedback table for persisting user feedback, cancellation reasons, etc.
-- Run this against your Supabase project via the SQL Editor.

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('help', 'issue', 'suggestion', 'review', 'cancellation')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in-progress', 'done')),
  section TEXT NOT NULL DEFAULT 'other',
  headline TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  user_email TEXT,
  url TEXT,
  device_type TEXT DEFAULT 'desktop',
  user_agent TEXT,
  rating INTEGER,
  cancellation_reasons TEXT[],
  cancellation_context TEXT CHECK (cancellation_context IS NULL OR cancellation_context IN ('subscription_cancel', 'account_delete')),
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for filtering by type (especially cancellation)
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback (type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback (created_at DESC);

-- RLS: only service role can read/write (admin access via API routes)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (API routes use service role key)
CREATE POLICY "Service role full access" ON feedback
  FOR ALL
  USING (true)
  WITH CHECK (true);
