# TISSCA Mobile Feedback Integration Audit — Android + iOS Ready

**Date:** 10 June 2026
**Scope:** Audit the existing feedback backend and define the mobile (Android + iOS) integration path into the **same** unified feedback system used by the website.
**Method:** Proof-based audit of the live codebase. No backend rewrites. No redesigns.
**Outcome:** The backend is **already mobile-ready**. Android/iOS can integrate today with zero backend changes for the core flow. A small set of **optional admin-visibility enhancements** is recommended for full metadata parity.

---

## TL;DR

```
Android / iOS / Website
      │
      ▼
POST /api/feedback                  ✅ accepts platform = web | android | ios | api
      │                             ✅ optional Bearer auth (server-derives user/workspace)
      ▼                             ✅ anonymous allowed
feedback table                      ✅ app_version, build_number, os_version,
      │                                device_model, screenshots[] all present
      ▼
createFeedbackNotification()        ✅ emits platform_events (module=feedback)
      │
      ▼
platform_events                     ✅ idempotent (feedback.new.{id})
      │
      ▼
admin_notifications (fan-out)       ✅ one row per staff member
      │
      ├──► /admin/feedback           ✅ platform filter + detail page
      ├──► /admin/notifications       ✅ appears as a notification card + drawer
      └──► /admin/workbench           ✅ appears after a staff member claims it (Phase 5A/5B)
```

**Verdict:** ✅ Single unified pipeline confirmed. No separate mobile-only system needed or present.

---

## PART 1 — Backend Audit: `POST /api/feedback`

**File:** [src/app/api/feedback/route.ts](../../src/app/api/feedback/route.ts)

| Requirement | Status | Evidence |
|---|---|---|
| Accepts `platform` field | ✅ | `const validPlatforms = ['web', 'android', 'ios', 'api']` — validated at boundary; absent → defaults to `'web'` |
| Supports `android` + `ios` | ✅ | Both in `validPlatforms` and in DB CHECK constraint `feedback_platform_check` |
| Optional auth token / user context | ✅ | `extractBearerToken()` → `supabase.auth.getUser(token)` → derives `userId` + `workspaceId`. Token is optional |
| Anonymous mobile feedback works | ✅ | No token → submission still succeeds; `userId`/`workspaceId` left undefined |
| Screenshots array supported | ✅ | Validated: must be array, max 10 items, each string ≤ 2048 chars |
| `app_version` supported | ✅ | `submission.appVersion` → `app_version` column |
| `build_number` supported | ✅ | `submission.buildNumber` → `build_number` column |
| `os_version` supported | ✅ | `submission.osVersion` → `os_version` column |
| `device_model` supported | ✅ | `submission.deviceModel` → `device_model` column |
| Rate limiting | ✅ | 10 submissions / IP / minute |
| Security: client cannot spoof identity | ✅ | `user_id`/`workspace_id` are **never** read from the request body — always server-derived from the validated token |

### Database schema — confirmed

**File:** [scripts/migrate-feedback-phase1.sql](../../scripts/migrate-feedback-phase1.sql)

```sql
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS user_id        UUID,
  ADD COLUMN IF NOT EXISTS workspace_id   UUID,
  ADD COLUMN IF NOT EXISTS platform       TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS app_version    TEXT,
  ADD COLUMN IF NOT EXISTS build_number   TEXT,
  ADD COLUMN IF NOT EXISTS os_version     TEXT,
  ADD COLUMN IF NOT EXISTS device_model   TEXT,
  ADD COLUMN IF NOT EXISTS screenshots    TEXT[],
  ADD COLUMN IF NOT EXISTS alpha_tester   BOOLEAN NOT NULL DEFAULT false,
  ...
-- CHECK (platform IN ('web', 'android', 'ios', 'api'))
```

All mobile columns exist and are indexed (`idx_feedback_platform`, `idx_feedback_app_version`).

### Screenshot upload — confirmed

**File:** [src/app/api/feedback/upload-screenshot/route.ts](../../src/app/api/feedback/upload-screenshot/route.ts)

- `POST /api/feedback/upload-screenshot` — `multipart/form-data`, field name `file`.
- Allowed MIME: `image/jpeg`, `image/png`, `image/webp`. Max **5 MB**. Rate limit 20/IP/min.
- **Anonymous uploads allowed** (same policy as feedback submit).
- Returns `{ success, url, path, size }`. The returned `url` is what mobile puts into `screenshots[]`.
- ⚠️ Requires the `feedback-screenshots` Supabase Storage bucket to exist (returns `503` with a clear message if missing).

### Native payload contract — already defined

