# TISSCA Feedback System — Unified Audit Report

**Date:** 2026-05-25  
**Scope:** Website only (no Android/iOS source in this repo)  
**Method:** Strict proof-based. Every finding below is verified from actual files.  
**Goal:** Understand what exists before designing a unified cross-platform feedback ecosystem.

---

## Executive Summary

The TISSCA website already has a **production-grade feedback system** that is largely feature-complete for single-platform (web) use. The core pipeline — submission → Supabase `feedback` table → admin dashboard — exists and works.

**What is missing** to make it the unified cross-platform feedback centre:

1. No `user_id` / `workspace_id` link on the `feedback` table → submissions are anonymous even when the user is authenticated.
2. No `platform` field → cannot distinguish web vs. Android vs. iOS submissions.
3. No `app_version` / `os_version` / `device_model` columns → required for Google Play alpha triage.
4. No screenshot/attachment upload pipeline wired to feedback.
5. No `admin_reply` or threaded status → one-way submission only.
6. No `/api/contact` backend route → the public Contact page form silently simulates success.
7. No Android or iOS feedback integration → both platforms have zero wiring to this backend.
8. `FeedbackButton` is mounted only in the **public layout** → absent from the member app shell.

---

## 1. Existing Feedback Systems

### 1.1 Website Floating Feedback Button — PRODUCTION

| Property | Value |
|---|---|
| **Component** | `src/components/FeedbackButton.tsx` |
| **Form component** | `src/components/FeedbackForm.tsx` |
| **Mounted in** | `src/app/(public)/layout.tsx` (public routes only) |
| **NOT mounted in** | `src/app/(member)/app/layout.tsx` (member app shell) |
| **Status** | ✅ Functional |
| **Backend** | `POST /api/feedback` → Supabase `feedback` table with in-memory fallback |

**How it works:**  
A fixed bottom-right pill button opens a modal. The modal contains `FeedbackForm`, which has four tabs:

- `help` — "What are you trying to do?" + area selector + blocked Y/N
- `issue` — headline + description + affected area
- `suggestion` — headline + description + expected benefit
- `review` — star rating (1–5) + optional comment

On submit → `createFeedbackSubmission()` → `POST /api/feedback` → Supabase insert.  
Analytics event `feedback_submit` is fired via `trackEvent()` on success.

**Gap:** The floating button is absent from `/app/*` routes. Authenticated users inside the member app cannot access the feedback widget.

---

### 1.2 Cancellation Feedback — PRODUCTION

| Property | Value |
|---|---|
| **Trigger** | `src/app/(member)/app/settings/subscription/page.tsx` (lines 667+) |
| **Type** | `cancellation` |
| **Context field** | `cancellationContext: 'subscription_cancel' | 'account_delete'` |
| **Reasons** | Multi-select: tooExpensive, notEnoughValue, cantAfford, missingFeatures, tooComplicated, switchingProvider, temporaryPause, other |
| **Status** | ✅ Functional |

When a user cancels their subscription or deletes their account, `createFeedbackSubmission()` is called with `type: 'cancellation'`, the selected reason array, and the context. This is submitted to the same `/api/feedback` pipeline.

---

### 1.3 Public Contact Page — UI COMPLETE, BACKEND STUB

| Property | Value |
|---|---|
| **Page** | `src/app/(public)/contact/page.tsx` |
| **Client wrapper** | `src/app/(public)/contact/contactclient.tsx` |
| **Form component** | `src/app/(public)/contact/ContactFormSection.tsx` |
| **Backend route** | ❌ DOES NOT EXIST (`/api/contact` is not implemented) |
| **Status** | ⚠️ UI complete, simulates success (`setTimeout(resolve, 800)`) |

The contact form collects `name`, `email`, `message`. On submit it simulates an 800ms delay and shows a "Message sent" confirmation. **Nothing is persisted.** The code comment explicitly says: *"POST to API route — implement /api/contact when backend is ready."*

Fields captured: name, email, message. No subject, no category, no attachment.

---

### 1.4 Admin Feedback Dashboard — PRODUCTION

| Property | Value |
|---|---|
| **Root page** | `src/app/(admin)/admin/feedback/page.tsx` |
| **Sub-pages** | `help/`, `issues/`, `suggestions/`, `reviews/`, `cancellations/`, `[id]/` |
| **Data source** | `GET /api/feedback` |
| **Status** | ✅ Functional |

