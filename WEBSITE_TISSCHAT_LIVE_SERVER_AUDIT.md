# WEBSITE TISSCHAT LIVE-SERVER AUDIT

**Date:** 5 April 2026
**Scope:** Website codebase vs. LIVE TISSCA server contract (8 authoritative tables)

---

## 1. Server contract assumptions found in Website

The Website codebase was built against an **earlier, simpler schema** that does NOT match the live server contract. The following assumptions are embedded in code:

### 1A. Tables the Website knows about

| Live Server Table | Website Equivalent | Match? |
|---|---|---|
| `conversations` | `conversations` (h1 migration) | **PARTIAL** — missing 5 fields |
| `conversation_members` | `conversation_members` (h3 migration) | **PARTIAL** — missing `workspace_id`, `id` column |
| `conversation_member_state` | **DOES NOT EXIST** — Website uses `conversation_reads` + `conversation_members.is_muted/is_archived` instead | **WRONG TABLE** |
| `messages` | `messages` (h1 migration) | ✓ Aligned |
| `message_reactions` | `message_reactions` (h4 migration) | ✓ Aligned |
| `user_devices` | `user_devices` (h5 migration) | ✓ Aligned |
| `message_links` | **DOES NOT EXIST** in Website | **MISSING** |
| `message_audit_log` | **DOES NOT EXIST** in Website | **MISSING** |

### 1B. conversations table field gap

| Live Field | Website Has? | Evidence |
|---|---|---|
| `workspace_id` | ✓ | `phase_h1_tisschat.sql` line 10 |
| `type` | ✗ | Not in schema. Website uses `is_group` boolean instead (h3 migration) |
| `title` | ✓ | `phase_h1_tisschat.sql` line 11 |
| `created_by` | ✗ | Not in Website schema. No creator tracking on conversations |
| `created_at` | ✓ | `phase_h1_tisschat.sql` line 12 |
| `last_message_id` | ✗ | Not in schema. Website computes last message via query at runtime (`conversations/route.ts` lines 55–60) |
| `last_message_at` | ✗ | Not in schema. Website uses `updated_at` (not present in live contract) |
| `dm_key` | ✗ | Not in Website schema. No DM dedup key |
| `is_group` | ✓ (as replacement for `type`) | `phase_h3_tisschat_groups.sql` line 23 |

### 1C. conversation_member_state — completely wrong model

**Live server** has a dedicated `conversation_member_state` table with:
- `last_delivered_message_id` (UUID → message)
- `last_delivered_at` (timestamp)
- `last_read_message_id` (UUID → message)
- `last_read_at` (timestamp)
- `is_muted` (boolean)
- `is_archived` (boolean)
- `workspace_id`

**Website** has NONE of this. Instead:
- Read state → `conversation_reads` table (timestamp only, no message_id reference)
- Delivered state → `messages.delivery_status` column (per-message, not per-user cursor)
- Mute/Archive → `conversation_members.is_muted` / `conversation_members.is_archived` (wrong table)

### 1D. conversation_members field gap

| Live Field | Website Has? | Evidence |
|---|---|---|
| `workspace_id` | ✗ | Not in `phase_h3_tisschat_groups.sql`. Members table lacks workspace scoping |
| `conversation_id` | ✓ | Primary key component |
| `user_id` | ✓ | Primary key component |
| `role` | ✓ | With CHECK constraint (h5) |
| `joined_at` | ✓ | Default `now()` |
| `id` | ✗ | Website uses composite PK `(conversation_id, user_id)`, live server has separate `id` column |

---

## 2. Areas correctly aligned

