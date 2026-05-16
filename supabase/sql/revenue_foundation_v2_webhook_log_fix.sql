-- ═══════════════════════════════════════════════════════════════════════
-- Revenue Foundation v2: webhook log index fix
--
-- PURPOSE:
--   Allow multiple rows per stripe_event_id in stripe_webhook_log.
--   Stripe can redeliver the same event. Each delivery attempt should
--   be recorded as a separate row for observability.
--
-- WHAT THIS DOES:
--   1. Drops the UNIQUE index on stripe_webhook_log(stripe_event_id)
--   2. Creates a plain (non-unique) index on the same column
--
-- SAFETY:
--   - Production-safe, rerunnable
--   - No data loss — only changes index constraint
--   - The webhook handler (route.ts v2.1) catches duplicate insert errors
--     gracefully, so this migration is safe to apply before or after
--     deploying the code update.
--
-- RUN IN: Supabase SQL Editor
-- DEPENDS ON: revenue_foundation.sql (stripe_webhook_log table must exist)
-- ═══════════════════════════════════════════════════════════════════════

-- Drop the UNIQUE index
DROP INDEX IF EXISTS idx_stripe_webhook_log_event_id;

-- Replace with a plain index (for query performance, not uniqueness)
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_log_event_id
  ON public.stripe_webhook_log(stripe_event_id);