**Features proven:**
- Filter by type / status / section
- Client-side text search (headline, description, email)
- Per-type sub-pages with dedicated views
- Cancellation reason aggregation with bar chart breakdown
- CSV export via `exportFeedbackToCSV()`
- Cancellation sub-page (`cancellations/`) with "Other text" verbatim display

**Gap:** No ability to set `internal_notes` from the admin UI. The column exists in the DB but there is no write path shown in the admin page code.

---

### 1.5 Admin Support Panel — PRODUCTION (different purpose)

| Property | Value |
|---|---|
| **Page** | `src/app/(admin)/admin/support/page.tsx` |
| **Purpose** | Redirect gateway to `/admin/engineering/support` (access-controlled) |
| **Engineering support** | `src/app/(admin)/admin/engineering/support/page.tsx` |
| **API routes** | `/api/admin/support/set-workspace`, `/api/admin/support/clear-workspace`, `/api/admin/support/notes`, `/api/admin/support/customer`, `/api/admin/support/vouchers/send` |
| **Status** | ✅ Production. This is the **operator** support panel, not user feedback. |

This is an internal admin tool for TISSCA operators — impersonating workspaces, reading support notes, sending vouchers. It is **not** the user-facing feedback system. These are separate concerns.

---

## 2. Existing Database Structure

### 2.1 `feedback` table — EXISTS (script-only, not in Supabase migrations folder)

**Source:** `scripts/create-feedback-table.sql`  
**Status:** Script exists but is NOT in `supabase/sql/` migrations. Must be manually applied.

```sql
CREATE TABLE IF NOT EXISTS feedback (
  id                   TEXT PRIMARY KEY,
  type                 TEXT NOT NULL CHECK (type IN ('help','issue','suggestion','review','cancellation')),
  status               TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in-progress','done')),
  section              TEXT NOT NULL DEFAULT 'other',
  headline             TEXT NOT NULL,
  description          TEXT NOT NULL DEFAULT '',
  user_email           TEXT,               -- nullable, user-supplied, not linked to auth.users
  url                  TEXT,
  device_type          TEXT DEFAULT 'desktop',
  user_agent           TEXT,
  rating               INTEGER,
  cancellation_reasons TEXT[],
  cancellation_context TEXT CHECK (cancellation_context IS NULL
                          OR cancellation_context IN ('subscription_cancel','account_delete')),
  internal_notes       TEXT,
  is_blocked           BOOLEAN DEFAULT NULL,  -- added via migrate-feedback-add-blocked.sql
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_type       ON feedback (type);
CREATE INDEX idx_feedback_created_at ON feedback (created_at DESC);
CREATE INDEX idx_feedback_is_blocked ON feedback (is_blocked) WHERE is_blocked = true;

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
-- Policy: service role full access only (no user-level RLS)
```

**Additive migration:** `scripts/migrate-feedback-add-blocked.sql` — adds `is_blocked BOOLEAN DEFAULT NULL` safely.

### 2.2 Missing columns — gap analysis

| Missing field | Purpose | Impact |
|---|---|---|
| `user_id UUID` | Link to `auth.users.id` for authenticated submissions | Cannot correlate feedback to a specific user account |
| `workspace_id UUID` | Link to workspace | Cannot show workspace-specific feedback; cannot filter by plan tier |
| `platform TEXT` | `'web' \| 'android' \| 'ios'` | Cannot distinguish platform origin |
| `app_version TEXT` | e.g. `'1.4.2'` | Cannot triage bugs by app version |
| `os_version TEXT` | e.g. `'Android 14'`, `'iOS 17.4'` | Cannot filter OS-specific bugs |
| `device_model TEXT` | e.g. `'Pixel 8'`, `'iPhone 15'` | Cannot correlate device-specific issues |
| `screenshots TEXT[]` | Array of Storage URLs | No screenshot attachment capability |
| `admin_reply TEXT` | Admin response text | One-way only; no reply mechanism |
| `replied_at TIMESTAMPTZ` | When admin replied | No reply audit trail |
| `triage_tags TEXT[]` | Admin-applied labels | No tagging system |
| `alpha_tester BOOLEAN` | Is this from a closed alpha tester? | Cannot segment alpha vs. production feedback |
| `build_number TEXT` | e.g. `'2024030501'` | More precise than version string for Android |

### 2.3 No other feedback-adjacent tables found

Searched all `supabase/sql/*.sql` files. No `contact_submissions`, `support_tickets`, `bug_reports`, `feature_requests`, or `help_tickets` tables exist.

