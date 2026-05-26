# Website: Tool Attachment `client_record_id` Contract Fix

**Date:** 2025-07-15  
**Status:** COMPLETE — build passes, all joins corrected  
**Companion audit:** `docs/audit/tissca-cross-platform-identity-contract-audit.md`

---

## 1. The Problem

Every file on the website that looked up `tool_attachments` for a lead or job was using the
**Postgres primary key** (`leads.id` / `jobs.id`) as the match key against
`tool_attachments.parent_id`.

Android never writes `leads.id` into `parent_id`. It writes `leads.client_record_id` — the
mobile-generated UUID that is the **canonical cross-platform identity** for all CRM entities.

### Live Supabase Proof

```sql
SELECT
  COUNT(*) FILTER (WHERE ta.parent_id = e.id)                AS parent_matches_uuid_pk,
  COUNT(*) FILTER (WHERE ta.parent_id = e.client_record_id)  AS parent_matches_client_record_id
FROM tool_attachments ta
JOIN leads e ON e.workspace_id = ta.workspace_id;
```

| parent_matches_uuid_pk | parent_matches_client_record_id |
|------------------------|----------------------------------|
| 0                      | 3                                |

Zero tool attachments were linked via the Postgres PK. All live attachments were linked via
`client_record_id`. The website's joins were therefore always returning empty sets.

---

## 2. The Rule (post-fix)

| Operation | Key to use |
|-----------|-----------|
| `tool_attachments.parent_id` — read/write | `entity.client_record_id` |
| `updateLead` / `updateJob` — read/write | `entity.id` (Postgres PK) |
| `reassignToolAttachmentsToJob` | both sides: `client_record_id` |
| `sumToolAttachmentTotals` | `client_record_id` |
| `sync-diagnostics` mismatch check | `client_record_id` |

If only the Postgres `id` is available, fetch the entity first and translate to
`client_record_id`. Two helpers (`lookupLeadByClientRecordId`, `lookupJobByClientRecordId`)
were added to `workspace-data.ts` to support this bridge.

---

## 3. False Assumptions Also Fixed

### 3a. `leads` / `jobs` have no `created_at` / `updated_at` ISO columns

The live schema has only `created_at_millis: number` and `updated_at_millis: number`.
`leads/page.tsx` had a local `Lead` type with `created_at: string` and `updated_at: string`,
causing `undefined` values at runtime when those fields were displayed.

**Fix:** Changed the local type to `created_at_millis: number | null` and
`updated_at_millis: number | null`, and updated the display from
`formatDate(lead.updated_at)` to `new Date(lead.updated_at_millis!).toLocaleDateString(...)`.

### 3b. `jobs` has no `source_lead_id` column

Searched the entire codebase — `source_lead_id` does not exist in any TypeScript file and is
not a column in `JobRow`. The correct FK is `lead_id: string | null` (points to `leads.id`).
No code change required; this was a red herring.

---

## 4. Files Changed

### 4a. `src/lib/workspace-data.ts`

| Location | Before | After |
|----------|--------|-------|
| `createLead` insert | `client_record_id` not set | `client_record_id: input.client_record_id ?? crypto.randomUUID()` |
| `createJob` insert | `client_record_id` not set | `client_record_id: input.client_record_id ?? crypto.randomUUID()` |
| `reassignToolAttachmentsToJob` signature | `(resolved, leadId, jobId)` (Postgres PKs) | `(resolved, leadClientRecordId, jobClientRecordId)` |
| `reassignToolAttachmentsToJob` query | `.eq('parent_id', leadId)` | `.eq('parent_id', leadClientRecordId)` |
| `reassignToolAttachmentsToJob` update | `parent_id: jobId` | `parent_id: jobClientRecordId` |
| `sumToolAttachmentTotals` comment | silent | IMPORTANT: entityId must be `client_record_id`, NOT Postgres PK |
| NEW: `lookupLeadByClientRecordId` | — | Looks up `leads.id` given `leads.client_record_id` |
| NEW: `lookupJobByClientRecordId` | — | Looks up `jobs.id` given `jobs.client_record_id` |

