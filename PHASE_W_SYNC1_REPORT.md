# WEBSITE PHASE W-SYNC-1 REPORT

**Phase:** W-SYNC-1 — Website TissChat Live Server Alignment  
**Date:** $(date)  
**Status:** COMPLETE — All 11 implementation items addressed

---

## Files changed

| # | File | Action |
|---|------|--------|
| 1 | `supabase/sql/phase_w_sync1_live_server_alignment.sql` | NEW — Full schema migration |
| 2 | `src/lib/chat/chat-tier.ts` | NEW — Tier gating module |
| 3 | `src/lib/chat/chat-types.ts` | MODIFIED — Types aligned to live server contract |
| 4 | `src/app/api/chat/conversations/route.ts` | REWRITTEN — v4.0 → v5.0 |
| 5 | `src/app/api/chat/mark-read/route.ts` | REWRITTEN — v1.0 → v2.0 |
| 6 | `src/app/api/chat/messages/route.ts` | MODIFIED — v2.0 → v3.0 |
| 7 | `src/lib/chat/push-sender.ts` | MODIFIED — mute/archive source changed |
| 8 | `src/lib/chat/chat-store.ts` | MODIFIED — updated_at → last_message_at |
| 9 | `src/lib/chat/useChat.ts` | MODIFIED — cursor-based mark-read |
| 10 | `src/app/api/chat/conversations/[id]/messages/route.ts` | MODIFIED — tier gate added |
| 11 | `src/app/api/chat/reactions/route.ts` | MODIFIED — tier gate added |
| 12 | `src/app/api/chat/upload/route.ts` | MODIFIED — tier gate added |
| 13 | `src/app/api/chat/devices/route.ts` | MODIFIED — tier gate added |

**Total:** 2 new files, 11 modified files

---

## Schema changes made

### New tables

1. **`conversation_member_state`** — Per-user per-conversation state  
   - PK: `(conversation_id, user_id)`
   - Columns: `workspace_id`, `last_delivered_message_id`, `last_delivered_at`, `last_read_message_id`, `last_read_at`, `is_muted`, `is_archived`, `created_at`, `updated_at`
   - RLS enabled

2. **`message_links`** — Structured entity references from messages  
   - PK: `id` (UUID)
   - Columns: `workspace_id`, `message_id`, `entity_type`, `entity_id`, `label`, `created_at`
   - CHECK constraint: `entity_type IN ('lead', 'job', 'invoice', 'quote', 'asset')`