---

## 3. Existing APIs and Edge Functions

### 3.1 `POST /api/feedback`

**File:** `src/app/api/feedback/route.ts`

**Contract:**
```
POST /api/feedback
Content-Type: application/json
Body: FeedbackSubmission (see src/utils/feedback.ts)

Response 200: { success: true, id: string, message: string }
Response 400: { error: 'Missing required fields' }
Response 500: { error: 'Failed to submit feedback' }
```

**Authentication:** ❌ None required. Open to all. The route uses `createServerSupabaseClient()` (service role) for the DB write, but does not verify any user token. The route does not extract or record the caller's user identity.

**Rate limiting:** ❌ None. No Turnstile, no IP rate limit on this route.

**In-memory fallback:** If Supabase insert fails, submission goes to module-level `feedbackStore[]` in `src/utils/feedback.ts`. This resets on every server restart.

### 3.2 `GET /api/feedback`

**File:** `src/app/api/feedback/route.ts`

**Contract:**
```
GET /api/feedback?type=&status=&section=
Response 200: { feedback: FeedbackSubmission[], stats: FeedbackStats, ... }
```

**Authentication:** ❌ None. The admin dashboard calls this unprotected. Any client can read all feedback. **Security gap.**

### 3.3 No `/api/contact` route

The public Contact page form has a `TODO` comment and simulates success. No API route file at `src/app/api/contact/` exists.

### 3.4 No `/api/mobile/feedback` route

`src/app/api/mobile/` contains: `calculate/`, `invoices/`, `pricing/`, `profiles/`, `quotes/`. No `feedback/` subdirectory exists.

### 3.5 Edge Functions — feedback-unrelated

Only two Edge Functions exist in `supabase/functions/`:
- `stripe-create-checkout/`
- `stripe-create-portal/`

No feedback, email, or notification Edge Functions exist in this repository.

### 3.6 Email system (`src/lib/email-sender.ts`)

Resend API integration. Sends from `email_queue` table, writes to `email_history`. Supports open/click tracking, unsubscribe tokens, admin-editable templates.

**Not wired to feedback** — there is no trigger that emails the admin when new feedback arrives. The email intelligence system (`src/lib/email-intelligence.ts`) handles scheduled lifecycle emails to users, not feedback notifications to staff.

### 3.7 Existing upload infrastructure (not feedback-connected)

| Route | Bucket | Purpose |
|---|---|---|
| `POST /api/chat/upload` | `chat-files` | TISSChat image/document upload |
| `GET /api/storage/[...path]` | any allowlisted | Signed URL proxy for storage access |
| `POST /api/admin/warehouse-upload` | `asset-meshes` | Warehouse GLB mesh upload |

The storage proxy (`/api/storage/[...path]`) is already production-grade. It handles auth, signed URL generation, and bucket allowlisting. A `feedback-screenshots` bucket could be added and the proxy could serve it with zero change to the route itself.

---

## 4. Existing UI Components

### 4.1 `FeedbackForm` (src/components/FeedbackForm.tsx)

Multi-tab form. Tabs: `help`, `issue`, `suggestion`, `review`.  
Props: `onClose`, `onSubmit`.  
Fully translated: 5 locales via `t.member.feedback.*` in `src/i18n/translations.ts`.  

**Reuse potential:** High. Could be extended with a `platform` hidden field and an optional file uploader.

### 4.2 `FeedbackButton` (src/components/FeedbackButton.tsx)

Fixed floating pill button + modal shell wrapping `FeedbackForm`.  
Currently imported only in `src/app/(public)/layout.tsx`.

**Gap:** Not present in `src/app/(member)/app/layout.tsx` (member app shell). Authenticated users have no feedback widget.

### 4.3 `ContactFormSection` (src/app/(public)/contact/ContactFormSection.tsx)

Separate standalone form for the public contact page. Has its own `name`, `email`, `message` fields.  
Currently disconnected from the `feedback` backend.

**Reuse potential:** Could be wired to `POST /api/feedback` with `type: 'help'` or a new `contact` type.

### 4.4 Admin feedback sub-pages

| Path | Purpose |
|---|---|
| `admin/feedback/page.tsx` | Root — all feedback with filters and stats |
| `admin/feedback/help/page.tsx` | Help requests only |
| `admin/feedback/issues/page.tsx` | Bug/issue reports only |
| `admin/feedback/suggestions/page.tsx` | Feature suggestions only |
| `admin/feedback/reviews/page.tsx` | Star reviews only |
| `admin/feedback/cancellations/page.tsx` | Cancellation analytics with reason bars |
| `admin/feedback/[id]/page.tsx` | Individual submission detail |

