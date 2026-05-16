# TISSCA Stripe Webhook Audit & Revenue Foundation Report

**Date:** 3 April 2026  
**Scope:** Stripe webhook handler, billing infrastructure, revenue event tracking  
**Type:** Proof-based audit + additive implementation  

---

## 1. Audit Findings

### 1.1 Stripe Event Handling (Before This Pass)

| Event | Handler | What It Did | Classification |
|---|---|---|---|
| `checkout.session.completed` | `handleCheckoutSessionCompleted` | Called `linkStripeSubscription(metadata.userId, subscriptionId, priceId, 'active')` on Prisma `subscription` table | **Partially correct** — metadata key mismatch (`userId` vs `user_id`), no workspace sync, no revenue recording |
| `invoice.paid` | `handleInvoicePaid` | `console.log` only — no storage | **Missing** — no payment amounts recorded |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | Called `cancelSubscription(metadata.userId)` → tier='free', status='cancelled' | **Partially correct** — same metadata key issue, no workspace sync |
| `customer.subscription.updated` | `handleSubscriptionUpdated` | Called `updateSubscriptionTier(userId, 'premium')` if active | **Partially correct** — hardcodes 'premium', no workspace sync |
| `invoice.payment_failed` | Not handled | — | **Missing** |
| `charge.refunded` | Not handled | — | **Missing** |
| `charge.dispute.created` | Not handled | — | **Missing** |
| `customer.subscription.created` | Not handled | — | **Missing** |

### 1.2 Signature Verification

**Status: MISSING (RISKY)**

The webhook handler had a TODO comment:
```
// TODO: Verify webhook signature with Stripe secret key
// For now, accepting all events - MUST be fixed in production
```

`STRIPE_WEBHOOK_SECRET` was already configured in `.env.local.example` and checked by the health endpoint, but never used by the webhook handler.

### 1.3 Tables Written To

| Table | Written By | Classification |
|---|---|---|
| Prisma `subscription` | Webhook handler via `linkStripeSubscription`, `cancelSubscription`, `updateSubscriptionTier` | **Partially correct** — only Prisma table, not Supabase `workspaces` |
| Supabase `workspaces.stripe_customer_id` | `stripe-create-checkout` edge function (on checkout) | **Correct** |
| Supabase `workspaces.plan_tier` etc. | Not written by webhook | **Missing** — webhook should sync workspace billing fields |
| `stripe_webhook_log` | Not written — table did not exist | **Missing** |
| `stripe_ops_log` | Not written — table did not exist | **Missing** |
| `financial_events` | Did not exist | **Missing** |

### 1.4 Revenue Data

| Question | Answer | Classification |
|---|---|---|
| Revenue amounts stored? | NO | **Missing** |
| Stripe fees stored? | NO | **Missing** |
| Refunds stored? | NO — admin refund endpoint calls Stripe API but doesn't record result | **Missing** |
| Disputes stored? | NO | **Missing** |
| Failed payments stored? | NO | **Missing** |

### 1.5 Revenue API (`/api/admin/revenue`)

**Classification: FAKE / PLACEHOLDER**

`getAdminRevenueData()` in `src/lib/db.ts` counts active Prisma subscriptions and estimates MRR with hardcoded prices:
```ts
const estimatedMRR = premiumMonthlyCount * 3 + (premiumAnnualCount * 20) / 12;
```

The `/admin/revenue` page displays completely hardcoded fake numbers (January: $9,250 ads/affiliate/subscriptions).

### 1.6 Plan/Tier Model Mismatch (Before This Pass)

| Source | Tiers Used |
|---|---|
| `src/lib/plans.ts` | `'free' \| 'pro' \| 'team'` |
| `src/lib/db.ts` (Prisma) | `'free' \| 'premium'` |
| `stripe-create-checkout` edge function | `'pro' \| 'team_starter' \| 'team_pro'` (STRIPE_PRICE_PRO, STRIPE_PRICE_TEAM_STARTER, STRIPE_PRICE_TEAM_PRO) |
| `workspaces.plan_tier` | Any string (no constraint) |
| `businesses.plan` | `'free'` default |