3. **`message_audit_log`** — Audit trail for chat operations  
   - PK: `id` (UUID)
   - Columns: `workspace_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `conversation_id`, `metadata` (JSONB), `created_at`
   - CHECK constraint on action values

### Table modifications

4. **`conversations`** — Added columns:
   - `type TEXT DEFAULT 'dm'` — conversation type (dm/group)
   - `created_by UUID` — FK to auth.users
   - `last_message_id UUID` — FK to messages
   - `last_message_at TIMESTAMPTZ` — for sort ordering (replaces updated_at usage)
   - `dm_key TEXT` — deterministic DM dedup key (unique where not null)

5. **`conversation_members`** — Added columns:
   - `id UUID DEFAULT gen_random_uuid()` — row identity
   - `workspace_id UUID` — FK to workspaces (backfilled from conversations)

### Removed

6. **`conversation_reads`** — Dropped (data migrated to `conversation_member_state`)
7. **`conversation_members.is_muted`** — Column removed (moved to `conversation_member_state`)
8. **`conversation_members.is_archived`** — Column removed (moved to `conversation_member_state`)

### Data migration (in SQL file)

- Backfills `conversations.type = 'group'` where `is_group = true`
- Backfills `conversation_members.workspace_id` from parent conversation
- Migrates `conversation_reads` → `conversation_member_state` (last_read_at)
- Migrates `conversation_members.is_muted/is_archived` → `conversation_member_state`

---

## API route changes made

### `GET /api/chat/conversations`
- **Tier gate** added — returns 403 for non-eligible workspaces
- Sort by `last_message_at` (was `updated_at`)
- Reads mute/archive from `conversation_member_state` (was `conversation_members`)
- Reads unread cursors from `conversation_member_state.last_read_message_id` (was `conversation_reads.last_read_at`)
- Enriches response with `type` field

### `POST /api/chat/conversations`
- **Tier gate** added
- **Workspace member validation** — rejects member_ids not in workspace_members
- **Member limit check** via `checkMemberLimit()`
- Sets `type` ('dm'/'group'), `created_by`, `dm_key` on conversation
- DM dedup: if `dm_key` already exists, returns existing conversation
- Seeds `conversation_member_state` rows for all members
- Sets `workspace_id` on conversation_members
- **Audit log**: `conversation_create`

### `PATCH /api/chat/conversations`
- Mute/archive now upserts `conversation_member_state` (was `conversation_members` update)
- Add members: validates workspace membership, checks member limit, seeds `conversation_member_state`
- Remove members: also cleans up `conversation_member_state`
- Leave: also cleans up `conversation_member_state`
- **Audit log**: `group_rename`, `member_add`, `member_remove`

### `DELETE /api/chat/conversations`
- Cascade now includes `message_links` and `conversation_member_state` (was `conversation_reads`)
- **Audit log**: `conversation_delete`

### `POST /api/chat/mark-read`
- Upserts `conversation_member_state.last_read_message_id + last_read_at` (was `conversation_reads.last_read_at`)
- Accepts optional `message_id` parameter for cursor-based reads

### `POST /api/chat/messages`
- **Tier gate** added
- Updates `conversations.last_message_id + last_message_at` (was `updated_at`)
- Inserts `message_links` for structured entity messages (lead/job/invoice/quote/asset)
- **Audit log**: `message_send`

### `DELETE /api/chat/messages`
- Deletes associated `message_links`
- **Audit log**: `message_delete`

### `GET /api/chat/conversations/[id]/messages`
- **Tier gate** added

### `POST /api/chat/reactions` & `GET /api/chat/reactions`
- **Tier gate** added

### `POST /api/chat/upload`
- **Tier gate** added

### `POST /api/chat/devices` & `DELETE /api/chat/devices`
- **Tier gate** added (POST only — DELETE doesn't need workspace context)

---

## Behaviour changes made

### Tier gating
- **All chat API routes** now require workspace `plan_tier` to be `team_starter` or `team_pro`
- Free-tier workspaces receive 403 responses
- Centralized in `chat-tier.ts`: `checkChatTierEligibility()`, `checkMemberLimit()`, `validateWorkspaceMembers()`
- Member limits: team_starter = 5, team_pro = 200

### Read state model
- **Before**: `conversation_reads` table with `last_read_at` timestamp only
- **After**: `conversation_member_state` with `last_read_message_id` (cursor) + `last_read_at` (timestamp)
- Client now passes `message_id` when marking read (falls back to timestamp-only for legacy)

### Mute/archive model
- **Before**: `conversation_members.is_muted` / `conversation_members.is_archived` columns
- **After**: `conversation_member_state.is_muted` / `conversation_member_state.is_archived`
- Push sender (`push-sender.ts`) now reads from `conversation_member_state`

### DM dedup
- **Before**: No dedup — could create multiple DMs between same pair
- **After**: `dm_key` (sorted user IDs joined by ':') with unique index; POST returns existing DM if key matches

### Workspace member validation
- **Before**: Any UUID could be added as conversation member
- **After**: All member IDs validated against `workspace_members` table

### Sort ordering
- **Before**: `conversations.updated_at`
- **After**: `conversations.last_message_at` with `created_at` fallback in client store

### Audit logging
- All create/delete/member-change/rename/send operations now logged to `message_audit_log`

---

## What remained unchanged

1. **9 message types**: text, image, document, lead, job, invoice, quote, asset, card — unchanged
2. **6 delivery statuses**: sending, sent, delivered, read, failed, deleted — unchanged
3. **UUID de-duplication**: Client-generated message UUIDs with DB-level unique constraint — unchanged
4. **Monotonic status promotion**: `isStatusPromotion()` function — unchanged
5. **Reactions**: 6-emoji whitelist (👍❤️😂😮😢🙏), toggle mechanic — unchanged
6. **Local-first store**: UI reads from local state only, remote merges INTO local — unchanged
7. **Push sender architecture**: Fire-and-forget, APNs/FCM/WebPush stubs — unchanged
8. **Realtime subscription**: Supabase postgres_changes on messages table — unchanged
9. **Poll fallback**: 5-second interval — unchanged
10. **File upload**: Supabase Storage `chat-files` bucket, MIME validation, size limits — unchanged

---

## Risks / migration notes

### Migration order
1. Run `phase_w_sync1_live_server_alignment.sql` **BEFORE** deploying code
2. The SQL migrates data and drops `conversation_reads` — this is non-reversible
3. `conversation_members.is_muted` and `conversation_members.is_archived` columns are dropped

### Backward compatibility
- The `is_group` field is preserved on conversations for backward compatibility
- The `type` field is computed from `is_group` if null (legacy rows)
- `last_message_at` falls back to `created_at` in the client store if null
- Mark-read endpoint still accepts calls without `message_id` (timestamp-only fallback)

### Potential issues
- If SQL migration fails mid-way, `conversation_reads` could be in an inconsistent state — run in a transaction
- Existing DMs won't have `dm_key` set until they're next accessed or a backfill is run
- The `last_message_id` and `last_message_at` columns start as null for existing conversations — they'll be populated on next message send

### RLS policies
- `conversation_member_state` has RLS enabled but no policies defined in this migration — policies should be added matching the existing conversation_members pattern

---

## Backend objects that still must exist on server

1. **`workspaces` table** with `plan_tier` column — used by tier gating
2. **`workspace_members` table** with `(user_id, workspace_id)` — used for member validation
3. **`profiles` table** with `(id, full_name, email)` — used for name resolution
4. **`auth.users`** — Supabase Auth for token resolution
5. **Supabase Storage** `chat-files` bucket — used by upload route
6. **8 chat tables** (post-migration):
   - `conversations` (with new columns)
   - `conversation_members` (with new columns, without is_muted/is_archived)
   - `conversation_member_state` (NEW)
   - `messages`
   - `message_reactions`
   - `message_links` (NEW)
   - `message_audit_log` (NEW)
   - `user_devices`