**File:** [src/utils/feedback.ts](../../src/utils/feedback.ts) — `NativeFeedbackPayload` interface

```ts
export interface NativeFeedbackPayload {
  type: FeedbackType;          // 'help' | 'issue' | 'suggestion' | 'review' | 'cancellation'
  headline: string;            // ≤ 500 chars
  description: string;         // ≤ 5000 chars
  url?: string;                // screen name or deep-link path
  platform: 'android' | 'ios';
  appVersion: string;          // "2.1.0"
  buildNumber: string;         // "210"
  osVersion?: string;          // "Android 14" / "iOS 17.4"
  deviceModel?: string;        // "Pixel 8" / "iPhone 15 Pro"
  userEmail?: string;          // only for anonymous submissions
  rating?: number;             // 1–5, type="review" only
  section?: FeedbackSection;
  screenshots?: string[];      // CDN URLs, max 10
  alphaTester?: boolean;
}
```

> The server consumes camelCase keys (`appVersion`, `buildNumber`, …) and maps them to snake_case columns. **Mobile clients must send camelCase JSON keys** to match the existing parser.

---

## PART 2 — Fan-out to Admin Surfaces

**File:** [src/lib/admin-notifications.ts](../../src/lib/admin-notifications.ts) — `createFeedbackNotification()`

Confirmed flow (awaited, non-fatal, idempotent):

1. `createPlatformEvent({ module: 'feedback', event_type: 'feedback.new', ... })`
2. `fanOutAdminNotifications(eventId, FEEDBACK_NOTIFICATION_ROLES)`

Event `metadata` currently carries:

```js
metadata: {
  feedback_type, platform, app_version, alpha_tester,
  has_email, screenshots_count, section, feedback_severity
}
```

### Admin surface visibility

| Surface | Mobile feedback appears? | Platform shown? | Version/build/device shown? |
|---|---|---|---|
| `/admin/feedback` (list) | ✅ | ✅ platform filter (`web/android/ios/api`) | partial |
| `/admin/feedback/[id]` (detail) | ✅ | ✅ badge | ✅ `app_version`, `build_number`, `os_version`, screenshots gallery — ⚠️ **`device_model` NOT rendered** |
| `/admin/notifications` (card + drawer) | ✅ | ⚠️ via generic metadata only (`platform`, `app_version`) | ⚠️ `build_number`, `os_version`, `device_model` **not in event metadata** |
| `/admin/workbench` | ✅ after claim | inherits notification card | inherits |

---

## PART 3 — What Already Works

- ✅ Unified ingest endpoint `POST /api/feedback` for Web + Android + iOS + API.
- ✅ Platform validation + DB CHECK constraint (`web/android/ios/api`).
- ✅ Optional auth: authenticated → linked to user/workspace; anonymous → still accepted.
- ✅ Identity is server-derived (no client spoofing of `user_id`/`workspace_id`).
- ✅ Full mobile metadata columns: `app_version`, `build_number`, `os_version`, `device_model`, `screenshots[]`, `alpha_tester`.
- ✅ Screenshot upload endpoint (multipart, anonymous-friendly, returns CDN URL).
- ✅ `NativeFeedbackPayload` TypeScript contract already published for mobile teams.
- ✅ End-to-end fan-out: `feedback → platform_events → admin_notifications`.
- ✅ Mobile feedback lands in `/admin/feedback`, `/admin/notifications`, and `/admin/workbench` (after claim).
- ✅ Admin feedback list has a platform filter; detail page renders platform badge + version/build/os + screenshot gallery.
- ✅ Release-intelligence stats already segment by `app_version` for non-web platforms.

---

## PART 4 — What Is Missing (Gaps)

All gaps are **admin-visibility polish** — none block mobile integration.

| # | Gap | Severity | Surface |
|---|---|---|---|
| G1 | `build_number`, `os_version`, `device_model` are **not** included in `platform_events.metadata`, so the `/admin/notifications` drawer cannot display them (only `platform` + `app_version`). | Low | Notifications drawer |
| G2 | `device_model` is stored but **not rendered** on the `/admin/feedback/[id]` detail page. | Low | Feedback detail |
| G3 | No distinct **platform badge with icon** (🤖 Android / 🍎 iOS / 🌐 Web) on notification cards/drawer — platform appears only as raw metadata text. | Low (cosmetic) | Notifications |
| G4 | `feedback-screenshots` Supabase Storage bucket must be **manually created** before mobile screenshot upload works (endpoint returns `503` until then). | Setup | Infra |
| G5 | No Android or iOS client code exists in this repo (only entitlement helper stubs in `docs/`). No offline queue (a mobile-side concern). | N/A (mobile repo) | Mobile |

