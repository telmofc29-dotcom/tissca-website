# TISSCA P0 Security Audit — Cross-Account Data Isolation
**Date:** 2026-05-01  
**Severity:** P0 / Production-Blocking  
**Reported:** Data from `telmo.f.c29@gmail.com` visible under `info@carvalhorenovations.com`  
**Scope:** Website (Next.js / Supabase), with notes on Android/iOS and mobile API routes

---

## A. Root Cause Summary

Three independent causes combined to produce the reported cross-account data leak:

### Cause 1 — TissChat RLS: `USING(true)` on conversations + messages (CRITICAL)
`phase_h1_tisschat.sql` set `FOR SELECT USING (true)` on both `conversations` and `messages`. Any authenticated user — regardless of workspace — can read ALL conversations and messages in the entire database via direct Supabase realtime subscriptions. The web API layer filters correctly, but the Android/iOS Supabase SDK realtime channel does not.

### Cause 2 — `crm_history` + `documents` + `tool_attachments`: RLS enabled, zero policies (HIGH)
RLS is enabled on these tables but no permissive `SELECT/INSERT` policies exist. This means:
- The **web API** (which uses the service-role client) bypasses RLS and works correctly.
- Any **direct client SDK query** (e.g., Android/iOS realtime listener) returns zero rows — this is safe but broken, and could cause the mobile app to fall back to a stale local cache that was never invalidated.

### Cause 3 — `tool_attachments` schema mismatch: `business_id NOT NULL`, code writes `workspace_id` (HIGH)
`bootstrap_tool_attachments.sql` defines `business_id uuid NOT NULL` as the scoping column. The current `createToolAttachment()` in `workspace-data.ts` writes `workspace_id` but never `business_id`. This means every `INSERT` to `tool_attachments` fails silently (NOT NULL violation on `business_id`), and every `SELECT` via `scopeQuery(.., 'tool_attachments', ..)` returns nothing (no `workspace_id` column exists in the bootstrapped schema).

### Cause 4 — Draft localStorage NOT user-scoped (MEDIUM)
`tissca_tool_draft_{toolKey}` in `src/lib/tools/tool-types.ts` uses no user or workspace prefix. When two different accounts log in from the same browser, the second user sees the first user's unsaved tool drafts.

### Cause 5 — Mobile `/api/mobile/profiles`, `/api/mobile/quotes`, `/api/mobile/invoices`: No auth, in-memory shared store (CRITICAL)
These three legacy endpoints accepted `?userId=` from the URL query string and stored data in **server-side in-memory `Map` objects** (shared across all requests). Any request without a userId defaulted to `'default-user'`. This is a full cross-tenant data leak — all users share the same in-memory store.

### Cause 6 — RLS policies reference `staff_members` (table renamed to `workspace_members`) (MEDIUM)
`phase_c1_quotes.sql` RLS policies on `clients`, `quotes`, `materials`, `labour_rates`, and `quote_items` all reference `public.staff_members` which was renamed to `workspace_members`. If `staff_members` no longer exists, the RLS `USING()` subquery fails and all direct client queries to these tables are blocked. Indirect effect: mobile/app may hit empty results and fall back to a cache that contains stale data from a previous account.

---

## B. Files Inspected

