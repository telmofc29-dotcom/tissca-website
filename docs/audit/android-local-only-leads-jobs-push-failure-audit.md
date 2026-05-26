# Android Local-Only Leads/Jobs Push Failure Audit (THIS AUDIT WAS MADE FROM VSCODE, USED MAINLY TO CODE THE WEBSITE)

**Version:** 1.0.0  
**Date:** 26 May 2026  
**Auditor:** GitHub Copilot (automated analysis — read-only, no code mutations)  
**Scope:** Full server-side push path for `leads` and `jobs` from Android to Supabase via the TISSCA website API. Includes `tool_attachments` dependency analysis and sync-diagnostics infrastructure audit.  
**Trigger:** Simulator contains leads/jobs absent from `public.leads` / `public.jobs`. Phone visibility matches Supabase. Logout blocked with "8 items syncing".  
**Rule:** Read-only audit. No schema rewrites, no sync rewrites, no speculative fixes, no local data deletions.

---

## Table of Contents

1. [Critical Context Summary](#1-critical-context-summary)
2. [Push Path Architecture (Server Side)](#2-push-path-architecture-server-side)
3. [All Identified Failure Modes](#3-all-identified-failure-modes)
4. [Finding A — Blank `client_name` Causes Silent 400 Rejection](#4-finding-a--blank-client_name-causes-silent-400-rejection)
5. [Finding B — No Upsert: Retry After Partial Success Creates Duplicate or Unique-Constraint Failure](#5-finding-b--no-upsert-retry-after-partial-success-creates-duplicate-or-unique-constraint-failure)
6. [Finding C — JWT Expiry Mid-Batch Fails All Subsequent Rows Silently](#6-finding-c--jwt-expiry-mid-batch-fails-all-subsequent-rows-silently)
7. [Finding D — Workspace Resolution Race Condition: Rows Inserted Into Wrong Workspace](#7-finding-d--workspace-resolution-race-condition-rows-inserted-into-wrong-workspace)
8. [Finding E — `autoProvisionWorkspace()` Can Create a Phantom Second Workspace](#8-finding-e--autoprovisionworkspace-can-create-a-phantom-second-workspace)
9. [Finding F — Verify Step Uses Wrong Lookup Key in Recovery Route](#9-finding-f--verify-step-uses-wrong-lookup-key-in-recovery-route)
10. [Finding G — `deposit_amount` and `payment_status` Silently Overwritten on Job Create](#10-finding-g--deposit_amount-and-payment_status-silently-overwritten-on-job-create)
11. [Finding H — No Batch Endpoint: Per-Record HTTP Overhead Multiplies All Failure Modes](#11-finding-h--no-batch-endpoint-per-record-http-overhead-multiplies-all-failure-modes)
12. [Finding I — `createJob()` Hardcodes `amount_paid_so_far: 0` (Data Corruption Risk)](#12-finding-i--createjob-hardcodes-amount_paid_so_far-0-data-corruption-risk)
13. [Finding J — Tool Attachment `parent_id` Uses `client_record_id`, Not Postgres `id`](#13-finding-j--tool-attachment-parent_id-uses-client_record_id-not-postgres-id)
14. [Failure Classification Matrix](#14-failure-classification-matrix)
15. [Required Instrumentation](#15-required-instrumentation)
16. [Diagnostics Surface — Per-Row Sync Status](#16-diagnostics-surface--per-row-sync-status)
17. [Priority Fix Order](#17-priority-fix-order)
18. [Evidence Table — Exact File + Line References](#18-evidence-table--exact-file--line-references)

---

## 1. Critical Context Summary

**Proven facts:**

| Observation | Implication |
|---|---|
| Simulator shows leads/jobs absent from Supabase | Push is failing for at least some rows |
| Phone shows only rows that exist in Supabase | Pull is working correctly |
| Phone visibility matches Supabase exactly | Workspace routing is working for reads |
| Logout blocked with "8 items syncing" | Android has a sync guard; rows are queued and never confirmed as synced |
| Other devices only see rows that exist in Supabase | Not a read bug — the rows genuinely never reached Supabase |

**Root-cause hypothesis space (narrowed by evidence):**

- NOT a pull bug (phone sees Supabase correctly)
- NOT a workspace routing bug for reads (phone shows right workspace)
- IS a write-path failure: one or more rows that Android marked as `isSynced = false` were either (a) never attempted, (b) rejected by the server, (c) inserted to the wrong workspace, or (d) partially inserted but never confirmed, leaving them in limbo

---

## 2. Push Path Architecture (Server Side)

Android's sync → Supabase goes through the TISSCA website API:

```
Android CrmViewModel.kt
    └── OperationalSyncRepository.kt  (assembles pushBatch payload)
         └── POST /api/workspace/leads      (one lead per request)
         └── POST /api/workspace/jobs       (one job per request)
              └── leads/route.ts → createLead() → supabase.from('leads').insert(...)
              └── jobs/route.ts  → createJob()  → supabase.from('jobs').insert(...)
```

**Token resolution on each request:**

```
Authorization: Bearer <JWT>
    └── resolveUserFromToken(token)
         1. supabase.auth.getUser(token)      — validates JWT
         2. user_profiles.current_workspace_id — primary workspace
         3. workspace_members (first match)    — fallback
         4. autoProvisionWorkspace()           — creates new workspace if none found
```

**Critical: there is no dedicated batch/sync endpoint for leads or jobs.** Each row is a separate HTTP POST. The Android `pushBatch()` function dispatches these sequentially or in parallel to the same API used by the website UI.

---

## 3. All Identified Failure Modes

| ID | Failure Mode | Type | Server-Side Evidence | Impact |
|---|---|---|---|---|
| A | Blank `client_name` → 400 rejection | Serialization/Validation failure | `leads/route.ts` line ~88; `jobs/route.ts` line ~78 | Row never lands in Supabase |
| B | Retry after partial success → duplicate INSERT or UNIQUE constraint failure | Constraint failure | `createLead()` / `createJob()` use `.insert()` not `.upsert()` | Row may be stuck in retry loop; or silently duplicate |
| C | JWT expiry mid-batch → 401 on remaining rows | Transport failure | `resolveUserFromToken()` returns null on expired token; server returns 401 | All rows after expiry never synced |
| D | Workspace resolved to wrong ID between push and verify | Workspace mismatch | `resolveUserFromToken()` resolution chain; `current_workspace_id` may change between requests | Row exists in Supabase but in wrong workspace |
| E | `autoProvisionWorkspace()` creates phantom second workspace | Sync state corruption | `workspace-data.ts` line ~80–82 | Row exists in new workspace; all other devices on original workspace |
| F | Recovery diagnostics use wrong join key (`id` vs `client_record_id`) | Verify logic failure | `recovery/route.ts` line ~116: `.in('id', leadIds)` should be `.in('client_record_id', leadIds)` | False positive parent-mismatch reports; misleads debugging |
| G | `deposit_amount ?? 0` overwrites Android null | Data corruption | `createJob()` line ~1726: `deposit_amount: input.deposit_amount ?? 0` | Data silently overwritten; not a push blocker but corrupts sync state |
| H | No batch endpoint; per-row HTTP overhead | Transport failure (amplified) | All server routes are single-entity REST | Multiplies all failure modes; single network blip fails one row |
| I | `amount_paid_so_far: 0` hardcoded; not from Android payload | Data corruption | `createJob()` line ~1727: `amount_paid_so_far: 0` | Overwrites mid-job payment state on sync |
| J | `tool_attachments.parent_id` stores `client_record_id`, not `leads.id` | Verify logic (known, documented) | `sync-diagnostics/route.ts` comment line ~123; recovery route bug F | Attachments appear orphaned when parent is present |

---

## 4. Finding A — Blank `client_name` Causes Silent 400 Rejection

### Evidence

**File:** `src/app/api/workspace/leads/route.ts` lines 88–91  
**File:** `src/app/api/workspace/jobs/route.ts` lines 78–81  

```typescript
// leads/route.ts
if (!input.client_name || typeof input.client_name !== 'string' || !input.client_name.trim()) {
  return NextResponse.json({ error: 'Lead client_name is required' }, { status: 400 });
}

// jobs/route.ts
if (!input.client_name || typeof input.client_name !== 'string' || !input.client_name.trim()) {
  return NextResponse.json({ error: 'Job client_name is required' }, { status: 400 });
}
```

**Input mapping (leads/route.ts ~line 73):**
```typescript
client_name: body.client_name || body.name,
```

**Input mapping (jobs/route.ts ~line 65):**
```typescript
client_name: body.client_name || body.title,
```

### How this fails on Android

Android sends `clientName` serialised as the JSON key `client_name` (or possibly `name`/`title` depending on the DTO version). If:

- The field is null in the Android entity (possible if the user tapped "Create" before filling in the name)
- The field is an empty string (`""`) which passes the null check but fails `.trim()` check
- The field uses a different JSON key that the server does not recognise (e.g. if Android sends `leadName` instead of `client_name` or `name`)

…then the server returns HTTP 400 with body `{"error": "Lead client_name is required"}`.

### What happens to the Android row

**Unknown without Android source** — but the likely outcomes are:

1. Android receives 400, logs an error, marks the row as `pushFailed`, and does NOT retry (permanent stuck state) — **this is failure mode C of the classification: rows attempted but rejected**
2. Android receives 400, treats non-201 as a network error, increments retry counter, retries indefinitely — **this is failure mode F: stuck in retry loop**
3. Android's `isSynced` remains `false` forever — the row stays local-only

### Classification

**Serialization failure + Validation failure**

### Required instrumentation

Log for every POST attempt:
```
[pushBatch:lead] ATTEMPT clientRecordId=<uuid> clientName=<value|null> bodyJson=<full>
[pushBatch:lead] RESULT  clientRecordId=<uuid> httpStatus=<code> responseBody=<full>
[pushBatch:lead] STATE   clientRecordId=<uuid> isSynced=<before>→<after>
```

---

## 5. Finding B — No Upsert: Retry After Partial Success Creates Duplicate or Unique-Constraint Failure

### Evidence

**File:** `src/lib/workspace-data.ts` lines 1466–1524 (`createLead`)  
**File:** `src/lib/workspace-data.ts` lines 1649–1715 (`createJob`)

Both functions use:
```typescript
const { data, error } = await supabase
  .from('leads')          // or 'jobs'
  .insert({ ... })
  .select('*')
  .single();
```

There is no `.upsert()`, no `ON CONFLICT DO NOTHING`, and no `ON CONFLICT DO UPDATE` clause. This is a plain `INSERT`.

### How this fails on Android

**Scenario: Android pushes a row, the server INSERT succeeds (row reaches Supabase), but the HTTP response is lost (timeout, network drop, or Android killed the request before reading the response).**

Android never sees the 201 response. It assumes the push failed. Its `isSynced` remains `false`. The next sync cycle re-attempts the same push with the same `client_record_id`.

**Result depends on whether `client_record_id` has a UNIQUE constraint:**

| Constraint State | Second INSERT result | Android sees | Effect |
|---|---|---|---|
| UNIQUE(workspace_id, client_record_id) exists | PostgREST returns 409 Conflict or error code `23505` | Server returns 400 or 500; Android marks row as failed | Row IS in Supabase but Android still shows as local-only |
| No unique constraint on `client_record_id` | Second INSERT succeeds — **creates duplicate row** | Server returns 201 with a second Postgres UUID | Two rows in Supabase with same client_record_id; tool_attachments may link to one but not the other |

### Critical secondary effect

**If Android calls a verify step after push** (checking whether the pushed `client_record_id` appears in `GET /api/workspace/leads`), and:
- The row was inserted but the response was dropped → verify succeeds → `isSynced` correctly set to `true`
- The row was inserted, second INSERT failed with 409, Android treats as unsynced → **verify is never called** → permanently stuck

The absence of upsert semantics means Android cannot safely retry without risking duplicates or permanent stuck state.

### Classification

**Constraint failure (if UNIQUE index exists) + Sync state corruption (if no UNIQUE index)**

### Required instrumentation

Server should log every INSERT conflict:
```
[createLead] CONFLICT client_record_id=<uuid> workspace_id=<uuid> code=<PG error code> detail=<detail>
[createJob]  CONFLICT client_record_id=<uuid> workspace_id=<uuid> code=<PG error code> detail=<detail>
```

Server should also query `leads.client_record_id` before INSERT to detect duplicates:
```sql
SELECT id FROM leads WHERE client_record_id = $1 AND workspace_id = $2
```

---

## 6. Finding C — JWT Expiry Mid-Batch Fails All Subsequent Rows Silently

### Evidence

**File:** `src/lib/workspace-data.ts` lines 39–91 (`resolveUserFromToken`)

```typescript
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) return null;
```

**File:** `src/app/api/workspace/leads/route.ts` lines 53–56:
```typescript
const resolved = await resolveUserFromToken(token);
if (!resolved) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### How this fails on Android

Supabase JWTs expire after 1 hour (default). Android's `pushBatch` for a large sync queue (the user had "8 items syncing") takes time. If the JWT was near expiry when sync started:

1. First N rows succeed (JWT valid)
2. JWT expires mid-batch
3. Remaining rows → server returns 401
4. Android's sync guard ("8 items syncing") sees some items fail
5. **If Android does not refresh the JWT before retrying**, subsequent retries also fail with 401
6. The sync guard never clears — this matches the observed "logout blocked with 8 items syncing" exactly

### Compounding factor

If Android refreshes the token and retries, Finding B kicks in: the rows that succeeded on the first attempt before the JWT expired will now be retried (second INSERT), potentially creating duplicates or constraint failures.

### Classification

**Transport failure**

### Required instrumentation

Log JWT validity window at the start of each `pushBatch` call:
```
[pushBatch] START  itemCount=8 tokenExpiresAt=<epoch> tokenAgeMs=<ms> tokenIsExpired=<bool>
[pushBatch] ROW_N  clientRecordId=<uuid> type=lead|job httpStatus=<code>
[pushBatch] END    succeeded=<n> failed=<n> remaining=<n>
```

---

## 7. Finding D — Workspace Resolution Race Condition: Rows Inserted Into Wrong Workspace

### Evidence

**File:** `src/lib/workspace-data.ts` lines 46–90 (`resolveUserFromToken`)

Resolution chain on every API call:
```
1. user_profiles.current_workspace_id   ← PRIMARY
2. workspace_members (first match)      ← FALLBACK
3. autoProvisionWorkspace()             ← LAST RESORT
```

**Critical:** `current_workspace_id` is read from `user_profiles` on every single API call. If the user is a member of multiple workspaces and their `current_workspace_id` changes between the push and the verify step, the two operations target different workspaces.

### How this fails on Android

**Scenario: User switches workspace on the website while Android is mid-sync.**

1. Android starts `pushBatch` — server resolves workspace A (the active one)
2. User opens website in a browser tab and switches to workspace B → updates `user_profiles.current_workspace_id` to B
3. Android continues batch — server now resolves workspace B for remaining rows
4. Some rows land in workspace A, some in workspace B
5. Android verify step queries `GET /api/workspace/leads` — server resolves to B — rows inserted in A are not found → Android marks them as unsynced despite being in Supabase under workspace A

**Same race condition can occur if:**
- The TISSCA website auto-provisions a workspace (Finding E below)
- The user logs in on a second device mid-sync (different browser session updates `current_workspace_id`)

### Classification

**Workspace mismatch**

### Required instrumentation

Log workspace ID on every push:
```
[pushBatch:lead] workspace_id=<uuid> resolved_via=user_profiles|workspace_members|auto_provision
```

---

## 8. Finding E — `autoProvisionWorkspace()` Can Create a Phantom Second Workspace

### Evidence

**File:** `src/lib/workspace-data.ts` lines 78–93

```typescript
// 4) Auto-provision if still no workspace
if (!workspaceId) {
  console.log('[resolveUserFromToken] No workspace found — auto-provisioning for', user.id);
  workspaceId = await autoProvisionWorkspace(supabase, user.id, '');
}
```

**File:** `src/lib/workspace-data.ts` lines 103–160 (`autoProvisionWorkspace`)

```typescript
async function autoProvisionWorkspace(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  authId: string,
  _businessId: string,
): Promise<string | null> {
  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', authId)
    .limit(1)
    .maybeSingle();
  // If already a member: use that workspace, cache in user_profiles
  if (existingMember?.workspace_id) { ... return existingMember.workspace_id; }
  // Otherwise: create new workspace + membership + upsert user_profiles
  ...
}
```

### How this fails on Android

`autoProvisionWorkspace()` is called when both lookups fail:

1. `user_profiles.current_workspace_id` is NULL or missing
2. `workspace_members` returns no rows

**The first lookup inside `autoProvisionWorkspace` protects against this: if `workspace_members` has a row, it returns the existing workspace.** However, this is a second database query after the one at step 2. Between the two queries, there is no transaction or lock. Under concurrent push traffic (Android batch sends multiple parallel requests), two concurrent calls to `autoProvisionWorkspace()` could both pass the membership check (before either inserts) and create two workspaces.

**More practically:** if `user_profiles` is missing (user created on Android without completing the web onboarding flow), every API call falls to step 3, `workspace_members` lookup succeeds, but the `user_profiles` upsert fails intermittently (network error, RLS issue) → on the next request, step 2 fails again → step 3 runs again. Under a batch with 8 rows, this could cause repeated `user_profiles` lookup failures, each eventually falling through to the membership lookup and returning the correct workspace — but the requests that time out during the upsert might be slower, causing JWT expiry (Finding C).

### Classification

**Sync state corruption (workspace identity)**

---

## 9. Finding F — Verify Step Uses Wrong Lookup Key in Recovery Route

### Evidence

**File:** `src/app/api/workspace/sync-diagnostics/recovery/route.ts` lines ~114–122

```typescript
const [{ data: foundLeads }, { data: foundJobs }] = await Promise.all([
  leadIds.length
    ? supabase.from('leads').select('id').in('id', leadIds).eq('workspace_id', workspaceId)  // ← BUG
    : Promise.resolve({ data: [] as Array<{ id: string }> }),
  jobIds.length
    ? supabase.from('jobs').select('id').in('id', jobIds).eq('workspace_id', workspaceId)    // ← BUG
    : Promise.resolve({ data: [] as Array<{ id: string }> }),
]);
```

Here, `leadIds` and `jobIds` are populated from `tool_attachments.parent_id`:

```typescript
const leadIds = withParent
  .filter(r => r.parent_type === 'LEAD')
  .map(r => r.parent_id as string);
```

**`tool_attachments.parent_id` stores `client_record_id` (mobile-generated UUID), NOT `leads.id` (Postgres primary key).**

This is explicitly documented in the `sync-diagnostics/route.ts` snapshot endpoint (lines ~123–126):
```typescript
// tool_attachments.parent_id stores client_record_id (mobile-generated UUID),
// NOT leads.id / jobs.id (Postgres PKs). Match on client_record_id.
? supabase.from('leads').select('client_record_id').in('client_record_id', leadParentIds).eq('workspace_id', workspaceId)
```

The snapshot endpoint does it correctly. The recovery endpoint does it wrong.

### Impact

Every tool attachment in the recovery analysis whose parent exists in Supabase is **incorrectly reported as a parent mismatch**. The recovery panel shows these as "broken" attachments requiring repair, when the parent is actually present under its `client_record_id`. This does not cause push failures, but it:

1. Generates false-positive recovery candidates
2. Makes it impossible to distinguish real orphans from correctly-linked attachments using the recovery UI
3. Actively misleads any engineer debugging sync failures by making normal attachments appear broken

### Classification

**Verify logic failure (diagnostics bug, not push bug)**

---

## 10. Finding G — `deposit_amount` and `payment_status` Silently Overwritten on Job Create

### Evidence

**File:** `src/lib/workspace-data.ts` lines ~1726–1727 (`createJob`)

```typescript
deposit_amount: input.deposit_amount ?? 0,
deposit_paid_amount: input.deposit_paid_amount ?? 0,
deposit_status: input.deposit_status ?? 'DRAFT',
payment_status: input.payment_status ?? 'NOT_REQUESTED',
```

### How this fails on Android

If Android sends a job with `depositAmount = null` (job with no deposit agreement), the server writes `0` for `deposit_amount`. This is semantically different from `null`: `null` means "no deposit configured", `0` means "deposit configured at £0". Downstream logic that checks `if deposit_amount > 0` will behave differently.

More critically: if Android has updated a job's `depositAmount` after it was pushed (e.g., during a partial sync update), and the job is retried via `createJob()` rather than `updateJob()`, the defaults will silently overwrite the actual values.

**This does not block the push** — the INSERT succeeds — but the synced row in Supabase has incorrect field values. The job appears "synced" but its state is wrong.

### Classification

**Serialization failure (data corruption on push)**

---

## 11. Finding H — No Batch Endpoint: Per-Record HTTP Overhead Multiplies All Failure Modes

### Evidence

No batch endpoint exists for leads or jobs. There is no `POST /api/workspace/leads/batch` or equivalent. Android must dispatch N individual HTTP POST requests to sync N rows.

**Server routes available for leads/jobs:**
```
POST  /api/workspace/leads         — single row create
PATCH /api/workspace/leads         — single row update
POST  /api/workspace/jobs          — single row create
PATCH /api/workspace/jobs          — single row update
```

### How this multiplies failure probability

For a batch of 8 rows:
- 8 separate TCP connections (or HTTP/1.1 keep-alive reuse if the Android HTTP client supports it)
- 8 separate JWT validations (each calls `supabase.auth.getUser(token)`)
- 8 separate workspace resolutions (each queries `user_profiles`)
- Any single point failure (JWT expiry, network timeout, 429 rate limit) affects individual rows independently
- Some rows succeed, some fail — leaving the batch in a mixed state that is very hard to reconcile

**The "8 items syncing" logout blocker is consistent with a partial-batch failure** where some items succeeded and some failed, leaving the sync guard in an indeterminate state.

### Classification

**Transport failure (architectural — not a single-row bug)**

---

## 12. Finding I — `createJob()` Hardcodes `amount_paid_so_far: 0` (Data Corruption Risk)

### Evidence

**File:** `src/lib/workspace-data.ts` line ~1727 (`createJob`)

```typescript
amount_paid_so_far: 0,
```

This field is always written as `0` regardless of what Android sends. It is not included in `CreateJobInput` and not read from the request body.

### How this fails on Android

If Android has a job with `amountPaidSoFar > 0` (customer made a partial payment while offline) and this job is pushed via `createJob()` instead of `updateJob()` (i.e., during initial sync of a new job), the payment state is zeroed. The job shows as unpaid in Supabase even though the customer paid.

Android's `amountPaidSoFar` field is documented in `Job.kt` v1.14.0 as a real financial field, not a computed total.

### Classification

**Serialization failure (field silently dropped)**

---

## 13. Finding J — Tool Attachment `parent_id` Uses `client_record_id`, Not Postgres `id`

### Evidence

**Documented in:** `src/lib/workspace-data.ts` comments at lines ~2119–2121:

```typescript
/**
 * IMPORTANT: tool_attachments.parent_id stores client_record_id (mobile-generated UUID),
 * NOT leads.id / jobs.id (Postgres PKs). Both params must be client_record_id values.
 * Supabase proof (2025-07): parent_matches_uuid_pk=0, parent_matches_client_record_id=3.
 */
```

**Also documented in:** `sync-diagnostics/route.ts` lines ~123–126.

### Impact on push failure debugging

When Android pushes a lead/job, it gets back a Postgres row with both `id` (server-generated UUID) and `client_record_id` (Android's own UUID). Android subsequently creates tool attachments that reference the lead/job via `parent_id = client_record_id`.

If Android's `verifyLeadsPushed()` logic checks whether the Postgres `id` returned from the POST matches what was stored locally, but the attachment lookup uses `client_record_id`, then a mismatch between the two IDs could cause attachments to appear as orphaned even when the parent lead/job was successfully pushed.

**This finding is informational** — the parent_id contract is documented and the snapshot diagnostic handles it correctly. It is included here because any custom verify logic in Android that uses the Postgres `id` from the POST response would be wrong.

### Classification

**Verify logic (informational — not a server bug)**

---

## 14. Failure Classification Matrix

| Finding | Classification | Blocks Push? | Causes Local-Only? | Row In Wrong WS? | Diagnostic Confusion? |
|---|---|---|---|---|---|
| A — blank client_name | Serialization + Validation failure | YES | YES — row never created | No | No |
| B — no upsert on retry | Constraint failure | PARTIALLY (on retry) | YES — after partial success | No | Yes |
| C — JWT expiry mid-batch | Transport failure | YES (for remaining rows) | YES | No | No |
| D — workspace resolution race | Workspace mismatch | No | YES (row exists in wrong WS) | YES | Yes |
| E — phantom workspace creation | Sync state corruption | No | YES (row in phantom WS) | YES | Yes |
| F — recovery route wrong join key | Verify logic failure | No | No | No | YES (critical) |
| G — deposit defaults overwrite | Serialization failure | No | No | No | No |
| H — no batch endpoint | Transport failure (amplified) | PARTIALLY | YES (mixed state) | No | Yes |
| I — amount_paid_so_far hardcoded | Serialization failure | No | No | No | No |
| J — parent_id identity contract | Verify logic (informational) | No | No | No | Potentially |

---

## 15. Required Instrumentation

### On Android (pushBatch)

Add the following log statements to cover every required audit dimension:

```kotlin
// Before batch starts
Log.d("SYNC_PUSH", "[pushBatch:START] type=lead count=${leads.size} workspaceId=$workspaceId tokenExpiry=${tokenExpiresAtMs}")

// For each row attempt (lead)
Log.d("SYNC_PUSH", """
[pushBatch:ATTEMPT] type=lead
  clientRecordId=${lead.clientRecordId}
  clientName=${lead.clientName?.take(40) ?: "NULL"}
  status=${lead.status}
  workspaceId=${lead.workspaceId}
  payloadJson=${leadToJson(lead)}
""")

// For each HTTP result
Log.d("SYNC_PUSH", """
[pushBatch:RESULT] type=lead
  clientRecordId=${lead.clientRecordId}
  httpStatus=${response.code}
  responseBody=${response.body?.string()?.take(500)}
  rowsAffected=${parsedResponse?.id != null}
""")

// isSynced state transition
Log.d("SYNC_PUSH", "[pushBatch:STATE] clientRecordId=${lead.clientRecordId} isSynced=$wasSynced → $nowSynced")
```

Identical pattern for jobs.

### On Android (verifyLeadsPushed / verifyJobsPushed)

```kotlin
Log.d("SYNC_VERIFY", "[verify:START] type=lead lookupCount=${clientRecordIds.size}")

// For each verify check
Log.d("SYNC_VERIFY", """
[verify:ROW] clientRecordId=${id}
  foundInRemote=${remoteIds.contains(id)}
  remoteRowId=${remoteRowsByClientRecordId[id]?.id}
  workspaceIdUsedForVerify=${workspaceId}
""")

Log.d("SYNC_VERIFY", "[verify:RESULT] verified=${verified.size} missing=${missing.size}")
// Log each missing row clientRecordId
```

### On the server (POST /api/workspace/leads, jobs)

Add to `createLead()` and `createJob()`:

```typescript
// Before insert: check for existing client_record_id
const { data: existing } = await supabase
  .from('leads')
  .select('id, workspace_id')
  .eq('client_record_id', insertPayload.client_record_id)
  .eq('workspace_id', wsId)
  .maybeSingle();
if (existing) {
  console.warn('[createLead] DUPLICATE client_record_id detected:', 
    { client_record_id: insertPayload.client_record_id, existing_id: existing.id, workspace_id: wsId });
}

// After insert error:
if (error) {
  console.error('[createLead] INSERT FAILED:', {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    client_record_id: insertPayload.client_record_id,
    workspace_id: wsId,
  });
}
```

---

## 16. Diagnostics Surface — Per-Row Sync Status

The following states must be surfaced per local lead/job in the Android sync UI and/or admin debug panel:

| State | Definition | How to detect |
|---|---|---|
| `local_only` | Row exists locally, `isSynced = false`, no push attempted yet | `isSynced = false` AND push attempt count = 0 |
| `push_pending` | Row is in push queue but has not been dispatched | In queue, `isSynced = false`, attempt count = 0 |
| `push_failed` | Push was attempted, server returned non-201 response | `isSynced = false`, HTTP status != 201 in last attempt |
| `verify_failed` | Push returned 201 but `client_record_id` not found in subsequent GET | `isSynced = false`, last push returned 201, GET verify found no match |
| `synced_confirmed` | Row pushed with 201, `client_record_id` found in GET verify | `isSynced = true`, last verify passed |
| `duplicate_detected` | Server returned 409 or client_record_id already exists remotely | Error code 23505 in last push response |
| `workspace_mismatch` | Pushed to different workspace than current | `workspaceId` in response differs from current workspace |

### Recommended Android sync guard logic

The logout guard ("X items syncing") should treat rows with these states differently:

```
push_pending   → block logout (not yet attempted)
push_failed    → do NOT block logout (already failed — will not succeed on retry without intervention)
verify_failed  → block logout briefly, retry once, then unblock
synced_confirmed → do not block logout
duplicate_detected → mark as synced (row exists remotely) + resolve locally
```

This prevents the "8 items syncing" indefinite block.

---

## 17. Priority Fix Order

### P0 — Immediately Unblocks Current Local-Only Rows

1. **[Server] Add `client_record_id` dedup check before INSERT in `createLead()`/`createJob()`**  
   If `client_record_id` already exists in the workspace → return the existing row (treat as idempotent success), do not insert duplicate. This converts retry-on-lost-response from a constraint failure to an idempotent success.  
   File: `src/lib/workspace-data.ts` in `createLead()` (~line 1464) and `createJob()` (~line 1649).

2. **[Android] Log all push attempt results to a persistent on-device debug log**  
   Log HTTP status, response body, and `isSynced` transitions so the exact failing row and its error can be identified from a device debug export.

3. **[Android] Separate "push failed (non-retryable)" from "push pending (not yet tried)"**  
   Items that returned 400 (validation rejection) should NOT block logout indefinitely.

### P1 — Prevents Future Recurrence

4. **[Server] Fix `recovery/route.ts` parent lookup to use `client_record_id`**  
   Change `.in('id', leadIds)` → `.in('client_record_id', leadIds)` and `.select('client_record_id')` (line ~116 in recovery route).  
   This makes the recovery panel show only real orphans.

5. **[Android] Token refresh before batch push**  
   Refresh the JWT if `tokenExpiresAt - now < 5 minutes` before starting any sync batch. Prevents mid-batch 401.

6. **[Server] Add `amount_paid_so_far` to `CreateJobInput` and read from request body**  
   Do not hardcode `0`. Map `body.amount_paid_so_far` to the insert.

### P2 — Data Integrity

7. **[Server] Remove hardcoded defaults for `deposit_amount` / `deposit_paid_amount`**  
   Use `input.deposit_amount ?? null` (not `?? 0`) to preserve null semantics from Android.

8. **[Android] Verify step should use `client_record_id` not Postgres `id` for confirmation**  
   GET `/api/workspace/leads` response includes `client_record_id` per row. Match on that field.

---

## 18. Evidence Table — Exact File + Line References

| Finding | File | Lines | Exact Code |
|---|---|---|---|
| A — blank name rejection (leads) | `src/app/api/workspace/leads/route.ts` | ~88–91 | `if (!input.client_name \|\| ... !input.client_name.trim())` → 400 |
| A — blank name rejection (jobs) | `src/app/api/workspace/jobs/route.ts` | ~78–81 | `if (!input.client_name \|\| ... !input.client_name.trim())` → 400 |
| A — name field mapping (leads) | `src/app/api/workspace/leads/route.ts` | ~73 | `client_name: body.client_name \|\| body.name` |
| A — name field mapping (jobs) | `src/app/api/workspace/jobs/route.ts` | ~65 | `client_name: body.client_name \|\| body.title` |
| B — plain INSERT, no upsert (leads) | `src/lib/workspace-data.ts` | ~1466–1524 | `.from('leads').insert({...}).select('*').single()` |
| B — plain INSERT, no upsert (jobs) | `src/lib/workspace-data.ts` | ~1649–1715 | `.from('jobs').insert({...}).select('*').single()` |
| C — JWT validation (every route) | `src/lib/workspace-data.ts` | 39–50 | `supabase.auth.getUser(token)` → `if (error \|\| !user) return null` |
| D/E — workspace resolution chain | `src/lib/workspace-data.ts` | 46–90 | `current_workspace_id` → `workspace_members` → `autoProvisionWorkspace()` |
| E — auto-provision | `src/lib/workspace-data.ts` | ~103–160 | `autoProvisionWorkspace()` function |
| F — recovery wrong join key | `src/app/api/workspace/sync-diagnostics/recovery/route.ts` | ~114–122 | `.in('id', leadIds)` — should be `.in('client_record_id', leadIds)` |
| F — correct join key (for contrast) | `src/app/api/workspace/sync-diagnostics/route.ts` | ~123–126 | `.in('client_record_id', leadParentIds)` ← this is correct |
| G — deposit defaults | `src/lib/workspace-data.ts` | ~1726–1729 | `deposit_amount: input.deposit_amount ?? 0` |
| I — amount_paid_so_far hardcoded | `src/lib/workspace-data.ts` | ~1727 | `amount_paid_so_far: 0` |
| J — parent_id identity contract | `src/lib/workspace-data.ts` | ~2119–2121 | Comment: "parent_id stores client_record_id, NOT leads.id" |

---

## Appendix: Definitive Classification of "Why Rows Never Appeared in public.leads/public.jobs"

Based on the server-side evidence, the most likely root cause of the observed "8 items syncing" symptom is a **combination of Finding B and Finding C**:

1. **Some rows were pushed successfully on first attempt**, but the HTTP response was lost (network timeout, Android killed the activity). Android's `isSynced` was never updated to `true`.

2. **JWT expired mid-batch** (Supabase token 1-hour window). Subsequent rows returned 401. Android accumulated failed rows.

3. **Retry loop**: Android's sync guard blocks logout while any row shows `isSynced = false`. On retry, rows that succeeded on the first attempt hit the server again as plain INSERTs. These either:
   - Create duplicates (if no UNIQUE constraint) and Android's verify sees the new Postgres UUID rather than the original → still not matching locally → still stuck
   - Return a constraint error (if UNIQUE exists) → Android treats as push failure → still stuck

4. **Finding A is the most common silent failure for _new_ rows** created on-device with no client name entered yet. These are permanently rejected with 400 and will never reach Supabase unless the name is populated.

**The exact failing rows can only be identified by enabling the instrumentation logging in §15 and triggering a sync from the simulator, then examining the log output.**