---

### 4b. `src/app/api/workspace/leads/[id]/convert/route.ts`

Three tool_attachments interactions fixed to use `lead.client_record_id`:

**Fix 1 — `sumToolAttachmentTotals`:**
```typescript
// BEFORE (wrong — uses Postgres PK):
const { subtotal: toolTotalValue } = await sumToolAttachmentTotals(resolved, 'lead', leadId);

// AFTER (correct — uses client_record_id):
const leadCrId = lead.client_record_id as string | null;
const { subtotal: toolTotalValue } = leadCrId
  ? await sumToolAttachmentTotals(resolved, 'lead', leadCrId)
  : { subtotal: 0 };
```

**Fix 2 — direct `tool_attachments` query (deposit/discount extraction):**
```typescript
// BEFORE:
const { data: attachments } = await supabase.from('tool_attachments')
  .select('raw_payload').eq('parent_id', leadId).eq('workspace_id', workspaceId);

// AFTER:
const { data: attachments } = leadCrId
  ? await supabase.from('tool_attachments').select('raw_payload')
      .eq('parent_id', leadCrId).eq('workspace_id', workspaceId)
  : { data: [] };
```

**Fix 3 — `reassignToolAttachmentsToJob`:**
```typescript
// BEFORE:
const { count } = await reassignToolAttachmentsToJob(resolved, leadId, job.id);

// AFTER:
const jobCrId = job.client_record_id as string | null;
let reassigned = 0;
if (leadCrId && jobCrId) {
  const { count } = await reassignToolAttachmentsToJob(resolved, leadCrId, jobCrId);
  reassigned = count;
}
```

---

### 4c. `src/app/api/workspace/tool-attachments/route.ts`

Import updated to include lookup helpers:
```typescript
import {
  ..., sumToolAttachmentTotals, updateLead, updateJob,
  lookupLeadByClientRecordId, lookupJobByClientRecordId,
} from '@/lib/workspace-data';
```

All three recalculation paths (POST / PATCH / DELETE) fixed. Pattern for each:

```typescript
// BEFORE (wrong — resolvedParentId / data.parent_id / existing.parent_id is client_record_id,
//         but was passed directly to updateLead/updateJob which expect the Postgres PK):
if (entityType === 'lead') {
  await updateLead(resolved, resolvedParentId, { estimated_value: subtotal });
}

// AFTER (correct — look up Postgres PK before updating):
const entityPkId = entityType === 'lead'
  ? await lookupLeadByClientRecordId(resolved, resolvedParentId)
  : await lookupJobByClientRecordId(resolved, resolvedParentId);
if (entityPkId) {
  if (entityType === 'lead') {
    await updateLead(resolved, entityPkId, { estimated_value: subtotal });
  } else {
    await updateJob(resolved, entityPkId, { job_value: subtotal });
  }
}
```

---

### 4d. `src/app/(member)/app/leads/[id]/page.tsx`

**Fix 1 — `Lead` type:** added `client_record_id: string | null`.

**Fix 2 — tool card filter:**
```typescript
// BEFORE (wrong — leadId is the URL param = leads.id Postgres PK):
setToolCards(allCards.filter((c: ToolCardSummary) => c.parent_id === leadId));

// AFTER (correct — filter by client_record_id):
setToolCards(found.client_record_id
  ? allCards.filter((c: ToolCardSummary) => c.parent_id === found.client_record_id)
  : []);
```

---

### 4e. `src/app/(member)/app/leads/page.tsx`

**Fix 1 — `Lead` type:** three changes:
```typescript
// BEFORE:
client_record_id field missing
created_at: string;   // FALSE — column does not exist
updated_at: string;   // FALSE — column does not exist

// AFTER:
client_record_id: string | null;
created_at_millis: number | null;
updated_at_millis: number | null;
```