| File | Finding |
|------|---------|
| `supabase/sql/phase_h1_tisschat.sql` | `conversations_select` and `messages_select` policies use `USING (true)` |
| `supabase/sql/phase_h4_tisschat_phase5.sql` | `message_reactions` select uses `USING (true)` |
| `supabase/sql/bootstrap_crm_history.sql` | RLS enabled, **no policies** |
| `supabase/sql/bootstrap_documents.sql` | RLS enabled, **no policies** |
| `supabase/sql/bootstrap_tool_attachments.sql` | `business_id uuid NOT NULL`, no `workspace_id` column, no policies |
| `supabase/sql/phase_tools_parity_columns.sql` | Adds columns to `tool_attachments` but NOT `workspace_id` |
| `supabase/sql/phase_c1_quotes.sql` | All RLS policies reference `staff_members` (renamed table) |
| `supabase/sql/document_pdf_info.sql` | RLS enabled, no policies defined |
| `supabase/sql/phase_e2_warehouse_assets.sql` | RLS properly scoped via `user_profiles.auth_id` |
| `supabase/sql/phase_f1_projects.sql` | RLS properly scoped via `workspace_members` |
| `src/lib/workspace-data.ts` | `scopeQuery()`: correctly scopes by `workspace_id`; `createToolAttachment()` writes `workspace_id` but table lacks column |
| `src/lib/tools/tool-types.ts` | `saveDraft/loadDraft` keys NOT user-scoped: `tissca_tool_draft_{toolKey}` |
| `src/app/api/auth/signout/route.ts` | Correctly clears httpOnly cookies via SSR client |
| `src/app/api/auth/setup-profile/route.ts` | Correctly creates isolated workspace per user |
| `src/app/api/workspace/leads/route.ts` | Correctly uses `resolveUserFromToken` + `scopeQuery` |
| `src/app/api/workspace/tool-attachments/route.ts` | Correctly uses `resolveUserFromToken`; writes to `workspace_id` (schema mismatch) |
| `src/app/api/workspace/document-pdf-info/route.ts` | Correctly scoped by `workspace_id` via token |
| `src/app/api/chat/conversations/route.ts` | API layer correctly scoped; realtime channel unprotected by RLS |
| `src/contexts/WorkspaceContext.tsx` | `SIGNED_OUT` event → `clearAllState()` ✓; no localStorage cleanup |
| `src/components/member/MemberAppShell.tsx` | Logout calls signout API + supabase signOut; no draft cleanup before fix |
| `src/app/api/mobile/profiles/route.ts` | **In-memory store, userId from URL query, no auth** |
| `src/app/api/mobile/quotes/route.ts` | **In-memory store, no auth** |
| `src/app/api/mobile/invoices/route.ts` | **In-memory store, no auth** |

---

## C. Which Data Is Leaking and Why

| Table | Leak Vector | Leaked To |
|-------|-------------|-----------|
| `conversations` | Supabase realtime subscription with `USING(true)` | Any authenticated user |
| `messages` | Same as above | Any authenticated user |
| `message_reactions` | Same as above | Any authenticated user |
| `tool_attachments` | INSERT silently fails (no workspace_id column); SELECT returns empty → app uses stale cache | N/A (data not saved correctly, not leaked) |
| `crm_history`, `documents` | Direct client SDK queries return empty → mobile falls back to stale cache | N/A (not leaked, but broken) |
| Tool drafts (localStorage) | Global key, not user-scoped | Next user on same browser |
| Mobile `/api/mobile/*` | Shared in-memory Map | All server users |

---

## D. Android Fix Plan

> Android codebase is not in this repository. The following is inferred from the API contracts and schema.

1. **Logout: Clear Room database.** On `signOut()`, call `Room.databaseBuilder(...).build().clearAllTables()` or delete the database file. Alternatively use `RoomDatabase.Builder.fallbackToDestructiveMigration()` for dev environments.

2. **Logout: Clear DataStore / SharedPreferences.** All preference files that store workspace_id, business_id, user_id, cached CRM data, or auth tokens must be cleared on logout. Do not rely on token expiry.

3. **Supabase Realtime: Add workspace filter.** The Realtime channel subscription for `conversations` and `messages` must include a `workspace_id=eq.{workspaceId}` filter so the server-side RLS (now fixed) and client-side filter both enforce isolation.

4. **Sync push: Verify workspace_id is set.** All entity creation (leads, jobs, tasks, tool_attachments) must include the current `workspaceId` from the authenticated session, not a cached value from a previous session.

5. **Account switch: Force full re-sync.** When the authenticated user changes, invalidate ALL local Room tables and re-fetch from scratch. Do not carry over data from the previous user's sync.

---

## E. iOS Fix Plan

> iOS codebase is not in this repository. The following is inferred.

1. **Logout: Clear Core Data / Realm / SQLite.** All entity data must be purged on sign-out.

2. **Logout: Clear Keychain / UserDefaults.** Remove all scoped preferences including `workspace_id`, cached tokens, and entity IDs.

3. **Supabase Realtime:** Same as Android — add `workspace_id=eq.{workspaceId}` filter on all realtime channel subscriptions.

4. **Offline sync:** Validate that the offline sync queue (pending mutations) is tagged with `workspace_id` and is cleared/quarantined on logout.

