# Admin Revenue Dashboard — Real Data Replacement

**Date:** 2026-04-03
**Scope:** Replace fake `/admin/revenue` page with real billing data from production tables
**Method:** Proof-based, additive-only, no architecture changes

---

## What Was Removed

- 100% fake hardcoded data: `$2,800` ad revenue, `$950` affiliate, `$6,100` subscriptions
- Fake monthly table with invented January/February/March numbers
- Fake "Display Ads", "Affiliate Commissions", "Subscriptions" source cards
- "Feature Coming Soon" placeholder banner
- Old API route that used `getAdminRevenueData()` from Prisma (estimated MRR from subscription counts with hardcoded prices `$3/month` and `$20/year`)
- Broken auth pattern (`token.split('.')[0]` parsed as user ID)

## What `/admin/revenue` Now Shows

### 1. Revenue KPIs (This Month)
| Card | Source |
|------|--------|
| Gross Revenue | `SUM(gross_amount)` from `financial_events` where `event_type = 'subscription_payment'` and `status = 'completed'` |
| Stripe Fees | `SUM(fee_amount)` from same |
| Net Revenue | `SUM(net_amount)` from same |
| Refunds | `SUM(ABS(gross_amount))` where `event_type = 'refund'` |
| Failed Payments | `COUNT` where `event_type = 'payment_failed'` |
| Disputes | `SUM(ABS(gross_amount))` + `COUNT` where `event_type = 'dispute'` |

### 2. Plan Breakdown (This Month)
- Revenue grouped by `plan_key` (Pro, Team Starter, Team Pro)
- Sorted by gross revenue descending
- Shows payment count per plan

### 3. Active Workspaces by Plan
- Live count from `workspaces.plan_tier`
- Groups: Free, Pro, Team Starter, Team Pro
- Sorted in logical tier order

### 4. Monthly Revenue Table (Last 12 Months)
- Each month shows: Gross, Fees, Net, Refunds
- All 12 months shown even if empty (£0.00 in muted text)
- Months with refunds highlighted in amber

### 5. Recent Webhooks (Last 20)
- From `stripe_webhook_log`
- Shows: Time, Event type, Status badge (OK/ERR), Error message
- Empty state: "No webhook deliveries recorded yet"

### 6. Recent Ops (Last 20)
- From `stripe_ops_log`
- Shows: Time, Kind, Result badge (OK/FAIL), Error message
- Empty state: "No Stripe operations recorded yet"

### 7. Empty State Handling
- All sections show graceful "No X recorded yet" messages
- No fake numbers ever shown
- Footer note explains data sources and that revenue populates after live Stripe traffic

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/(admin)/admin/revenue/page.tsx` | Full replacement: server component → client component with real data |
| `src/app/api/admin/revenue/route.ts` | Full replacement: Prisma estimates → 4 parallel Supabase queries |
| `src/app/api/webhooks/stripe/route.ts` | Minimal fix: cast `stripe.subscriptions.retrieve()` return to `any` to unblock `current_period_end` type error |

---

## Architecture Decisions

### Auth Pattern
- API route uses Bearer token → `supabase.auth.getUser(token)` → `tissca_staff` table check
- Any active staff member can view (admin, accountant, superadmin, engineer)
- Matches existing engineering API auth pattern

### Data Aggregation
- All aggregation done in JS on the API server (not SQL aggregates)
- Rationale: Supabase JS client doesn't support GROUP BY / SUM; data volume per month is small for a SaaS at this stage
- 4 queries run in parallel via `Promise.all`

### Currency
- All amounts stored in minor units (pence) in `financial_events`
- Display conversion: `(amount / 100).toFixed(2)` with £ prefix
- Default currency: GBP

### Tables Queried
| Table | Columns Used |
|-------|-------------|
| `financial_events` | `occurred_at, event_type, plan_key, currency, gross_amount, fee_amount, net_amount, status` |
| `workspaces` | `plan_tier` |
| `stripe_webhook_log` | `id, received_at, stripe_event_id, event_type, signature_valid, http_status, processed, error_message` |
| `stripe_ops_log` | `id, created_at, kind, route, success, error_code, error_message` |

---

## What Still Depends on Live Stripe Traffic

| Item | Status |
|------|--------|
| Revenue KPIs | Will show £0.00 until `invoice.paid` webhook events flow through and write to `financial_events` |
| Plan breakdown | Same — needs `subscription_payment` events with `plan_key` populated |
| Monthly revenue table | Same — will show £0.00 rows until events exist |
| Workspace plan counts | Already live — reflects current `workspaces.plan_tier` values |
| Recent webhooks | Will populate as soon as Stripe sends any webhook to the handler |
| Recent ops | Will populate when checkout/portal/refund operations are triggered |

---

## What Was NOT Changed

- Webhook handler logic (route.ts) — only a minimal type cast fix
- Admin shell / layout / auth gates
- Engineering Stripe pages
- Accountant console
- Any other billing routes
- `getAdminRevenueData()` in `db.ts` (now dead code, left in place)