All pages read from `GET /api/feedback` with type filters. CSV export available.

**Gap:** No write path from admin UI — cannot update `status`, cannot add `internal_notes`, cannot set `admin_reply`.

---

## 5. Cross-Platform Readiness

### 5.1 Android

**Proof:** No Android source code exists in this repository. The `src/app/api/mobile/` namespace covers: `calculate`, `invoices`, `pricing`, `profiles`, `quotes`. There is **no `/api/mobile/feedback`** endpoint.

The `docs/SYNC_CONTRACT.md` and cross-platform identity audit docs confirm Android writes directly to Supabase via its own Supabase client (not the website's API routes). Android currently does NOT call any website feedback endpoint.

Android feedback capability: **zero — no wiring exists.**

### 5.2 iOS

No iOS source code in this repo. iOS is referenced only in architecture docs. iOS feedback capability: **zero.**

### 5.3 What would enable cross-platform reuse

The `POST /api/feedback` route is already a plain JSON REST endpoint. Android and iOS could call it directly with an `Authorization: Bearer <user_token>` header. The route would need:

1. `platform` field in the body and DB schema.
2. Optional auth verification — extract `user_id` from the token when present.
3. Rate limiting to prevent abuse from mobile clients.
4. `app_version`, `os_version`, `device_model` fields in the body and DB schema.

**The DTO is already defined** in `src/utils/feedback.ts` as `FeedbackSubmission`. It is a plain TypeScript interface — no server-side framework coupling. Android/iOS can mirror this as a Kotlin/Swift data class.

### 5.4 Shared contracts already in use on other systems

The chat system (`/api/chat/*`) is already shared across web and Android via direct REST calls. The feedback system can follow the same pattern without architectural changes.

---

## 6. Production-Grade Gap Analysis

| Capability | Current state | Gap |
|---|---|---|
| Submit feedback from website | ✅ Working | — |
| Submit feedback from member app (authenticated) | ❌ Button absent | Add `FeedbackButton` to member layout |
| Persist to Supabase | ✅ Working with fallback | — |
| Link submission to authenticated user | ❌ Missing | Add `user_id` extraction from Bearer token |
| Link submission to workspace | ❌ Missing | Add `workspace_id` field |
| Platform tagging | ❌ Missing | Add `platform` field |
| App version tracking | ❌ Missing | Add `app_version` field |
| OS/device metadata | ❌ Missing | Add `os_version`, `device_model` fields |
| Screenshot attachments | ❌ Missing | Wire file uploader to `feedback-screenshots` bucket |
| Rate limiting on POST | ❌ Missing | Add Turnstile or IP rate limiter |
| Auth protection on GET | ❌ Missing | Admin GET route is publicly readable |
| Admin reply / threaded status | ❌ Missing | Add `admin_reply`, `replied_at` columns |
| Admin can update status / notes | ❌ Missing | Add PATCH route and admin form |
| Admin receives email on new feedback | ❌ Missing | Wire to email-sender or Resend webhook |
| `/api/contact` backend | ❌ Missing | Route does not exist; form fakes success |
| Android can submit feedback | ❌ Not wired | Add `/api/mobile/feedback` or extend base route |
| iOS can submit feedback | ❌ Not wired | Same as Android |
| Alpha tester flag | ❌ Missing | Add `alpha_tester BOOLEAN` column |
| Build number tracking | ❌ Missing | Add `build_number` field |
| Feature request voting | ❌ Not started | New feature — no existing foundation |
| Crash correlation | ❌ Not started | Requires crash reporting integration (Sentry, etc.) |

---

## 7. Google Play Closed Testing Readiness

Current state: **not ready**.

For Google Play closed alpha testing, the minimum viable feedback pipeline needs:

| Requirement | Status |
|---|---|
| Testers can submit bugs | ⚠️ Website form exists; Android has no native integration |
| Android app version captured | ❌ `app_version` column missing |
| Android build number captured | ❌ `build_number` column missing |
| OS version captured | ❌ `os_version` column missing |
| Device model captured | ❌ `device_model` column missing |
| Screenshot attachment | ❌ Not wired |
| Alpha tester flag | ❌ `alpha_tester` column missing |
| Admin can triage by version | ❌ No version-based filtering in admin |
| Admin can reply to tester | ❌ No reply mechanism |
| Tester notified of status change | ❌ No notification pipeline |

What IS ready today: the Supabase table, admin dashboard, and REST endpoint. The foundation exists — it needs the metadata columns and Android integration.

---

## 8. Recommended Unified Architecture

> This section is the recommendation only. No implementation is proposed here.

### 8.1 Database evolution (additive SQL — no breaking changes)

```sql
-- Additive migration: extend feedback table for cross-platform unified use
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workspace_id     UUID,
  ADD COLUMN IF NOT EXISTS platform         TEXT DEFAULT 'web'
    CHECK (platform IN ('web', 'android', 'ios', 'api')),
  ADD COLUMN IF NOT EXISTS app_version      TEXT,
  ADD COLUMN IF NOT EXISTS build_number     TEXT,
  ADD COLUMN IF NOT EXISTS os_version       TEXT,
  ADD COLUMN IF NOT EXISTS device_model     TEXT,
  ADD COLUMN IF NOT EXISTS screenshots      TEXT[],
  ADD COLUMN IF NOT EXISTS alpha_tester     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_reply      TEXT,
  ADD COLUMN IF NOT EXISTS replied_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS triage_tags      TEXT[];

CREATE INDEX IF NOT EXISTS idx_feedback_user_id      ON feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_workspace_id ON feedback (workspace_id);
CREATE INDEX IF NOT EXISTS idx_feedback_platform     ON feedback (platform);
CREATE INDEX IF NOT EXISTS idx_feedback_alpha_tester ON feedback (alpha_tester) WHERE alpha_tester = true;
```

**RLS update:** The current policy (service role only) is correct for the API-route pattern. Optionally add a user-scoped read policy so authenticated users can view their own submissions.

### 8.2 API route evolution

| Route | Change |
|---|---|
| `POST /api/feedback` | Extract `user_id` + `workspace_id` from Bearer token when present. Accept new fields: `platform`, `app_version`, `build_number`, `os_version`, `device_model`, `alpha_tester`. Add rate limiting. |
| `GET /api/feedback` | Add admin auth guard (require staff role). Add filter params: `platform`, `alpha_tester`, `app_version`. |
| `PATCH /api/feedback/[id]` | New route. Allow admin to update `status`, `internal_notes`, `admin_reply`, `triage_tags`. |
| `POST /api/feedback/screenshots` | New route. Accept multipart upload, store in `feedback-screenshots` Supabase bucket, return URL array. |
| `POST /api/mobile/feedback` | New mobile-specific alias of `POST /api/feedback`. Identical contract, adds `platform` default `'android'`/`'ios'`. |
| `/api/contact` | New route. Accept `name`, `email`, `message`. Insert into `feedback` table with `type: 'help'`, `platform: 'web'`, no auth required. |

### 8.3 Shared DTO (cross-platform contract)

```typescript
// Canonical feedback payload — same for website, Android, iOS
interface FeedbackPayload {
  type: 'help' | 'issue' | 'suggestion' | 'review' | 'cancellation';
  headline: string;
  description: string;
  section?: string;
  url?: string;

  // User context (optional — populated when auth token present)
  user_id?: string;
  workspace_id?: string;
  user_email?: string;

  // Platform metadata (required from mobile, optional from web)
  platform: 'web' | 'android' | 'ios';
  app_version?: string;
  build_number?: string;
  os_version?: string;
  device_model?: string;
  device_type?: 'mobile' | 'desktop' | 'tablet';
  user_agent?: string;

  // Type-specific
  rating?: number;                     // review
  is_blocked?: boolean;               // help
  cancellation_reasons?: string[];    // cancellation
  cancellation_context?: string;      // cancellation
  screenshots?: string[];             // all types

  // Alpha / closed testing
  alpha_tester?: boolean;
}
```

Android (Kotlin) and iOS (Swift) mirror this as a data class / Codable struct. The website `FeedbackSubmission` type in `src/utils/feedback.ts` extends it.

### 8.4 Website UI changes

1. Add `FeedbackButton` to `src/app/(member)/app/layout.tsx` so authenticated members can submit feedback from any member page.
2. Add optional screenshot uploader to `FeedbackForm` (file input → `POST /api/feedback/screenshots` → URL appended to submission body).
3. Wire `ContactFormSection` to `POST /api/contact` (or directly to `POST /api/feedback` with `type: 'help'`).
4. Add admin PATCH capability to `admin/feedback/[id]/page.tsx` (status update, internal notes, reply).

### 8.5 Admin dashboard additions

1. `platform` filter column.
2. `app_version` filter for alpha triage.
3. `alpha_tester` badge on submission cards.
4. Admin reply input on detail view (`[id]` page) → calls `PATCH /api/feedback/[id]`.
5. Email trigger: on insert to `feedback` where `type = 'issue'` or `alpha_tester = true`, enqueue admin notification via existing `email-sender.ts`.

### 8.6 Android/iOS integration strategy

**Phase 1 (minimal viable):** Android calls `POST /api/feedback` directly from a "Help & Feedback" bottom sheet. Pass `Authorization: Bearer <user_token>` in the header. Server extracts `user_id` and `workspace_id`. Pass `platform: 'android'`, `app_version`, `build_number`, `os_version`, `device_model` in the body.

**Phase 2 (screenshots):** Android uploads screenshot to `POST /api/feedback/screenshots` (multipart), then includes the returned URL in the feedback body.

**Phase 3 (alpha testing):** Android passes `alpha_tester: true` for builds distributed via Google Play closed testing track. Admin dashboard gains a dedicated "Alpha Testers" view.

**No custom feedback SDK needed.** The existing REST endpoint is sufficient.

---

## 9. File Reference Index

### Core feedback files

| File | Purpose |
|---|---|
| `src/utils/feedback.ts` | DTO types, `createFeedbackSubmission()`, in-memory store, CSV export |
| `src/components/FeedbackForm.tsx` | Multi-tab form UI |
| `src/components/FeedbackButton.tsx` | Floating button + modal shell |
| `src/app/api/feedback/route.ts` | `POST` + `GET` API handlers |
| `src/app/(public)/layout.tsx` | Mounts `FeedbackButton` (public routes only) |
| `src/app/(member)/app/settings/subscription/page.tsx` | Cancellation feedback trigger |

### Admin dashboard files

| File | Purpose |
|---|---|
| `src/app/(admin)/admin/feedback/page.tsx` | Root dashboard |
| `src/app/(admin)/admin/feedback/help/page.tsx` | Help filter view |
| `src/app/(admin)/admin/feedback/issues/page.tsx` | Issue filter view |
| `src/app/(admin)/admin/feedback/suggestions/page.tsx` | Suggestion filter view |
| `src/app/(admin)/admin/feedback/reviews/page.tsx` | Review filter view |
| `src/app/(admin)/admin/feedback/cancellations/page.tsx` | Cancellation analytics |
| `src/app/(admin)/admin/feedback/[id]/page.tsx` | Individual submission detail |

### Contact page files

| File | Purpose |
|---|---|
| `src/app/(public)/contact/page.tsx` | SSR wrapper |
| `src/app/(public)/contact/contactclient.tsx` | Client wrapper |
| `src/app/(public)/contact/ContactFormSection.tsx` | Form (stub, no backend) |

### Database scripts

| File | Purpose |
|---|---|
| `scripts/create-feedback-table.sql` | Initial schema (run manually in Supabase SQL editor) |
| `scripts/migrate-feedback-add-blocked.sql` | Additive migration: `is_blocked` column |

### Email system (not yet wired to feedback)

| File | Purpose |
|---|---|
| `src/lib/email-sender.ts` | Resend API integration, queue processor |
| `src/lib/email-intelligence.ts` | Trigger classification, template resolution |

### Storage proxy (reusable for screenshots)

| File | Purpose |
|---|---|
| `src/app/api/storage/[...path]/route.ts` | Auth-gated signed URL proxy for all Supabase buckets |

---

## 10. Confirmed Non-Existence

The following were searched and confirmed **not to exist** in this codebase:

- `/api/contact` route
- `/api/mobile/feedback` route
- `PATCH /api/feedback/[id]` route
- `feedback-screenshots` storage bucket (no bucket config found)
- Android feedback screen or DTO
- iOS feedback screen or DTO
- Edge Function for feedback or notifications
- `user_id` / `workspace_id` / `platform` / `app_version` columns on `feedback` table
- Feature request / voting system
- Crash reporting integration (Sentry, Crashlytics, etc.)
- Feedback email notification to admin staff

---

*This audit contains only verified findings from actual source files. No assumptions were made. Every path, schema, and behaviour above can be traced to the files listed.*