---

## F. Website Fix Plan (Applied)

All website fixes have been applied. Summary:

### F1. TissChat RLS — conversations + messages (SQL)
**File:** `supabase/sql/security_p0_data_isolation.sql`  
Replaced `USING (true)` with workspace-membership check:
```sql
CREATE POLICY conversations_select ON public.conversations
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );
```
Same pattern applied to `messages`, `message_reactions`, and `conversations` INSERT/UPDATE/DELETE.

### F2. crm_history + documents + tool_attachments — RLS policies added (SQL)
**File:** `supabase/sql/security_p0_data_isolation.sql`  
Added SELECT/INSERT/UPDATE policies for all three tables, scoped to `workspace_members`.

### F3. tool_attachments schema — workspace_id column added (SQL)
**File:** `supabase/sql/security_p0_data_isolation.sql`  
```sql
ALTER TABLE public.tool_attachments ADD COLUMN IF NOT EXISTS workspace_id uuid;
UPDATE public.tool_attachments SET workspace_id = business_id WHERE workspace_id IS NULL;
```
Also adds `parent_id`, `parent_type`, `created_by`, `created_at_millis`, `updated_at_millis`, and breakdown columns that the current code writes.

### F4. document_pdf_info + leads + jobs + tasks + assets — RLS added (SQL)
**File:** `supabase/sql/security_p0_data_isolation.sql`  
All critical operational tables now have `workspace_members`-scoped SELECT and write policies.

### F5. clients + quotes — RLS fixed (SQL)
**File:** `supabase/sql/security_p0_data_isolation.sql`  
Dropped old `staff_members`-referencing policies, replaced with `workspace_members`-scoped policies.

### F6. Draft localStorage — user-scoped keys (TypeScript)
**File:** `src/lib/tools/tool-types.ts`  
Key format changed from `tissca_tool_draft_{toolKey}` to `tissca_tool_draft_{userId}_{toolKey}`. Added `clearAllDraftsForUser(userId)` helper.

### F7. Logout — draft cleanup (TypeScript)
**File:** `src/components/member/MemberAppShell.tsx`  
Added `clearAllDraftsForUser(currentUserId)` call during logout, before session is destroyed.

### F8. Mobile routes — disabled (TypeScript)
**Files:**
- `src/app/api/mobile/profiles/route.ts` — returns 410 Gone
- `src/app/api/mobile/quotes/route.ts` — returns 410 Gone
- `src/app/api/mobile/invoices/route.ts` — returns 410 Gone

All three had no authentication and used shared in-memory Maps.

---

## G. Supabase / RLS Fix Plan

**The single SQL file to run:**
```
supabase/sql/security_p0_data_isolation.sql
```

Run this in Supabase SQL Editor. It is idempotent — safe to re-run.

### Tables fixed by this migration:
| Table | Before | After |
|-------|--------|-------|
| `conversations` | `USING(true)` | `workspace_members` scoped |
| `messages` | `USING(true)` | `workspace_members` scoped |
| `message_reactions` | `USING(true)` | Message workspace scoped |
| `crm_history` | No policies | `workspace_members` scoped SELECT |
| `documents` | No policies | `workspace_members` scoped SELECT/INSERT/UPDATE |
| `tool_attachments` | No policies + missing `workspace_id` column | Column added, backfilled, policies added |
| `document_pdf_info` | No policies | `workspace_members` scoped |
| `leads` | Unknown | `workspace_members` scoped |
| `jobs` | Unknown | `workspace_members` scoped |
| `tasks` | Unknown | `workspace_members` scoped |
| `assets` | Unknown | `workspace_members` scoped |
| `clients` | `staff_members`-based (broken) | `workspace_members` scoped |

---

## H. Safe Migration SQL

See: `supabase/sql/security_p0_data_isolation.sql`