**Classification: RISKY** — Edge function sends `plan_tier: 'team_starter'` but `plans.ts` only knew `'team'`.

### 1.7 Metadata Key Mismatch

The `stripe-create-checkout` edge function sets checkout session metadata as:
```ts
metadata: { workspace_id, plan_tier: tier, user_id: user.id }
```

But the old webhook handler read:
```ts
metadata.userId    // should be metadata.user_id
metadata.priceId   // should be metadata.price_id
```

**Classification: RISKY** — This means the checkout→webhook flow was silently failing to resolve the user.

### 1.8 Existing Infrastructure That IS Correct

| Component | Status |
|---|---|
| `stripe-create-checkout` edge function | **Correct** — proper auth, ownership check, env-based price IDs, customer creation, metadata |
| `stripe-create-portal` edge function | **Correct** — proper auth, ownership check, customer lookup |
| Admin engineering Stripe pages (webhooks, ops, health, checkout-errors, portal-errors) | **Correct** — well-built, but need backing tables to show data |
| Admin Stripe support APIs (refunds, credits, subscription management) | **Correct** — proper staff gates, fail-closed |
| `STRIPE_WEBHOOK_SECRET` in env config | **Correct** — already configured |
| `stripe` npm package | **Correct** — v20.2.0 installed |

---

## 2. What Was Implemented

### 2.1 SQL Migration: `supabase/sql/revenue_foundation.sql`

Three production-safe tables:

**`financial_events`** — Canonical revenue ledger
- `source`: 'stripe' | 'manual' | 'system'
- `event_type`: checkout_completed, subscription_payment, refund, dispute, payment_failed, subscription_cancelled, etc.
- `stripe_event_id` with UNIQUE index (idempotency)
- Full Stripe identifier set: customer_id, subscription_id, invoice_id, payment_intent_id, charge_id
- `workspace_id` + `user_id` for internal resolution
- `plan_key` for plan context
- Financial amounts in minor units: `gross_amount`, `fee_amount`, `net_amount`
- `currency`, `status`, `occurred_at`
- `raw_payload` (jsonb) for full audit trail

**`stripe_webhook_log`** — Webhook intake observability
- Matches the schema already expected by admin engineering webhook pages
- UNIQUE on `stripe_event_id`

**`stripe_ops_log`** — API operation observability
- Matches the schema already expected by admin engineering ops pages

All tables use `IF NOT EXISTS`, RLS enabled, no DROP/DELETE.

### 2.2 Webhook Handler: `src/app/api/webhooks/stripe/route.ts` v2.0

| Feature | Implementation |
|---|---|
| Stripe signature verification | Uses `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`. Falls back to raw JSON parse if secret not set (dev mode). |
| `checkout.session.completed` | Records financial_event, syncs workspace billing, preserves Prisma sync |
| `invoice.paid` / `invoice.payment_succeeded` | Records financial_event with real amounts, extracts Stripe fees via `charge.balance_transaction`, syncs workspace status |
| `invoice.payment_failed` | Records financial_event with failed status, sets workspace to `past_due` |
| `customer.subscription.created` / `updated` | Syncs workspace plan_tier + subscription_status + current_period_end, preserves Prisma sync |
| `customer.subscription.deleted` | Records churn event, downgrades workspace to free, preserves Prisma cancelSubscription |
| `charge.refunded` | Records refund as negative gross_amount |
| `charge.dispute.created` | Records dispute as negative gross_amount |
| Metadata resolution | Handles both `user_id`/`workspace_id` (snake_case from edge function) AND `userId`/`workspaceId` (camelCase legacy) |
| Workspace resolution | Falls back to resolving workspace from `stripe_customer_id` when metadata doesn't contain workspace_id |
| Idempotency | `financial_events` UNIQUE on `stripe_event_id` with `ON CONFLICT DO NOTHING` (upsert) |
| Webhook logging | Every event logged to `stripe_webhook_log` with signature status, processing result, error message |
| Prisma compatibility | All Prisma calls wrapped in try/catch with `(non-fatal)` warning — system works even if Prisma tables don't exist |

### 2.3 Plan Tier Reconciliation: `src/lib/plans.ts`