> **Note:** G1–G3 are optional. The notification card deep-links to `/admin/feedback/{id}`, where most metadata is already shown, so triage is fully functional today.

---

## PART 5 — Android Implementation Plan

> No Android repo exists in this workspace. This is the integration spec for the Android team.

### 5.1 Screen / button placement

- **Primary:** `Settings → Help & Feedback` row → opens a `FeedbackActivity` / `FeedbackBottomSheet`.
- **Secondary (contextual):** an overflow-menu "Report a problem" action on error screens and the billing/subscription screen (pre-fills `section`).
- **Type selector** inside the sheet: Help · Issue · Suggestion · Review (rating) · Cancellation.

### 5.2 Required payload fields (Android)

| Field | Source on device |
|---|---|
| `type` | User selection |
| `headline` | User input |
| `description` | User input |
| `platform` | hard-coded `"android"` |
| `appVersion` | `BuildConfig.VERSION_NAME` |
| `buildNumber` | `BuildConfig.VERSION_CODE.toString()` |
| `osVersion` | `"Android ${Build.VERSION.RELEASE}"` |
| `deviceModel` | `"${Build.MANUFACTURER} ${Build.MODEL}"` |
| `url` | current screen route name |
| `section` | derived from screen (optional) |
| `rating` | only when `type == review` |
| `screenshots` | CDN URLs returned by upload endpoint |
| `alphaTester` | from remote config / build flavor |
| Auth | `Authorization: Bearer <supabaseAccessToken>` if signed in (optional) |

### 5.3 Kotlin payload model

```kotlin
@Serializable
data class FeedbackPayload(
    val type: String,                 // "help" | "issue" | "suggestion" | "review" | "cancellation"
    val headline: String,
    val description: String,
    val platform: String = "android",
    val appVersion: String,
    val buildNumber: String,
    val osVersion: String? = null,
    val deviceModel: String? = null,
    val url: String? = null,
    val section: String? = null,
    val rating: Int? = null,          // reviews only
    val userEmail: String? = null,    // anonymous only
    val screenshots: List<String>? = null,
    val alphaTester: Boolean = false,
)

object DeviceMeta {
    fun osVersion() = "Android ${Build.VERSION.RELEASE}"
    fun deviceModel() = "${Build.MANUFACTURER} ${Build.MODEL}".trim()
}
```

### 5.4 API call flow (Retrofit)

```kotlin
interface FeedbackApi {
    @Multipart
    @POST("api/feedback/upload-screenshot")
    suspend fun uploadScreenshot(
        @Header("Authorization") bearer: String?,   // optional
        @Part file: MultipartBody.Part,
    ): UploadResponse                                // { url }

    @POST("api/feedback")
    suspend fun submitFeedback(
        @Header("Authorization") bearer: String?,   // optional
        @Body body: FeedbackPayload,
    ): SubmitResponse                                // { success, id }
}
```

Flow:
1. (Optional) For each attached image → `uploadScreenshot()` → collect returned `url`s.
2. Build `FeedbackPayload` with device metadata + the collected screenshot URLs.
3. `submitFeedback()` with the Bearer token when the user is signed in (omit header when anonymous).
4. On `200 { success: true }` → show confirmation. On `429` → show "try again shortly".

### 5.5 Screenshot upload flow

- Compress to ≤ 5 MB, `image/jpeg`/`png`/`webp`.
- Upload **before** submitting feedback; collect URLs; attach to `screenshots[]`.
- Max 10 images (server enforces; enforce client-side too).

### 5.6 Offline queue (design only — not yet implemented anywhere)

- Persist unsent `FeedbackPayload` (+ local screenshot file paths) to a Room table `pending_feedback`.
- A `WorkManager` `CoroutineWorker` with network constraint drains the queue: upload screenshots → submit → delete row on success.
- The server's idempotency is per `feedback.id`; generate the `id` client-side **only if** you also send it — otherwise the server generates one. To make retries safe, prefer letting the worker treat a `200` as terminal and avoid duplicate sends by removing the row atomically.

---

## PART 6 — iOS Implementation Plan

> No iOS repo exists. **Do not implement iOS code yet.** This is the forward contract so iOS matches Android exactly.

- Same endpoint, same camelCase JSON contract (`NativeFeedbackPayload`).
- `platform = "ios"`, `appVersion = CFBundleShortVersionString`, `buildNumber = CFBundleVersion`,
  `osVersion = "iOS \(UIDevice.current.systemVersion)"`, `deviceModel = <hw.machine identifier>`.
