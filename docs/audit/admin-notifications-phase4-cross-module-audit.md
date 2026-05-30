# Admin Notifications — Phase 4: Cross-Module Event Emission Audit

**Date:** 30 May 2026  
**Scope:** Phases 1–3 complete. Phase 4 expands event emission beyond feedback.  
**Method:** Proof-based audit of existing routes; additive-only implementation; non-fatal emission.  

---

## 1. Existing Event Architecture

| Layer | Description |
|---|---|
| `public.platform_events` | Append-only event log. Service-role writes only. No client RLS policy. |
| `public.admin_notifications` | Per-staff fan-out inbox. One row per staff member per event. RLS: each staff sees own rows. |
| `src/lib/admin-notifications.ts` | `createPlatformEvent()` / `fanOutAdminNotifications()` — shared helpers, non-fatal, idempotent via `idempotency_key`. |
| Auth model | Admin API routes: `supabase.auth.getUser(Bearer token)` → `tissca_staff` table gate. Service-role writes bypass RLS. |
| Polling | 30s in `AdminShell` + `notifications/page.tsx`. Bell badge refreshes on `admin-notif-count-changed` custom event. |
| Module enum (DB CHECK constraint) | `feedback`, `crm`, `invoices`, `quotes`, `planner`, `chat`, `sync`, `subscription`, `admin`, `release`, `ai`, `accountant` |

---

## 2. Module-by-Module Audit

### 2A. Feedback ✅ Already implemented (Phase 2)

| Field | Value |
|---|---|
| Table | `public.feedback` |
| API | `POST /api/feedback` |
| Event type | `feedback.new` |
| Emission | `createFeedbackNotification()` — called `await`ed after insert |
| Fan-out roles | `superadmin`, `admin` |
| Regression check | ✅ No changes. Build clean. |

---

### 2B. Leads

| Field | Value |
|---|---|
| Table | `public.leads` |
| API | Multiple: Android sync writes leads directly. No web-native lead create route found. |
| Existing emission | None |
| Recommended events | `crm.lead_created`, `crm.lead_won`, `crm.lead_lost` |
| Severity | `low` / `medium` |
| Fan-out | `admin`, `superadmin` |
| Risk | **Medium** — leads are created by Android sync, not a web API route. No safe server-side hook without modifying the sync path. |
| **Decision** | **DEFERRED** — no safe existing server-side hook for lead create. Web pages read leads but don't create them via a staffed API route. |

---

### 2C. Jobs

| Field | Value |
|---|---|
| Table | `public.jobs` |
| API | Android sync writes jobs directly. No web-native job create route found. |
| Existing emission | None |
| Recommended events | `crm.job_created`, `crm.job_completed` |
| Severity | `low` |
| Fan-out | `admin`, `superadmin` |
| Risk | **Medium** — same pattern as leads. No safe server-side hook. |
| **Decision** | **DEFERRED** |

---

### 2D. Quotes

| Field | Value |
|---|---|
| Table | `public.quotes` |
| API | Quote creation and acceptance routes exist at `POST /api/quotes` and `PATCH /api/quotes/:id`. |
| Existing emission | None |
| Recommended events | `quotes.quote_created`, `quotes.quote_accepted` |
| Severity | `low` |
| Fan-out | `admin`, `accountant`, `superadmin` |
| Risk | **Low** — but not included in Phase 4 scope per instructions. Routes use `user_profiles` auth (member-facing). |
| **Decision** | **DEFERRED** — out of Phase 4 scope. Safe to add in a future sprint. |

---

### 2E. Invoices — `invoice.created` ✅ IMPLEMENTED

| Field | Value |
|---|---|
| Tables | `public.invoices`, `public.invoice_items` |
| API routes hooked | `POST /api/invoices` (direct creation), `POST /api/quotes/:id/create-invoice` (from accepted quote) |
| Auth model | `supabase.auth.getUser()` session + `user_profiles` role gate |
| Event type | `invoice.created` |
| Severity | `low` |
| Source | `user_action` |
| Deep link | `/admin/notifications` |
| Fan-out roles | `superadmin`, `admin`, `accountant` |
| Idempotency key | `invoice.created.{invoiceId}` |
| Emission location | After successful `invoice_items` insert, before `NextResponse.json` success return |
| Non-fatal | Yes — `.catch()` wrapper, original response unaffected |