| Area | Evidence | Files |
|---|---|---|
| **Message types (9)** | `messages_type_check` CHECK matches all 9: text, image, document, card, lead, job, quote, invoice, asset | `phase_h5_tisschat_backend_lock.sql` line 81, `chat-types.ts` line 29 |
| **Delivery status (6)** | `messages_status_check` CHECK matches: failed, saved, sending, sent, delivered, read | `phase_h1_tisschat.sql` line 71, `chat-types.ts` line 9 |
| **Monotonic status promotion** | `isStatusPromotion()` enforces never-downgrade rule | `chat-types.ts` line 21, `chat-store.ts` line 97 |
| **UUID de-duplication** | Client-generated UUID as PK; DB unique constraint + code-level de-dupe | `messages/route.ts` line 89, `chat-store.ts` line 88 |
| **Reactions contract** | Toggle semantics, 6-emoji whitelist `['👍','❤️','😂','😮','😢','🙏']`, composite PK `(message_id, user_id, emoji)` | `reactions/route.ts` line 17, `phase_h4_tisschat_phase5.sql` line 18 |
| **user_devices registration** | Upsert on `(user_id, device_token)`, platform CHECK, soft-deactivate on DELETE | `devices/route.ts`, `phase_h5_tisschat_backend_lock.sql` lines 15–55 |
| **Message payload structure** | 8 payload types + type guards for structured messages | `chat-payloads.ts` |
| **Push dispatch architecture** | Fire-and-forget from server message POST, respects mute/archive, per-platform stubs | `push-sender.ts` |
| **Workspace scoping on conversations** | All API routes verify `workspace_id` on conversations | `conversations/route.ts` lines 36–40, `messages/route.ts` line 72 |
| **Admin-only group delete** | `DELETE /api/chat/conversations` checks `is_group` + `role === 'admin'` | `conversations/route.ts` lines 415–425 |
| **RLS enabled** | All 6 chat tables have RLS enabled | All h1–h5 migrations |
| **Local-first UI pattern** | UI reads only from client state; server data merges in | `chat-store.ts`, `useChat.ts` |

---

## 3. Areas not aligned

### 3A. `conversation_member_state` table MISSING (🔴 CRITICAL)

**Server contract:** Dedicated table `conversation_member_state` tracks per-user delivered/read cursors via **message IDs** (`last_delivered_message_id`, `last_read_message_id`).

**Website reality:**
- Uses `conversation_reads` table with only `last_read_at` (timestamp, no message_id)
- No `last_delivered_message_id` / `last_delivered_at` tracking at all
- `mark-read/route.ts` upserts `conversation_reads.last_read_at` + batch-updates `messages.delivery_status` — this is a client-side workaround, NOT the server's cursor model
- Unread count is computed by comparing message `created_at` against `conversation_reads.last_read_at` timestamp — the server uses message ID cursors

**Files:**
- `supabase/sql/phase_h1_tisschat.sql` lines 48–55 (creates `conversation_reads` — wrong table)
- `src/app/api/chat/mark-read/route.ts` (writes to `conversation_reads` — wrong table)
- `src/app/api/chat/conversations/route.ts` lines 61–65 (reads from `conversation_reads` — wrong table)
- `src/lib/chat/chat-types.ts` lines 70–74 (`ConversationRead` type references `last_read_at` only)

### 3B. Mute/Archive lives on wrong table (🔴 HIGH)

**Server contract:** `is_muted` and `is_archived` are columns on `conversation_member_state`.

**Website reality:** `is_muted` and `is_archived` are columns on `conversation_members`.

**Files:**
- `supabase/sql/phase_h4_tisschat_phase5.sql` lines 30–31 (adds to `conversation_members` — wrong table)
- `src/app/api/chat/conversations/route.ts` lines 343–361 (reads/writes `conversation_members.is_muted/is_archived`)

### 3C. `conversations` table missing 5 fields (🟡 MEDIUM)

| Missing Field | Impact |
|---|---|
| `type` | Website uses `is_group` boolean; server uses `type` field (possible enum like `dm`, `group`, etc.) |
| `created_by` | No creator attribution on conversations. Affects auditability |
| `last_message_id` | Website re-queries messages to find the latest; server denormalises for performance |
| `last_message_at` | Website uses `updated_at` which it manually sets; server has `last_message_at` |
| `dm_key` | No DM deduplication key — Website can create duplicate 1:1 conversations for the same pair of users |

**Files:**
- `supabase/sql/phase_h1_tisschat.sql` lines 8–15
- `src/lib/chat/chat-types.ts` lines 57–68 (`Conversation` type)

### 3D. `conversation_members` missing `workspace_id` and separate `id` (🟡 MEDIUM)

**Server contract:** `conversation_members` has `workspace_id` column and a separate `id` column.

**Website reality:** Neither exists. Uses composite PK `(conversation_id, user_id)`, no workspace scoping on the members table.

**Files:**
- `supabase/sql/phase_h3_tisschat_groups.sql` lines 8–13

### 3E. `message_links` table MISSING (🟡 MEDIUM)

**Server contract:** `message_links` tracks linked business entities per message.

**Website reality:** Entity links are embedded directly in the message `payload` JSON field. No separate normalised table.

**Files:**
- `src/lib/chat/chat-payloads.ts` (entity IDs like `lead_id`, `job_id`, `invoice_id` are inside the JSON payload)
- No migration creates `message_links`

### 3F. `message_audit_log` table MISSING (🟡 MEDIUM)

**Server contract:** Has `message_audit_log` for audit trail.

