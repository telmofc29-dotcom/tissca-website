# WEBSITE LIVE-SAFE TISSCHAT PATCH REPORT

**Date:** 5 April 2026  
**Scope:** Re-evaluate W-SYNC-1 against the actual live TISSCA server, produce a live-safe deployment plan

---

## 1. What in W-SYNC-1 remains valid

All **code changes** from W-SYNC-1 remain valid. The website code is now correctly aligned with the live server contract:

| # | File | W-SYNC-1 Change | Status |
|---|------|-----------------|--------|
| 1 | `src/lib/chat/chat-tier.ts` | Tier gating module — reads `workspaces.plan_tier`, validates `workspace_members` | **VALID — keep** |
| 2 | `src/lib/chat/chat-types.ts` | Types aligned to live contract (ConversationMemberState, type/dm_key/created_by/last_message_id/last_message_at on Conversation, removed ConversationRead) | **VALID — keep** |
| 3 | `src/app/api/chat/conversations/route.ts` | v5.0 — reads `conversation_member_state` for mute/archive/read, sorts by `last_message_at`, tier gate, workspace member validation, DM dedup, audit logging | **VALID — keep** |
| 4 | `src/app/api/chat/mark-read/route.ts` | v2.0 — upserts `conversation_member_state.last_read_message_id`, accepts `message_id` param | **VALID — keep** |
| 5 | `src/app/api/chat/messages/route.ts` | v3.0 — tier gate, updates `last_message_id`/`last_message_at`, inserts `message_links`, audit log | **VALID — keep** |
| 6 | `src/lib/chat/push-sender.ts` | Reads mute/archive from `conversation_member_state` | **VALID — keep** |
| 7 | `src/lib/chat/chat-store.ts` | Sort by `last_message_at` with `created_at` fallback | **VALID — keep** |
| 8 | `src/lib/chat/useChat.ts` | Passes `message_id` to mark-read endpoint | **VALID — keep** |
| 9 | `src/app/api/chat/conversations/[id]/messages/route.ts` | Tier gate added | **VALID — keep** |
| 10 | `src/app/api/chat/reactions/route.ts` | Tier gate added | **VALID — keep** |
| 11 | `src/app/api/chat/upload/route.ts` | Tier gate added | **VALID — keep (see §3 item C for bucket issue)** |
| 12 | `src/app/api/chat/devices/route.ts` | Tier gate added | **VALID — keep** |

**Summary:** Zero code files need further changes. The W-SYNC-1 code already correctly targets all live server tables.

---

## 2. What in W-SYNC-1 must be changed because the live server already has it

The entire SQL migration file `supabase/sql/phase_w_sync1_live_server_alignment.sql` is **UNSAFE** to run against the live server. Here is a line-by-line analysis:

### 2A. Tables the migration tries to CREATE that already exist on live

| SQL Section | Action | Live Server Reality | Verdict |
|-------------|--------|---------------------|---------|
| §1 CREATE `conversation_member_state` | Creates table + indexes + RLS policies | **Already exists** with same schema | **SKIP — would fail or produce duplicate policies** |
| §7 CREATE `message_links` | Creates table + indexes + CHECK + RLS | **Already exists** | **SKIP** |

### 2B. Column additions that may or may not already exist on live

| SQL Section | Column | Live Server Reality | Verdict |
|-------------|--------|---------------------|---------|
| §2 `conversations.type` | `ADD COLUMN IF NOT EXISTS type text DEFAULT 'dm'` | **Likely exists** — live server already has `conversation_member_state` which implies full conversations schema | **Use IF NOT EXISTS — safe to run** |
| §2 `conversations.created_by` | `ADD COLUMN IF NOT EXISTS` | Same reasoning | **Safe — IF NOT EXISTS** |
| §2 `conversations.last_message_id` | `ADD COLUMN IF NOT EXISTS` | Same | **Safe** |
| §2 `conversations.last_message_at` | `ADD COLUMN IF NOT EXISTS` | Same | **Safe** |
| §2 `conversations.dm_key` | `ADD COLUMN IF NOT EXISTS` | Same | **Safe** |
| §3 `conversation_members.id` | `ADD COLUMN IF NOT EXISTS` | Same | **Safe** |
| §3 `conversation_members.workspace_id` | `ADD COLUMN IF NOT EXISTS` | Same | **Safe** |

### 2C. Data migration from tables that DON'T exist on live

| SQL Section | Action | Live Server Reality | Verdict |
|-------------|--------|---------------------|---------|
| §4 Migrate `conversation_reads` → `conversation_member_state` | SELECTs from `conversation_reads` | **`conversation_reads` DOES NOT EXIST on live** — it was a website-only table from `phase_h1_tisschat.sql` | **WILL FAIL — must be conditional** |
| §4 Migrate `conversation_members.is_muted/is_archived` into state | SELECTs `is_muted`, `is_archived` from `conversation_members` | **These columns DO NOT EXIST on live** — they were added by website-only `phase_h4_tisschat_phase5.sql` | **WILL FAIL — must be conditional** |

### 2D. DROP operations that target non-existent objects

| SQL Section | Action | Live Server Reality | Verdict |
|-------------|--------|---------------------|---------|
| §5 `DROP TABLE conversation_reads` | Drops table | **Table does not exist on live** | **Use IF EXISTS — harmless but unnecessary** |
| §6 `DROP COLUMN is_muted/is_archived` from `conversation_members` | Drops columns | **Columns do not exist on live** | **Use IF EXISTS — harmless but unnecessary** |

### 2E. `message_audit_log` — uncertain