**Invoice overdue signal — DEFERRED**

There is no existing cron job, scheduled function, or API route that detects and transitions invoices to `overdue` status. The `overdue` value exists in `InvoiceStatus` and is counted in workspace stats, but is set by client-side logic or manually — no server-side hook exists to emit safely. Adding overdue detection logic from scratch would violate the "do not invent new logic" rule.

---

### 2F. Subscriptions / Stripe

#### `subscription.payment_failed` ✅ IMPLEMENTED

| Field | Value |
|---|---|
| Stripe event | `invoice.payment_failed` |
| Existing handler | `handleInvoicePaymentFailed()` in `src/app/api/webhooks/stripe/route.ts` |
| Handler writes | `financial_events` (upsert) + `workspaces.subscription_status = 'past_due'` |
| Hook location | After `console.log('[stripe-webhook] invoice_payment_failed: ...')` |
| Event type | `subscription.payment_failed` |
| Severity | `critical` |
| Source | `webhook` |
| Fan-out roles | `superadmin`, `admin` |
| Idempotency key | `subscription.payment_failed.{stripeEventId}` |
| Non-fatal | Yes — `.catch()` wrapper, webhook response unaffected |
| Available data | `resolved.workspaceId`, `resolved.userId`, `invoice.id`, `invoice.amount_due`, `invoice.currency` |

#### `subscription.cancelled` ✅ IMPLEMENTED

| Field | Value |
|---|---|
| Stripe event | `customer.subscription.deleted` |
| Existing handler | `handleSubscriptionDeleted()` in `src/app/api/webhooks/stripe/route.ts` |
| Handler writes | `financial_events` (upsert) + workspace billing sync + Prisma `cancelSubscription` |
| Hook location | After `console.log('[stripe-webhook] subscription_deleted: ...')` |
| Event type | `subscription.cancelled` |
| Severity | `high` |
| Source | `webhook` |
| Fan-out roles | `superadmin`, `admin` |
| Idempotency key | `subscription.cancelled.{stripeEventId}` |
| Non-fatal | Yes — `.catch()` wrapper |

---

### 2G. Sync failures — DEFERRED

| Field | Value |
|---|---|
| Routes inspected | `GET /api/workspace/sync-diagnostics`, `GET /api/workspace/sync-diagnostics/details`, `/recovery`, `/simulate` |
| Existing sync logging | None. All sync diagnostic routes are **read-only**. They query existing data for analysis but do not emit or log sync failures. |
| Sync engine | Android app writes directly to Supabase. There is no server-side sync engine running on Next.js that could fail and emit an event. |
| **Decision** | **DEFERRED** — no safe existing server-side sync failure hook. A future sync agent (Phase 5) could emit `sync.failed` events. |

---

## 3. Events Implemented in Phase 4

| Event type | Module | Severity | Source file hooked | Fan-out |
|---|---|---|---|---|
| `invoice.created` | `invoices` | `low` | `src/app/api/invoices/route.ts` | superadmin, admin, accountant |
| `invoice.created` | `invoices` | `low` | `src/app/api/quotes/[id]/create-invoice/route.ts` | superadmin, admin, accountant |
| `subscription.payment_failed` | `subscription` | `critical` | `src/app/api/webhooks/stripe/route.ts` | superadmin, admin |
| `subscription.cancelled` | `subscription` | `high` | `src/app/api/webhooks/stripe/route.ts` | superadmin, admin |

---

## 4. Events Deferred and Why

| Event | Module | Reason |
|---|---|---|
| `crm.lead_created` | `crm` | No web-side lead create API route. Android writes directly to Supabase. No safe hook. |
| `crm.job_created` | `crm` | Same as leads. |
| `crm.job_completed` | `crm` | Same — no server-side job status change route found. |
| `quotes.quote_created` | `quotes` | Out of Phase 4 scope per instructions. Safe to add later. |
| `quotes.quote_accepted` | `quotes` | Same. |
| `invoice.overdue` | `invoices` | No existing overdue detection logic. Would require inventing new cron/detection — prohibited. |
| `invoice.sent` | `invoices` | Not in Phase 4 scope. Low risk, safe to add later in `POST /api/invoices/:id/send`. |
| `sync.failed` | `sync` | No server-side sync engine. All sync diagnostics are read-only. |

