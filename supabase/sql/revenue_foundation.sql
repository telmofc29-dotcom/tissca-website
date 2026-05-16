-- ═══════════════════════════════════════════════════════════════════════
-- TISSCA Revenue Foundation: Financial Events + Observability Tables
--
-- PURPOSE:
-- 1. financial_events — Canonical ledger for all money events
--    (Stripe payments, refunds, disputes, manual adjustments)
-- 2. stripe_webhook_log — Raw webhook intake log (observability)
-- 3. stripe_ops_log — Stripe API operation log (observability)
--
-- SAFETY:
-- - Production-safe, rerunnable (IF NOT EXISTS throughout)
-- - No DROP, no ALTER COLUMN, no DELETE, no TRUNCATE
-- - Additive only
--
-- RUN IN: Supabase SQL Editor
-- DEPENDS ON: workspaces table, auth.users
-- ═══════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────
-- 1. financial_events — Canonical revenue ledger
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.financial_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source classification
  source          text NOT NULL CHECK (source IN ('stripe', 'manual', 'system')),
  event_type      text NOT NULL,
  -- event_type values:
  --   stripe: checkout_completed, subscription_payment, subscription_renewal,
  --           refund, dispute, payment_failed
  --   manual: expense, adjustment, credit
  --   system: plan_change, churn

  -- Stripe identifiers (null for manual/system events)
  stripe_event_id          text,  -- Stripe event ID for idempotency
  stripe_customer_id       text,
  stripe_subscription_id   text,
  stripe_invoice_id        text,
  stripe_payment_intent_id text,
  stripe_charge_id         text,

  -- Internal identifiers
  workspace_id    uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Plan context
  plan_key        text,  -- 'free', 'pro', 'team_starter', 'team_pro'

  -- Financial data (all in minor units — pence/cents — for precision)
  currency        text    NOT NULL DEFAULT 'gbp',
  gross_amount    integer NOT NULL DEFAULT 0,  -- total charged (positive = revenue, negative = refund/credit)
  fee_amount      integer NOT NULL DEFAULT 0,  -- platform/Stripe fees (always >= 0)
  net_amount      integer NOT NULL DEFAULT 0,  -- gross_amount - fee_amount

  -- Status
  status          text NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('completed', 'pending', 'failed', 'refunded', 'disputed')),

  -- Timestamps
  occurred_at     timestamptz NOT NULL DEFAULT now(),  -- when the event actually happened in Stripe
  created_at      timestamptz NOT NULL DEFAULT now(),  -- when we recorded it

  -- Audit
  raw_payload     jsonb,       -- full Stripe event JSON for audit trail
  description     text         -- human-readable note
);

-- Idempotency: one record per Stripe event
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_events_stripe_event_id
  ON public.financial_events(stripe_event_id) WHERE stripe_event_id IS NOT NULL;

-- Query patterns
CREATE INDEX IF NOT EXISTS idx_financial_events_workspace_id
  ON public.financial_events(workspace_id);

CREATE INDEX IF NOT EXISTS idx_financial_events_occurred_at
  ON public.financial_events(occurred_at);

CREATE INDEX IF NOT EXISTS idx_financial_events_event_type
  ON public.financial_events(event_type);

CREATE INDEX IF NOT EXISTS idx_financial_events_source
  ON public.financial_events(source);

CREATE INDEX IF NOT EXISTS idx_financial_events_status
  ON public.financial_events(status);

CREATE INDEX IF NOT EXISTS idx_financial_events_stripe_customer_id
  ON public.financial_events(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- RLS
ALTER TABLE public.financial_events ENABLE ROW LEVEL SECURITY;

-- Only service role / staff should read financial_events (no user-facing RLS policy)
-- Staff access is via API routes that use service role client


-- ───────────────────────────────────────────────────────────────────────
-- 2. stripe_webhook_log — Raw webhook intake log
--    (Referenced by admin/engineering/stripe/webhooks pages)
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stripe_webhook_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at         timestamptz NOT NULL DEFAULT now(),
  stripe_event_id     text NOT NULL,
  event_type          text NOT NULL,
  livemode            boolean,
  api_version         text,
  stripe_created      timestamptz,
  stripe_request_id   text,
  idempotency_key     text,
  signature_valid     boolean,
  http_status         integer,
  processed           boolean NOT NULL DEFAULT false,
  processed_at        timestamptz,
  error_message       text,
  raw_payload         jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_webhook_log_event_id
  ON public.stripe_webhook_log(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_log_received_at
  ON public.stripe_webhook_log(received_at);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_log_event_type
  ON public.stripe_webhook_log(event_type);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_log_processed
  ON public.stripe_webhook_log(processed);

ALTER TABLE public.stripe_webhook_log ENABLE ROW LEVEL SECURITY;


-- ───────────────────────────────────────────────────────────────────────
-- 3. stripe_ops_log — Stripe API operation log
--    (Referenced by admin/engineering/stripe/ops pages)
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stripe_ops_log (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               timestamptz NOT NULL DEFAULT now(),
  kind                     text NOT NULL,     -- 'checkout', 'portal', 'refund', 'credit', 'subscription'
  route                    text,              -- API route that originated the op
  workspace_id             uuid,
  user_id                  uuid,
  stripe_request_id        text,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  stripe_payment_intent_id text,
  success                  boolean NOT NULL DEFAULT true,
  error_code               text,
  error_message            text,
  meta                     jsonb
);

CREATE INDEX IF NOT EXISTS idx_stripe_ops_log_created_at
  ON public.stripe_ops_log(created_at);

CREATE INDEX IF NOT EXISTS idx_stripe_ops_log_kind
  ON public.stripe_ops_log(kind);

CREATE INDEX IF NOT EXISTS idx_stripe_ops_log_workspace_id
  ON public.stripe_ops_log(workspace_id);

CREATE INDEX IF NOT EXISTS idx_stripe_ops_log_success
  ON public.stripe_ops_log(success);

ALTER TABLE public.stripe_ops_log ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICATION (optional — run after migration to confirm)
-- ═══════════════════════════════════════════════════════════════════════
-- SELECT table_name, column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('financial_events', 'stripe_webhook_log', 'stripe_ops_log')
-- ORDER BY table_name, ordinal_position;
--
-- Expected: ~20 columns for financial_events,
--           ~15 columns for stripe_webhook_log,
--           ~14 columns for stripe_ops_log
-- ═══════════════════════════════════════════════════════════════════════