Key notes:
- All `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — no data loss
- All `DROP POLICY IF EXISTS` before `CREATE POLICY` — idempotent
- `UPDATE tool_attachments SET workspace_id = business_id WHERE workspace_id IS NULL` — backfill only
- No `DROP TABLE`, no `DELETE`, no `TRUNCATE`
- Wrapped in `BEGIN; ... COMMIT;` transaction

---

## I. Logout / Account-Switch Cleanup Plan

### Website (applied)
1. `POST /api/auth/signout` — clears httpOnly Supabase session cookies ✓
2. `supabase.auth.signOut()` — clears client-side token (localStorage key `sb-*-auth-token`) ✓
3. `WorkspaceContext` listens for `SIGNED_OUT` → `clearAllState()` ✓
4. `clearAllDraftsForUser(userId)` — removes `tissca_tool_draft_{userId}_*` from localStorage ✓ (now applied)

### Android (required)
- Clear Room database (all entity tables)
- Clear SharedPreferences / DataStore (cached tokens, workspace_id, sync timestamps)
- Cancel active Supabase realtime channel subscriptions
- Clear pending offline sync queue

### iOS (required)
- Clear Core Data / Realm persistent store
- Clear Keychain for auth tokens
- Clear UserDefaults for workspace/session data
- Unsubscribe from realtime channels

---

## J. Test Checklist

### Account Isolation Test
```
[ ] 1. On Android: Login as telmo.f.c29@gmail.com
[ ] 2. Create lead "TEST-TELMO-LEAD-001"
[ ] 3. Create job "TEST-TELMO-JOB-001"
[ ] 4. Create tool attachment on the lead
[ ] 5. Send TissChat message in any conversation
[ ] 6. Logout from Android app
[ ]    VERIFY: Room DB cleared, DataStore cleared, no realtime subscription active
[ ] 7. On Android: Login as info@carvalhorenovations.com
[ ]    VERIFY: Zero "TEST-TELMO-*" entities visible
[ ]    VERIFY: TissChat shows only conversations for info@carvalhorenovations.com workspace
[ ]    VERIFY: Stats show 0 leads/jobs (new account)
[ ] 8. Logout from info@carvalhorenovations.com
[ ] 9. Login back as telmo.f.c29@gmail.com
[ ]    VERIFY: "TEST-TELMO-LEAD-001" and job visible again
[ ]    VERIFY: Tool attachment still attached to lead
[ ]   
[ ] 10. Repeat steps 1-9 on iOS
[ ] 11. Repeat steps 1-9 on Website (same browser)
[ ]     VERIFY: After logout on website, tool draft from step 4 is gone
[ ]     VERIFY: After login as second account, Overview stats are 0
[ ]     VERIFY: TissChat shows no conversations from previous account
```

### Supabase Realtime Isolation Test (after SQL migration)
```
[ ] 1. Open two browser tabs logged in as different accounts
[ ] 2. In Tab A: send TissChat message
[ ]    VERIFY: Tab B does NOT receive the message (workspace isolation)
[ ] 3. In Supabase SQL: SELECT * FROM conversations WHERE workspace_id != '{account_A_workspace}';
[ ]    VERIFY: Account A user can only see their own workspace's conversations via RLS
```

### Tool Attachments Test (after SQL migration)
```
[ ] 1. Login as Account A, create a lead
[ ] 2. Attach a General Estimate to the lead
[ ]    VERIFY: tool_attachment row saved with workspace_id = Account A's workspace_id
[ ] 3. Login as Account B
[ ]    VERIFY: GET /api/workspace/tool-attachments returns empty array (not Account A's data)
```

---

## Summary of Changes Made

| File | Type | Change |
|------|------|--------|
| `supabase/sql/security_p0_data_isolation.sql` | SQL (new) | Fixes RLS for 12 tables + adds workspace_id to tool_attachments |
| `src/lib/tools/tool-types.ts` | TypeScript | Draft localStorage keys scoped per user; clearAllDraftsForUser() added |
| `src/components/member/MemberAppShell.tsx` | TypeScript | Logout now calls clearAllDraftsForUser() before navigating |
| `src/app/api/mobile/profiles/route.ts` | TypeScript | Disabled (410 Gone); was unauthenticated in-memory store |
| `src/app/api/mobile/quotes/route.ts` | TypeScript | Disabled (410 Gone); was unauthenticated in-memory store |
| `src/app/api/mobile/invoices/route.ts` | TypeScript | Disabled (410 Gone); was unauthenticated in-memory store |

**Build status:** TypeScript: 0 errors  
**SQL migration:** `supabase/sql/security_p0_data_isolation.sql` — RUN BEFORE NEXT DEPLOY