- Same screenshot upload (multipart `file`) → CDN URL → `screenshots[]`.
- Optional `Authorization: Bearer <token>` from the Supabase iOS session.
- Placement: `Settings → Help & Feedback`; contextual "Report a problem" on error/billing screens.

```swift
struct FeedbackPayload: Codable {
    let type: String
    let headline: String
    let description: String
    var platform: String = "ios"
    let appVersion: String
    let buildNumber: String
    var osVersion: String?
    var deviceModel: String?
    var url: String?
    var section: String?
    var rating: Int?
    var userEmail: String?
    var screenshots: [String]?
    var alphaTester: Bool = false
}
```

---

## PART 7 — Backend Changes Needed

**For the core mobile flow: NONE.** Android/iOS can integrate today.

**Optional polish (recommended for full admin metadata parity — additive, non-breaking):**

- **B1 (G1):** In `createFeedbackNotification()`, add `build_number`, `os_version`, `device_model` to `platform_events.metadata` so the `/admin/notifications` drawer can display full device context without a page hop.
- **B2 (G2):** Render `device_model` on `/admin/feedback/[id]` detail page (one line next to `os_version`).
- **B3 (G3):** Add a platform badge with icon (🤖 Android / 🍎 iOS / 🌐 Web) to the notification card + drawer, derived from `metadata.platform`.
- **B4 (G4):** Create the `feedback-screenshots` bucket in Supabase Storage (public read) — infra step, not code.

None of these touch the ingest contract or website feedback behaviour.

---

## PART 8 — Exact Next Implementation Prompt

> Copy-paste this as the next task when ready to ship the optional admin-visibility polish (B1–B3). Mobile teams can begin integration in parallel — they are not blocked by this.

```
# TISSCA Mobile Feedback — Admin Visibility Polish (Phase MF-1)

Additive only. Do not change the /api/feedback ingest contract. Do not break website feedback. Build must pass.

1. src/lib/admin-notifications.ts → createFeedbackNotification():
   Extend platform_events metadata to also include:
     build_number: feedback.buildNumber ?? null,
     os_version:   feedback.osVersion   ?? null,
     device_model: feedback.deviceModel ?? null
   (Keep all existing metadata keys unchanged.)

2. src/app/(admin)/admin/notifications/page.tsx (DetailDrawer):
   Add a platform badge derived from evt.metadata.platform with icons:
     android → 🤖 Android, ios → 🍎 iOS, web → 🌐 Web, api → 🔌 API.
   When module === 'feedback' and metadata has app_version/build_number/os_version/device_model,
   show them in the key-fields list. Do not show raw nulls.

3. src/app/(admin)/admin/feedback/[id]/page.tsx:
   Render device_model next to os_version in the User Information block (guard with `feedback.device_model &&`).

4. Infra (manual, document only): ensure the `feedback-screenshots` Supabase Storage bucket exists (public read).

5. npm run build must pass (expect same page count). Report files changed + before/after of the metadata object.
```

---

## PART 9 — Guardrails Confirmed

- ✅ **Website feedback unchanged** — no edits made to the ingest path during this audit.
- ✅ **No redesigns** — audit only; report is documentation.
- ✅ **No separate mobile system** — mobile reuses the exact same `POST /api/feedback` pipeline.
- ✅ **Build:** unaffected (no source changes in this audit; report is markdown only).

---

## Appendix — File Reference Map

| Concern | File |
|---|---|
| Ingest endpoint | [src/app/api/feedback/route.ts](../../src/app/api/feedback/route.ts) |
| Screenshot upload | [src/app/api/feedback/upload-screenshot/route.ts](../../src/app/api/feedback/upload-screenshot/route.ts) |
| Types + native payload | [src/utils/feedback.ts](../../src/utils/feedback.ts) |
| Fan-out to events/notifications | [src/lib/admin-notifications.ts](../../src/lib/admin-notifications.ts) |
| DB schema (mobile columns) | [scripts/migrate-feedback-phase1.sql](../../scripts/migrate-feedback-phase1.sql) |
| Admin feedback list | [src/app/(admin)/admin/feedback/page.tsx](../../src/app/(admin)/admin/feedback/page.tsx) |
| Admin feedback detail | [src/app/(admin)/admin/feedback/[id]/page.tsx](../../src/app/(admin)/admin/feedback/[id]/page.tsx) |
| Notifications centre | [src/app/(admin)/admin/notifications/page.tsx](../../src/app/(admin)/admin/notifications/page.tsx) |
| My Workbench | [src/app/(admin)/admin/workbench/page.tsx](../../src/app/(admin)/admin/workbench/page.tsx) |
