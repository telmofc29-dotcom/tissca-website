# TISSCA Feedback — Triage Architecture

**Version:** Phase 4  
**Date:** 2026-05-26  
**Scope:** Internal admin operations, release QA, alpha testing workflow

---

## Overview

The feedback system accumulates submissions from web, Android, and iOS. Phase 4 introduces a structured triage workflow so platform staff can prioritise, track resolution, and correlate issues across releases.

---

## Lifecycle States

Every feedback item carries a `status` field. The full set of lifecycle states:

| State | Meaning | When to use |
|---|---|---|
| `new` | Freshly submitted, unread | Default on creation |
| `investigating` | Staff is actively reproducing or gathering context | Assign when you pick it up |
| `planned` | Confirmed bug or accepted feature — on the roadmap | After product decision |
| `in_progress` | Fix/implementation is actively in a branch | When dev starts work |
| `fixed` | Code is merged but not yet in a public release | After PR merges |
| `released` | Fix is live in a shipped release (`fixed_in_version` set) | After release ships |
| `closed` | Will not fix / out of scope / user resolved | For closed wontfix items |
| `duplicate` | Same issue already tracked elsewhere (`duplicate_of_id` set) | For duplication |
| `in-progress` *(legacy)* | Old state — maps to `in_progress` in new UI | Do not use for new items |
| `done` *(legacy)* | Old state — maps to `released` or `closed` in new semantics | Do not use for new items |

**State transition rules:**

```
new → investigating → planned → in_progress → fixed → released
new → closed
new → duplicate
any → closed   (wontfix at any stage)
```

---

## Severity

The `severity` field classifies impact. Defaults to `medium` for all new submissions.

| Value | Meaning | Action required |
|---|---|---|
| `critical` | Data loss, crash, billing error, security flaw | Same-day investigation |
| `high` | Core feature broken for significant user segment | Next triage cycle |
| `medium` | Reduced functionality, workaround exists | Normal sprint planning |
| `low` | Cosmetic, minor UX friction | Backlog |

**Admin assignment rules:**
- Native crash reports → start at `high`, escalate to `critical` if repeated
- Billing-related issues → always `critical`
- Alpha tester reports → `medium` by default (may be pre-release bugs)
- Anonymous web feedback → `low` by default unless explicitly escalated

---

## Reproducibility

Applies to `type = "issue"` submissions. Helps prioritise investigation effort.

| Value | Meaning |
|---|---|
| `always` | Consistently reproducible — highest fix confidence |
| `sometimes` | Intermittent — needs more context |
| `rare` | Hard to trigger — low priority unless severity is high |
| `unable_to_reproduce` | Cannot reproduce — may need more user info |

---

## Release Intelligence

The admin list dashboard shows a **Release Intelligence** panel when native (Android/iOS) feedback is present. It groups issues by `app_version` and shows:

- Total submissions per version
- Critical count per version
- Open (unresolved) count per version
- A global "critical unresolved" badge at the top of the panel

**Operational rule:** Before shipping a release, the Open count for the current version should reach zero for all `critical` and `high` severity items.

---

## Duplicate Detection Groundwork

Phase 4 adds `duplicate_of_id` (a free-text reference to another feedback ID). No automated clustering is implemented yet. Manual triage process:

1. Search for similar `headline` text using the Search filter
2. Group by `app_version` + `triage_tags` using the Release Intelligence panel
3. Mark the duplicate item with `status = duplicate` and set `duplicate_of_id = FB-xxxxx`
4. Preserve both items — do not delete duplicates (user history is preserved)

**Future AI clustering:** When ready, a Supabase Edge Function can:
- Vectorise `headline + description` fields
- Cluster by cosine similarity
- Propose `duplicate_of_id` suggestions for admin confirmation

---

## Operational Workflows

### Daily Triage (5 min)

1. Open `/admin/feedback`
2. Filter: Status = `new`, Severity = `critical` → resolve or escalate
3. Filter: Status = `new`, Type = `issue` → assign severity + move to `investigating`
4. Check Release Intelligence panel for critical unresolved count

### Release QA Workflow

Before publishing a release `vX.Y.Z`:

1. Filter: Platform = `android` or `ios`, Status = `fixed`
2. Verify `fixed_in_version` is set to the release version
3. After publish: batch-update matching items to `status = released`
4. Confirm Release Intelligence panel shows Open = 0 for that version

### Alpha Testing Workflow

1. Filter: Alpha Tester = true
2. Review all `new` items
3. Assign severity — alpha reports are typically pre-release, treat generously
4. Fast-track `critical` alpha reports to `investigating`
5. Alpha users don't receive `admin_reply` unless explicitly asked

### Production Support Workflow

When a user reports a help request or blocked issue:

1. Read the item in detail page
2. Set `admin_reply` — this sets `replied_at` timestamp
3. Set `status = investigating` while diagnosing
4. If resolved: set `status = closed` + `admin_reply` with resolution
5. If bug: change `type` awareness but do not modify `type` — create a linked issue entry manually

---

## Admin Fields Reference

### Editable in Admin Detail Page