---

## 5. Security Checks

| Check | Status |
|---|---|
| Normal users cannot access `/api/admin/notifications` | ✅ Unchanged — Bearer token + `tissca_staff.is_active` gate |
| Normal users cannot access `/api/admin/notifications/count` | ✅ Same gate |
| `createPlatformEvent` uses service-role client internally | ✅ `createServerSupabaseClient()` — bypasses RLS, never exposes to clients |
| `fanOutAdminNotifications` queries `tissca_staff` with service-role | ✅ |
| Invoice notification called with `user.id` from server-side `getUser()` | ✅ Server-side proof-based auth |
| Stripe notification called with data from verified webhook event | ✅ Stripe signature verification already in place (`STRIPE_WEBHOOK_SECRET`) |
| Notification failure does NOT affect user-facing responses | ✅ All three helpers: non-fatal try/catch + `.catch()` at call sites |
| Idempotency keys prevent double-notification on retry | ✅ `UNIQUE` constraint on `platform_events.idempotency_key` |
| No PII stored in `platform_events.metadata` | ✅ Only invoice numbers, totals, Stripe IDs |
| `deep_link` values are internal admin paths only | ✅ `/admin/notifications` — staff-only area |

---

## 6. Manual Test Checklist

1. **Feedback regression** — Submit feedback via `/feedback` → verify notification appears in `/admin/notifications` and bell badge increments.

2. **Invoice created (direct)** — As an authenticated staff/admin user, create a new invoice via `POST /api/invoices` with valid body → check Vercel logs for `[admin-notifications] createPlatformEvent: created event_id=...` and `module=invoices` → verify notification row in `admin_notifications` table → verify notification appears in `/admin/notifications`.

3. **Invoice created (from quote)** — Accept a quote and create invoice via `POST /api/quotes/:id/create-invoice` → same verification as above. Idempotency: calling again for the same invoice returns HTTP 409 (dedup at route level) and no duplicate platform_events row (idempotency_key `invoice.created.{id}` prevents it).

4. **Subscription payment failed** — In Stripe test mode, simulate `invoice.payment_failed` event using `stripe trigger invoice.payment_failed --override invoice:customer=cus_xxx` → check Vercel logs for `[stripe-webhook] invoice_payment_failed:` followed by `[admin-notifications] createPlatformEvent: created event_id=...` with `module=subscription severity=critical` → verify `critical` severity notification in `/admin/notifications` bell with red badge.

5. **Subscription cancelled** — In Stripe test mode, `stripe trigger customer.subscription.deleted` → same verification for `subscription.cancelled` event with `high` severity.

6. **Mark read / dismiss still works** — Open a notification, mark as read → bell count decrements. Dismiss → notification removed from list.

7. **Staff-only gate** — Make an unauthenticated `GET /api/admin/notifications` → expect `401`. Make request with a normal (non-staff) user token → expect `403`.

8. **Build passes** — `npm run build` → `✓ Generating static pages (172/172)`.

---

## 7. Build / Test Result

```
✓ Generating static pages (172/172)
Exit code: 0
```

All 172 pages built successfully. No TypeScript errors. No regressions.

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/admin-notifications.ts` | Added `INVOICE_NOTIFICATION_ROLES`, `SUBSCRIPTION_NOTIFICATION_ROLES` constants; added `createInvoiceCreatedNotification()`, `createSubscriptionPaymentFailedNotification()`, `createSubscriptionCancelledNotification()` |
| `src/app/api/invoices/route.ts` | Import + non-fatal `createInvoiceCreatedNotification()` call after successful invoice + items insert |
| `src/app/api/quotes/[id]/create-invoice/route.ts` | Import + non-fatal `createInvoiceCreatedNotification()` call after successful invoice + items insert |
| `src/app/api/webhooks/stripe/route.ts` | Import + non-fatal `createSubscriptionPaymentFailedNotification()` in `handleInvoicePaymentFailed`; `createSubscriptionCancelledNotification()` in `handleSubscriptionDeleted` |
| `docs/audit/admin-notifications-phase4-cross-module-audit.md` | This document |