**Website reality:** No audit log for message operations (send, delete, edit). Deletions are hard-deletes with no trace.

**Files:**
- `src/app/api/chat/messages/route.ts` DELETE handler (lines 110–145) — hard-deletes, no audit entry

### 3G. No workspace membership validation when adding chat members (🟡 MEDIUM)

**Product rule:** "Members must already belong to the same workspace to be added to a conversation."

**Website reality:** `POST /api/chat/conversations` and `PATCH add_members` accept any UUID array. **No check** that those user IDs exist in `workspace_members` for the current workspace.

**Files:**
- `src/app/api/chat/conversations/route.ts` lines 175–210 (POST — accepts raw `member_ids` without workspace validation)
- `src/app/api/chat/conversations/route.ts` lines 316–330 (PATCH `add_members` — no workspace membership check)

### 3H. No tier/entitlement enforcement (🔴 HIGH)

**Product rules:**
- TissChat is only for Team Starter and Team Pro workspaces
- Free users do NOT have TissChat access
- Team Starter allows up to 5 members
- Team Pro allows up to 200 members

**Website reality:** Zero tier checks anywhere in chat code. No file in `src/app/api/chat/` or `src/app/(member)/app/chat/` references subscription tier, plan type, or member limits.

**Evidence:** `grep -r "tier\|Team Starter\|Team Pro\|Free\|subscription\|entitlement" src/app/api/chat/` — **zero matches**.

### 3I. Chat media stored in server bucket — product rule mismatch (🟡 MEDIUM)

**Product rule:** "Pictures should be stored on users' devices, not treated as permanent server media truth."

**Website reality:** `POST /api/chat/upload` uploads images directly to Supabase Storage bucket `chat-files` at path `{workspace_id}/{conversation_id}/{uuid}-{filename}`. Images are stored permanently on the server.

**Files:**
- `src/app/api/chat/upload/route.ts` lines 120–135 (uploads to Supabase Storage)

### 3J. Browser device registration never called (🟢 LOW)

**Website reality:** `devices/route.ts` API exists but the chat page (`page.tsx`) never calls it. No browser push token registration flow. The `useNotifications.ts` hook uses only the browser Notification API (tab-must-be-open).

**Files:**
- `src/app/(member)/app/chat/page.tsx` — no device/token/register/push references
- `src/lib/chat/useNotifications.ts` — browser Notification API only, no service worker

### 3K. `conversation_reads` — wrong read model (🔴 HIGH)

**Server contract:** Read state is tracked via `last_read_message_id` (UUID reference to a specific message).

**Website reality:** Read state is tracked via `last_read_at` (timestamp). This creates drift:
- A timestamp can race with messages created at the exact same millisecond
- The server can't reconstruct which exact message was the last one read
- Unread count calculations differ (timestamp comparison vs. message ordering)

### 3L. No `last_delivered` state tracking at all (🟡 MEDIUM)

**Server contract:** `conversation_member_state` has `last_delivered_message_id` + `last_delivered_at`.

**Website reality:** No delivered cursor exists anywhere. `delivery_status` is set per-message on the `messages` table row, but there's no per-user "last delivered" cursor.

---

## 4. Severity table