**Fix 2 — tool attachment filter:**
```typescript
// BEFORE:
const leadAttachments = toolAttachments.filter((a) => a.parent_id === editingLead.id);

// AFTER:
const leadAttachments = toolAttachments.filter((a) => a.parent_id === editingLead.client_record_id);
```

**Fix 3 — date display:**
```typescript
// BEFORE (runtime undefined — column does not exist):
<span>Updated {formatDate(lead.updated_at)}</span>

// AFTER:
{(lead.updated_at_millis ?? 0) > 0 && (
  <span>Updated {new Date(lead.updated_at_millis!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
)}
```

---

### 4f. `src/components/tools/TradeToolForm.tsx`

**Fix 1 — picker types:**
```typescript
// BEFORE:
type PickerLead = { id: string; client_name: string | null; status: string; estimated_value: number | null };
type PickerJob  = { id: string; client_name: string | null; status: string; job_value: number | null };

// AFTER:
type PickerLead = { ...; client_record_id: string | null };
type PickerJob  = { ...; client_record_id: string | null };
```

**Fix 2 — picker mappings:** `openLeadPicker()` and `openJobPicker()` now include
`client_record_id: l.client_record_id as string | null`.

**Fix 3 — attachment creation:**
```typescript
// BEFORE:
const ok = await createAttachment({ parent_id: lead.id, parent_type: 'LEAD' });
const ok = await createAttachment({ parent_id: job.id,  parent_type: 'JOB' });

// AFTER:
const ok = await createAttachment({ parent_id: lead.client_record_id ?? lead.id, parent_type: 'LEAD' });
const ok = await createAttachment({ parent_id: job.client_record_id  ?? job.id,  parent_type: 'JOB' });
```

---

### 4g. `src/app/(member)/app/tools/general/page.tsx`

Identical pattern to `TradeToolForm.tsx` — same three fixes applied:
- `PickerLead` / `PickerJob` types extended with `client_record_id: string | null`
- `openLeadPicker` / `openJobPicker` mappings include `client_record_id`
- `createAttachment` calls use `lead.client_record_id ?? lead.id` / `job.client_record_id ?? job.id`

---

### 4h. `src/app/api/workspace/sync-diagnostics/route.ts`

`parent_mismatch_count` calculation was checking `parent_id` against `leads.id` / `jobs.id`:

```typescript
// BEFORE (wrong — joins on Postgres PK):
supabase.from('leads').select('id').in('id', leadIds).eq('workspace_id', workspaceId)
const foundLeadSet = new Set((foundLeads ?? []).map(r => r.id));

// AFTER (correct — joins on client_record_id):
supabase.from('leads').select('client_record_id').in('client_record_id', leadParentIds).eq('workspace_id', workspaceId)
const foundLeadSet = new Set((foundLeads ?? []).map(r => r.client_record_id).filter(Boolean));
```

Same fix applied to the `jobs` query.

---

## 5. No-change Files

| File | Reason |
|------|--------|
| `src/app/api/workspace/documents/[id]/pdf/route.ts` | `.eq('parent_id', doc.linked_entity_id)` already correct — for Android docs, `linked_entity_id` stores `client_record_id`; website quote/invoice documents have no tool attachments |

---

## 6. Build Result

```
✓ Generating static pages (170/170)
[vercel-fix-next-manifests] Skipping (not Vercel).
Exit code: 0
```

No TypeScript compile errors. Pre-existing ESLint warnings in unrelated public-content pages
are unchanged. The `ENOENT: _not-found/page.js.nft.json` trace-collection error is a known
intermittent Next.js 14 internal issue unrelated to this change set.

---

## 7. Summary

8 files changed. Every `tool_attachments.parent_id` lookup, write, and filter on the
website now correctly uses `client_record_id` (the cross-platform mobile UUID) instead of
`leads.id` / `jobs.id` (Postgres PKs). Website-created leads and jobs now also generate a
`client_record_id` at creation time so that attachments created on the website are visible on
Android and vice versa.
