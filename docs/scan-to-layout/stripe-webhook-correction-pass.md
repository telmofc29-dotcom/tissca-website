# Stripe Webhook Correction Pass (v2.0 → v2.1)

**Date:** $(date +%Y-%m-%d)
**Scope:** `src/app/api/webhooks/stripe/route.ts` — 8 surgical fixes
**Method:** Proof-based, additive-only, no architecture rewrite

---

## Truth Summary

| # | Bug | Root Cause | Fix Applied |
|---|-----|-----------|-------------|
| 1 | Broken JSON.parse fallback | `JSON.parse()` is synchronous — `.catch?.()` is a no-op | Wrapped in real `try/catch` |
| 2 | Webhook log overwrites redeliveries | `upsert` with `onConflict` replaced previous delivery | Changed to `INSERT`; duplicate errors caught silently. Additive SQL migration drops UNIQUE index. |
| 3 | Refund double-counting | `charge.amount_refunded` is cumulative, not the delta | Extract `charge.refunds.data[0].amount` (latest refund that triggered the event) |
| 4 | Dispute workspace always null | `customerId = typeof chargeId === 'string' ? null : null` — always null | Retrieve charge via Stripe API → get customer → resolve workspace |
| 5 | Plan tier guesses from metadata only | Falls back to `'pro'` if metadata missing | Added `resolvePlanFromPrice()` using `STRIPE_PRICE_*` env vars; price-based resolution preferred over metadata |
| 6 | Prisma 'premium' vs canonical 'pro' undocumented | `updateSubscriptionTier(userId, 'premium')` while workspace gets `'pro'` | Added inline documentation: intentional divergence until Prisma schema is migrated |
| 7 | Checkout + invoice.paid double-count revenue | `checkout.session.completed` recorded `amount_total` AND `invoice.paid` recorded `amount_paid` for same transaction | Checkout is now operational-only (workspace sync + Prisma sync). `invoice.paid` is the sole revenue event. |
| 8 | Supabase write errors silently swallowed | `syncWorkspaceBilling` and `resolveWorkspaceFromCustomer` didn't check `{ error }` | All Supabase writes now destructure and log `error` explicitly |

---

## Files Changed

| File | Change Type |
|------|-------------|
| `src/app/api/webhooks/stripe/route.ts` | 14 surgical edits (v2.0 → v2.1) |
| `supabase/sql/revenue_foundation_v2_webhook_log_fix.sql` | NEW — drops UNIQUE, creates plain index on `stripe_webhook_log(stripe_event_id)` |

---

## Detailed Fix Notes

### Fix 1: JSON.parse Fallback
**Before:** `JSON.parse(rawBody).catch?.(() => ({})) || {}`
**After:** `let parsed: any = {}; try { parsed = JSON.parse(rawBody); } catch { /* invalid JSON */ }`

`JSON.parse` is synchronous and returns a value (or throws). It never returns a Promise, so `.catch` is always `undefined`. The original code silently returned `undefined || {}` which happened to work, but only by accident.

### Fix 2: Webhook Log Delivery Semantics
**Before:** `supabase.from('stripe_webhook_log').upsert({...}, { onConflict: 'stripe_event_id' })`
**After:** `supabase.from('stripe_webhook_log').insert({...})` + duplicate error catch

Stripe can redeliver the same event (retries on 5xx, network timeout, etc.). Each delivery attempt should be a separate row for observability. The matching SQL migration (`revenue_foundation_v2_webhook_log_fix.sql`) drops the UNIQUE constraint and replaces it with a plain index.

The code gracefully handles the case where the migration hasn't been applied yet — duplicate key errors are caught and silently ignored.

### Fix 3: Refund Correctness
**Before:** `const refundedAmount = charge.amount_refunded ?? 0`
**After:** `const latestRefund = charge.refunds?.data?.[0]; const refundedAmount = latestRefund?.amount ?? charge.amount_refunded ?? 0`