| Field | UI Label | DB Column | Notes |
|---|---|---|---|
| `status` | Status | `status` | Full lifecycle select; sets `status_changed_at` on change |
| `severity` | Severity | `severity` | Defaults to `medium`; required for triage |
| `reproducibility` | Reproducibility | `reproducibility` | Only meaningful for `type = issue` |
| `fixedInVersion` | Fixed in version | `fixed_in_version` | Set when moving to `fixed` state |
| `duplicateOfId` | Duplicate of ID | `duplicate_of_id` | Set when `status = duplicate` |
| `internalNotes` | Internal Notes | `internal_notes` | Staff-only; not shown to user |
| `adminReply` | Admin Reply | `admin_reply` | Visible to user if surfaced by app; sets `replied_at` |
| `triageTags` | Triage Tags | `triage_tags` | Comma-separated; used for clustering |

### Read-only in Admin Detail Page

| Field | Source |
|---|---|
| `user_id` | From Bearer token at submission time |
| `workspace_id` | From user profile at submission time |
| `platform` | From payload |
| `app_version` | From payload |
| `build_number` | From payload |
| `os_version` | From payload |
| `alpha_tester` | From payload |
| `created_at` | Server timestamp at submission |
| `status_changed_at` | Set automatically on status change |
| `replied_at` | Set automatically when `admin_reply` is saved |

---

## Screenshot Gallery

Screenshots are CDN URLs stored in `feedback.screenshots[]`. Admin detail page renders them as a thumbnail grid. Each thumbnail:
- Shows a hover "View" overlay
- Clicks to open a full-screen modal
- Modal includes an "Open full size ↗" link for download

Screenshots are stored in the `feedback-screenshots` Supabase Storage bucket (public read, Phase 3). Storage lifecycle: retained indefinitely; consider a 90-day cleanup job for old resolved items.

---

## Android/iOS Integration Notes

### Upload Flow (Phase 3)

```
1. Capture screenshot(s) on device
2. POST each image to /api/feedback/upload-screenshot (multipart)
3. Receive: { success: true, url: "https://..." }
4. Include URL(s) in screenshots[] when calling POST /api/feedback
```

### Offline Queue Considerations

Android/iOS apps should queue feedback submissions when offline and flush when connectivity is restored.

**Recommended implementation:**
- Store pending `FeedbackPayload` objects in Room DB (Android) or CoreData (iOS)
- On connectivity restore, flush oldest-first with exponential back-off
- Treat `429 Too Many Requests` as a back-off signal — retry after 60s minimum
- `500` errors: retry up to 3 times with 2s / 8s / 32s delays
- After 3 failures: discard silently (do not block the user)

### Screenshot Compression Recommendations

| Platform | Recommended approach |
|---|---|
| Android | `Bitmap.compress(WEBP_LOSSY, 80, outputStream)` — target < 500 KB |
| iOS | `UIImage.jpegData(compressionQuality: 0.8)` — target < 500 KB |
| Web | `OffscreenCanvas.convertToBlob({ type: 'image/webp', quality: 0.80 })` (see `src/lib/chat/compress-image.ts`) |

Max upload size is 5 MB per image (enforced server-side). Compressing to ≤ 500 KB is strongly recommended for upload speed.

### Retry Strategy

```kotlin
// Android pseudocode
suspend fun submitWithRetry(payload: FeedbackPayload, maxAttempts: Int = 3) {
    val delays = listOf(2_000L, 8_000L, 32_000L)
    repeat(maxAttempts) { attempt ->
        val result = feedbackApi.submit(payload)
        if (result.isSuccessful) return
        if (result.code() == 429) delay(60_000L)
        else delay(delays.getOrElse(attempt) { 32_000L })
    }
    // After max attempts — save to local queue for next session
}
```

---

## Database Schema (Phase 4 additions)

```sql
-- Applied via scripts/migrate-feedback-phase4.sql
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS severity           TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS reproducibility    TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fixed_in_version   TEXT,
  ADD COLUMN IF NOT EXISTS duplicate_of_id    TEXT;

-- severity IN ('low', 'medium', 'high', 'critical')
-- reproducibility IN ('always', 'sometimes', 'rare', 'unable_to_reproduce') OR NULL
-- status extended to include: investigating, planned, in_progress, fixed, released, closed, duplicate
```

**Backward compatibility:** All new columns have safe defaults (`severity` defaults to `'medium'`, all others to `NULL`). Existing rows are unaffected. Old `'in-progress'` and `'done'` status values remain valid.

---

## API Reference Summary

### POST /api/feedback
Public. Rate-limited (10/min/IP). Validates type, platform, screenshots. User identity always server-derived.

### GET /api/feedback
Staff-only (Bearer). Query params: `type`, `status`, `section`, `severity`, `platform`, `alphaTester`. Returns `feedback[]` + `stats` (includes `criticalUnresolved`, `byAppVersion`).

### GET /api/feedback/[id]
Staff-only. Returns raw DB row.

### PATCH /api/feedback/[id]
Staff-only. Updatable: `status`, `internal_notes`, `admin_reply`, `triage_tags`, `severity`, `reproducibility`, `fixed_in_version`, `duplicate_of_id`. Setting `status` automatically sets `status_changed_at`. Setting `admin_reply` automatically sets `replied_at`.

### POST /api/feedback/upload-screenshot
Public. Rate-limited (20/min/IP). Multipart `file` field. Returns `{ success, url, path, size }`.