| SQL Section | Action | Live Server Reality | Verdict |
|-------------|--------|---------------------|---------|
| §8 CREATE `message_audit_log` | Creates table + indexes + CHECK + RLS | **NOT listed by user as a live server table** | **Use CREATE TABLE IF NOT EXISTS — safe either way** |

---

## 3. Exact website code changes still needed

### A. No functional code changes required

All 12 code files modified in W-SYNC-1 are correctly aligned with the live server contract. They read/write the right tables with the right columns.

### B. Upload bucket issue (non-blocking)

The user confirms: **"There is currently NO media bucket for chat."**

`src/app/api/chat/upload/route.ts` references the `chat-files` Supabase Storage bucket. This means file uploads will fail at runtime until a bucket is created. However:
- The upload route already has a tier gate
- Upload failures surface a clean 500 error
- No code change needed — this is a **Supabase infrastructure task**: create a `chat-files` Storage bucket (or rename to match whatever the live convention is)

**Decision required:** Either create the `chat-files` bucket on the live Supabase project, or disable/remove the upload endpoint until a bucket policy is decided.

### C. Dead SQL migration files (optional cleanup)

These website-only SQL files created tables/columns that don't exist on the live server and are no longer referenced by code:
- `supabase/sql/phase_h1_tisschat.sql` — creates `conversation_reads` (no longer used)  
- `supabase/sql/phase_h4_tisschat_phase5.sql` — adds `is_muted`/`is_archived` to `conversation_members` (no longer used)

These files are historical artifacts. They should NOT be run against the live server. No code change needed — they're just documentation at this point.

---

## 4. Exact LIVE-SAFE SQL patch needed

The original `phase_w_sync1_live_server_alignment.sql` must be **replaced** with the following live-safe version. This patch:
- Never CREATEs tables that already exist (conversation_member_state, message_links, message_reactions)
- Only uses `ADD COLUMN IF NOT EXISTS` for conversations/conversation_members columns
- Wraps `conversation_reads` migration in a DO block that checks table existence
- Wraps `is_muted`/`is_archived` column drops in conditional checks
- Uses `CREATE TABLE IF NOT EXISTS` for `message_audit_log` (uncertain if live)
- Uses `CREATE INDEX IF NOT EXISTS` everywhere
- Uses `CREATE POLICY` wrapped in conditionals to avoid duplicate policy errors

See the replacement file: `supabase/sql/phase_w_sync1_live_safe.sql`

---

## 5. Any destructive SQL that must NOT be run

| Statement | Why it must NOT run |
|-----------|-------------------|
| `CREATE TABLE public.conversation_member_state (...)` without `IF NOT EXISTS` | Table exists on live — would error |
| `CREATE TABLE public.message_links (...)` without `IF NOT EXISTS` | Table exists on live — would error |
| `CREATE POLICY "cms_select_own" ON conversation_member_state ...` without conditional | Policy may already exist — would error |
| `CREATE POLICY "links_select" ON message_links ...` without conditional | Same |
| `INSERT INTO conversation_member_state ... FROM conversation_reads ...` without existence check | `conversation_reads` doesn't exist on live — would error |
| `ALTER TABLE conversation_members DROP COLUMN is_muted` without `IF EXISTS` | Column doesn't exist on live — would error |
| `ALTER TABLE conversation_members DROP COLUMN is_archived` without `IF EXISTS` | Same |
| `DROP TABLE public.conversation_reads` without `IF EXISTS` | Table doesn't exist on live — would error (though Postgres `DROP TABLE IF EXISTS` handles this, the original used `IF EXISTS` already) |

**Rule:** Every CREATE TABLE/INDEX/POLICY, ALTER ADD/DROP COLUMN, and DROP TABLE must be conditional.

---

## 6. Final deployment order

### Step 1: Run live-safe SQL patch
```
supabase/sql/phase_w_sync1_live_safe.sql
```
This is an additive-only, idempotent patch. It:
- Adds missing columns to `conversations` and `conversation_members` (IF NOT EXISTS)
- Creates `message_audit_log` if it doesn't exist
- Backfills `conversations.type` from `is_group` (safe UPDATE with WHERE guard)
- Backfills `conversation_members.workspace_id` from conversations (WHERE NULL guard)
- Conditionally migrates `conversation_reads` data if that table happens to exist
- Conditionally drops website-only columns/tables (IF EXISTS)
- Creates indexes IF NOT EXISTS
- Creates DM key unique index IF NOT EXISTS

### Step 2: Verify bucket (manual)
Decide whether to create a `chat-files` Supabase Storage bucket for chat media uploads, or defer/disable. The upload endpoint will return 500 until the bucket exists.

### Step 3: Deploy website code
All 12 code files from W-SYNC-1 are safe to deploy. No further code changes needed. The code already targets:
- `conversation_member_state` for read/mute/archive state
- `message_links` for entity references
- `message_audit_log` for audit trail (non-fatal if table doesn't exist — wrapped in `.then(() => {}, (err) => ...)`)
- `workspaces.plan_tier` for tier gating
- `workspace_members` for membership validation

### Step 4: Delete obsolete SQL migration (optional)
Replace `supabase/sql/phase_w_sync1_live_server_alignment.sql` with the live-safe version, or delete it and keep only the live-safe file.

### Step 5: Smoke test
1. GET /api/chat/conversations — should list conversations from `conversation_member_state`
2. POST /api/chat/conversations — should enforce tier gate + workspace member validation
3. POST /api/chat/mark-read — should upsert `conversation_member_state.last_read_message_id`
4. POST /api/chat/messages — should update `conversations.last_message_id/last_message_at`
5. Verify free-tier workspace gets 403 on any chat endpoint