| # | Severity | File(s) | Exact Mismatch | Classification |
|---|----------|---------|----------------|----------------|
| 1 | 🔴 CRITICAL | `supabase/sql/phase_h1_tisschat.sql`, `mark-read/route.ts`, `conversations/route.ts`, `chat-types.ts` | Website uses `conversation_reads` table (timestamp-only) instead of `conversation_member_state` (message_id cursors). Entire read/delivered lifecycle is structurally wrong. | **Outdated assumption** |
| 2 | 🔴 HIGH | `supabase/sql/phase_h4_tisschat_phase5.sql`, `conversations/route.ts` | `is_muted` / `is_archived` stored on `conversation_members` instead of `conversation_member_state`. | **Outdated assumption** |
| 3 | 🔴 HIGH | All `src/app/api/chat/*`, `src/app/(member)/app/chat/page.tsx` | Zero tier/entitlement enforcement. Free users can access TissChat. No member count limits (5/200). | **Product rule mismatch** |
| 4 | 🟡 MEDIUM | `supabase/sql/phase_h1_tisschat.sql`, `chat-types.ts` | `conversations` table missing `type`, `created_by`, `last_message_id`, `last_message_at`, `dm_key` fields. | **Outdated assumption** |
| 5 | 🟡 MEDIUM | `supabase/sql/phase_h3_tisschat_groups.sql` | `conversation_members` table missing `workspace_id` column and separate `id` column. | **Outdated assumption** |
| 6 | 🟡 MEDIUM | No migration exists | `message_links` table missing entirely. Entity references embedded in payload JSON instead. | **Outdated assumption** |
| 7 | 🟡 MEDIUM | No migration exists | `message_audit_log` table missing entirely. Deletes are hard-deletes with no trail. | **Outdated assumption** |
| 8 | 🟡 MEDIUM | `conversations/route.ts` POST + PATCH | No validation that added member UUIDs belong to `workspace_members`. Any UUID accepted. | **Parity bug** |
| 9 | 🟡 MEDIUM | `upload/route.ts` | Chat images uploaded to server bucket `chat-files`. Product rule says pictures should be on-device, not server media. | **Product rule mismatch** |
| 10 | 🟡 MEDIUM | `mark-read/route.ts` | `mark-read` writes to `conversation_reads` (wrong table) and batch-updates `messages.delivery_status` directly — server expects writes to `conversation_member_state.last_read_message_id`. | **Local-only fallback** |
| 11 | 🟡 MEDIUM | No code exists | No `last_delivered_message_id` / `last_delivered_at` cursor tracking. Delivery state is per-message only. | **Outdated assumption** |
| 12 | 🟢 LOW | `page.tsx`, `useNotifications.ts` | Devices API exists but chat page never registers browser push token. Browser notifications are tab-scoped only. | **Local-only fallback** |

---

## 5. Required Website sync actions

### MUST FIX (blocks live server alignment)

1. **Replace `conversation_reads` with `conversation_member_state`**
   - Create `conversation_member_state` table matching live server schema
   - Migrate `conversation_reads` data (if any) to new table
   - Add `last_read_message_id`, `last_delivered_message_id` columns
   - Move `is_muted`, `is_archived` from `conversation_members` to `conversation_member_state`
   - Drop `conversation_reads` table
   - Update all API routes that read/write these values

2. **Update `conversations` table to match live schema**
   - Add: `type` (replace `is_group` boolean), `created_by`, `last_message_id`, `last_message_at`, `dm_key`
   - Remove or alias: `updated_at` → `last_message_at`, `is_group` → derived from `type`

3. **Update `conversation_members` table**
   - Add: `workspace_id`, `id` (UUID PK replacing composite PK)
   - Remove: `is_muted`, `is_archived` (move to `conversation_member_state`)

4. **Add tier/entitlement gate**
   - Check workspace subscription tier (Team Starter / Team Pro) at chat page load + all chat API routes
   - Block Free users from TissChat entirely
   - Enforce member limits: 5 for Team Starter, 200 for Team Pro (in add_members + create conversation)

5. **Add workspace membership validation**
   - Before adding members to conversations, verify each user_id exists in `workspace_members` for the current workspace

6. **Rewrite mark-read to use message_id cursor**
   - `mark-read` should upsert `conversation_member_state.last_read_message_id` instead of timestamp
   - Unread count should be computed from message ordering, not timestamp comparison

### SHOULD FIX (alignment + product rules)

7. **Create `message_links` table** and populate it when structured messages are sent (or accept that payload JSON is the link mechanism and document the difference)

8. **Create `message_audit_log` table** and log message send/delete events

9. **Resolve media storage policy**
   - Decide whether to keep server-side storage for chat images or switch to client-only media
   - If keeping server storage, document the deviation from the product rule

### CAN DEFER

10. **Wire browser push registration** — call `devices/route.ts` from chat page with web push token (needs VAPID keys)

---

## 6. What should NOT be changed

| Item | Reason |
|---|---|
| **9 message types** | Already aligned with live server contract |
| **6 delivery statuses** | Already aligned with live server contract |
| **Monotonic status promotion** | Correct behavioural contract |
| **UUID de-duplication** | Correct — matches Android/iOS |
| **Reaction toggle + 6-emoji whitelist** | Already aligned with `message_reactions` contract |
| **Local-first UI pattern** | Correct architecture — UI reads from store, server merges in |
| **Push sender architecture** | Fire-and-forget dispatch with mute/archive gating — correct pattern |
| **user_devices table schema** | Already aligned with live server contract |
| **RLS policies** | All tables have RLS enabled — correct |
| **Message payload structure** | All 8 structured payload types with type guards — correct |
| **Admin-only group delete** | Matches server's admin role semantics |
| **Soft-deactivate on device unregister** | Correct — preserves audit trail |

---

**AUDIT COMPLETE — NO IMPLEMENTATIONS MADE**