`charge.amount_refunded` is the **cumulative** total ever refunded on the charge. If a £100 charge is partially refunded £30 then £20, the second `charge.refunded` event would have `amount_refunded = 50`, recording £50 instead of the actual £20 delta. The fix extracts the latest refund from `charge.refunds.data[0]` (Stripe orders newest-first).

Falls back to `amount_refunded` if `refunds.data` is not expanded (edge case).

### Fix 4: Dispute Workspace Resolution
**Before:** `const customerId = typeof chargeId === 'string' ? null : null` — always evaluates to `null`
**After:** Retrieves the charge via `stripe.charges.retrieve(chargeId)`, extracts `charge.customer`, then resolves workspace via `resolveWorkspaceFromCustomer()`

Disputes now get properly linked to their workspace and user for admin visibility.

### Fix 5: Price-Based Plan Tier Resolution
**Before:** `const planKey = normalizePlanKey(meta.planTier)` — relies solely on subscription metadata
**After:** `const priceId = sub.items?.data?.[0]?.price?.id; const planKey = resolvePlanFromPrice(priceId) || normalizePlanKey(meta.planTier)`

New `resolvePlanFromPrice()` function maps Stripe price IDs to plan tiers using `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM_STARTER`, `STRIPE_PRICE_TEAM_PRO` env vars. Falls back to metadata if env vars aren't set or price doesn't match.

Applied to `handleSubscriptionUpdated` where the subscription object has `items.data`. Not applied to `handleCheckoutCompleted` (which is now operational-only and always has metadata from the edge function).

### Fix 6: Prisma 'premium' Divergence
**Before:** `await updateSubscriptionTier(userId, 'premium')` — no explanation
**After:** Same call, with inline comment explaining the intentional divergence:
> *Prisma subscription model uses 'premium' (legacy); workspace uses 'pro' (canonical). These intentionally diverge until the Prisma schema is migrated.*

### Fix 7: Revenue Event Semantics
**Before:** `handleCheckoutCompleted` recorded a `financial_event` with `grossAmount: session.amount_total`
**After:** That block is removed. Comment explains why:
> *invoice.paid is the canonical money event. Recording amount_total here would double-count revenue because Stripe fires both checkout.session.completed AND invoice.paid for the same transaction.*

`handleCheckoutCompleted` now only does:
- Workspace billing sync (plan_tier, subscription_status, stripe_subscription_id)
- Prisma linkStripeSubscription (legacy)
- Console log

### Fix 8: Supabase Write Error Handling
**Before:** `syncWorkspaceBilling` and `resolveWorkspaceFromCustomer` didn't destructure `{ error }`
**After:** All Supabase operations now check returned error objects:
- `resolveWorkspaceFromCustomer`: `const { data, error } = ...` + `if (error) console.error(...)`
- `syncWorkspaceBilling`: `const { error } = ...` + `if (error) console.error(...)`
- `logWebhook`: `const { error } = ...` + non-duplicate errors logged
- `recordFinancialEvent`: already had error checking (unchanged)

---

## SQL Migration

**File:** `supabase/sql/revenue_foundation_v2_webhook_log_fix.sql`

```sql
DROP INDEX IF EXISTS idx_stripe_webhook_log_event_id;
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_log_event_id
  ON public.stripe_webhook_log(stripe_event_id);
```

**Apply order:** Safe to apply before or after deploying v2.1 code. The code handles both states.

---

## What Was NOT Changed

- ✅ Architecture preserved — same handler structure, same helper functions
- ✅ `financial_events` / `stripe_webhook_log` / `stripe_ops_log` foundation untouched
- ✅ No unrelated billing/admin pages touched
- ✅ No new dependencies added
- ✅ Prisma sync calls preserved (linkStripeSubscription, cancelSubscription, updateSubscriptionTier)
- ✅ `revenue_foundation.sql` not modified (additive migration in separate file)