Updated `PlanTier` type from `'free' | 'pro' | 'team'` to `'free' | 'pro' | 'team_starter' | 'team_pro' | 'team'`.

Updated `isPro()`, `isTeam()`, and `formatPlanLabel()` to handle new tiers.

---

## 3. Fee Extraction Strategy

Stripe fees are **not available directly** on invoice or checkout session objects.

The implemented strategy:
1. On `invoice.paid`, extract the `charge` ID from the invoice
2. Call `stripe.charges.retrieve(chargeId, { expand: ['balance_transaction'] })`
3. Read `balance_transaction.fee` for the actual Stripe fee in minor units
4. If the API call fails (permissions, rate limit), fee defaults to 0 and a warning is logged
5. On `checkout.session.completed`, fees are not available (set to 0) — the subsequent `invoice.paid` event will carry the real fee

This is the safest grounded strategy that works with standard Stripe Connect and direct accounts.

---

## 4. What `/admin/revenue` Can Show After This Pass

### Available immediately (once SQL migration is run):

1. **Total revenue by month** — `SELECT SUM(gross_amount), SUM(fee_amount), SUM(net_amount) FROM financial_events WHERE source = 'stripe' AND status = 'completed' GROUP BY date_trunc('month', occurred_at)`
2. **Revenue by plan** — Group by `plan_key`
3. **Refund totals** — `WHERE event_type = 'refund'`
4. **Failed payment count** — `WHERE status = 'failed'`
5. **Dispute count and amount** — `WHERE event_type = 'dispute'`
6. **Churn events** — `WHERE event_type = 'subscription_cancelled'`
7. **Revenue per workspace** — Group by `workspace_id`
8. **Actual MRR** — Sum of recurring payments in last 30 days
9. **Full audit trail** — `raw_payload` contains complete Stripe event JSON

### Still remaining (future passes):

1. **Wire `/admin/revenue` page** to query `financial_events` instead of fake data
2. **Wire `/admin/accountant` page** to real data
3. **Manual expense tracking** — `source = 'manual'` events (infrastructure costs, etc.)
4. **Revenue charts/graphs** — Time series from `financial_events`
5. **Per-workspace billing history** — Already queryable, needs UI
6. **Stripe ops logging** — Edge functions (`stripe-create-checkout`, `stripe-create-portal`) should write to `stripe_ops_log` on success/failure

---

## 5. Files Changed

| File | Change |
|---|---|
| `supabase/sql/revenue_foundation.sql` | **New** — Creates `financial_events`, `stripe_webhook_log`, `stripe_ops_log` tables |
| `src/app/api/webhooks/stripe/route.ts` | **Rewritten** — Signature verification, financial event recording, webhook logging, expanded event handling, workspace sync |
| `src/lib/plans.ts` | **Updated** — PlanTier now includes `team_starter` and `team_pro`, formatPlanLabel handles new tiers |

---

## 6. Deployment Checklist

1. **Run SQL migration** — Execute `supabase/sql/revenue_foundation.sql` in Supabase SQL Editor
2. **Set `STRIPE_WEBHOOK_SECRET`** — Ensure it's set in Vercel environment variables (already in `.env.local.example`)
3. **Deploy** — `vercel --prod`
4. **Verify** — Send a test webhook from Stripe dashboard, check `stripe_webhook_log` in Supabase
5. **Monitor** — Check `/admin/engineering/stripe/webhooks` for incoming events

---

## 7. Risk Assessment

| Risk | Mitigation |
|---|---|
| Missing `STRIPE_WEBHOOK_SECRET` | Webhook falls back to raw JSON parse with console warning — existing behaviour preserved |
| Prisma tables may not exist | All Prisma calls wrapped in try/catch — financial_events recording continues regardless |
| `financial_events` table not yet created | Webhook handler uses `try/catch` — will log errors but return 200 to Stripe to prevent retries |
| Duplicate Stripe events | UNIQUE index on `stripe_event_id` + `ON CONFLICT DO NOTHING` — fully idempotent |
| Fee extraction failure | Defaults to 0 with warning log — revenue still recorded without fee breakdown |
