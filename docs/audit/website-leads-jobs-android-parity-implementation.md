# TISSCA Website — Lead/Job Android Parity Implementation Report
**Phase W3 — Implementation Record**
**Status: COMPLETE**
**Build verification: ✓ Compiled successfully (exit 0)**

---

## 1. Scope

This document records every code change made in Phase W3 to align the website Lead/Job data contract with the Android canonical source of truth (Lead.kt v1.12.0, Job.kt v1.14.0, LeadToJobMapper.kt v1.13, CrmViewModel.kt v5.74.9).

Source of divergence analysis: `docs/audit/website-leads-jobs-android-parity-gap-audit.md`

---

## 2. Database Schema Notes

No `ALTER TABLE` migrations were required. The following columns already exist in Supabase:

**`leads` table** — columns already present but missing from TS types:
- `survey_date_millis` (bigint, nullable)
- `discount_percent` (numeric, nullable)
- `client_reference` (text, nullable)
- `deposit_due_date_millis` (bigint, nullable)
- `deposit_sent_at_millis` (bigint, nullable)
- `deposit_paid_at_millis` (bigint, nullable)
- `quote_amount` (numeric, nullable)
- `quote_status` (text, nullable)
- `quote_sent_at_millis` (bigint, nullable)
- `payment_due_date_millis` (bigint, nullable)

**`jobs` table** — columns already present but missing from TS types:
- `survey_date_millis` (bigint, nullable)
- `discount_percent` (numeric, nullable)
- `client_reference` (text, nullable)
- `payment_due_date_millis` (bigint, nullable)

All fields were added as `nullable` in TypeScript types and as `?? null` guards in insert/update payloads. PostgREST silently ignores unknown columns, but these are confirmed to exist.

---

## 3. Files Changed

### 3.1 `src/lib/workspace-data.ts` (v2.2 → v2.3)

#### 3.1.1 `LeadRow` type
Added two missing fields:
```typescript
discount_percent: number | null;
survey_date_millis: number | null;
```

#### 3.1.2 `JobRow` type
Added two missing fields:
```typescript
discount_percent: number | null;
survey_date_millis: number | null;
```

#### 3.1.3 `CreateLeadInput` type
Added 10 missing fields (all optional/nullable):
```typescript
client_reference?: string | null;
survey_date_millis?: number | null;
deposit_due_date_millis?: number | null;
deposit_sent_at_millis?: number | null;
deposit_paid_at_millis?: number | null;
quote_amount?: number | null;
quote_status?: string | null;
quote_sent_at_millis?: number | null;
payment_due_date_millis?: number | null;
discount_percent?: number | null;
```
`UpdateLeadInput = Partial<CreateLeadInput>` inherits all additions automatically.

#### 3.1.4 `CreateJobInput` type
Added 4 missing fields (all optional/nullable):
```typescript
client_reference?: string | null;
survey_date_millis?: number | null;
payment_due_date_millis?: number | null;
discount_percent?: number | null;
```
`UpdateJobInput = Partial<CreateJobInput>` inherits all additions automatically.

#### 3.1.5 `createLead()` insert block
Added all 10 new fields to the Supabase `.insert({...})` payload:
```typescript
client_reference: input.client_reference ?? null,
survey_date_millis: input.survey_date_millis ?? null,
deposit_due_date_millis: input.deposit_due_date_millis ?? null,
deposit_sent_at_millis: input.deposit_sent_at_millis ?? null,
deposit_paid_at_millis: input.deposit_paid_at_millis ?? null,
quote_amount: input.quote_amount ?? null,
quote_status: input.quote_status ?? null,
quote_sent_at_millis: input.quote_sent_at_millis ?? null,
payment_due_date_millis: input.payment_due_date_millis ?? null,
discount_percent: input.discount_percent ?? null,
```

#### 3.1.6 `updateLead()` update payload builder
Added conditional writes for all 10 new fields:
```typescript
if (input.client_reference !== undefined) updatePayload.client_reference = input.client_reference;
if (input.survey_date_millis !== undefined) updatePayload.survey_date_millis = input.survey_date_millis;
if (input.deposit_due_date_millis !== undefined) updatePayload.deposit_due_date_millis = input.deposit_due_date_millis;
if (input.deposit_sent_at_millis !== undefined) updatePayload.deposit_sent_at_millis = input.deposit_sent_at_millis;
if (input.deposit_paid_at_millis !== undefined) updatePayload.deposit_paid_at_millis = input.deposit_paid_at_millis;
if (input.quote_amount !== undefined) updatePayload.quote_amount = input.quote_amount;
if (input.quote_status !== undefined) updatePayload.quote_status = input.quote_status;
if (input.quote_sent_at_millis !== undefined) updatePayload.quote_sent_at_millis = input.quote_sent_at_millis;
if (input.payment_due_date_millis !== undefined) updatePayload.payment_due_date_millis = input.payment_due_date_millis;
if (input.discount_percent !== undefined) updatePayload.discount_percent = input.discount_percent;
```

#### 3.1.7 `deleteLead()` — pre-deletion snapshot (pattern: `deleteTask()`)
Before delete, fetches full lead row workspace-scoped; passes as `details` to `logHistory()`:
```typescript
const { data: existing } = await supabase
  .from('leads').select('*')
  .eq('id', leadId).eq('workspace_id', wsId).maybeSingle();
// ... delete ...
await logHistory(resolved, 'lead', leadId, 'deleted', existing ?? { id: leadId });
```

#### 3.1.8 `createJob()` insert block
Added all 4 new fields to the Supabase `.insert({...})` payload:
```typescript
client_reference: input.client_reference ?? null,
survey_date_millis: input.survey_date_millis ?? null,
payment_due_date_millis: input.payment_due_date_millis ?? null,
discount_percent: input.discount_percent ?? null,
```

#### 3.1.9 `updateJob()` update payload builder
Added conditional writes for all 4 new fields:
```typescript
if (input.client_reference !== undefined) updatePayload.client_reference = input.client_reference;
if (input.survey_date_millis !== undefined) updatePayload.survey_date_millis = input.survey_date_millis;
if (input.payment_due_date_millis !== undefined) updatePayload.payment_due_date_millis = input.payment_due_date_millis;
if (input.discount_percent !== undefined) updatePayload.discount_percent = input.discount_percent;
```

#### 3.1.10 `deleteJob()` — pre-deletion snapshot (pattern: `deleteTask()`)
Same pattern as `deleteLead()`:
```typescript
const { data: existing } = await supabase
  .from('jobs').select('*')
  .eq('id', jobId).eq('workspace_id', wsId).maybeSingle();
// ... delete ...
await logHistory(resolved, 'job', jobId, 'deleted', existing ?? { id: jobId });
```

---

### 3.2 `src/app/api/workspace/leads/route.ts` (v4.0 → v4.1)

**POST handler** — added to `CreateLeadInput` builder from `body`:
```typescript
client_reference: body.client_reference ?? null,
survey_date_millis: body.survey_date_millis != null ? Number(body.survey_date_millis) : null,
deposit_due_date_millis: body.deposit_due_date_millis != null ? Number(body.deposit_due_date_millis) : null,
deposit_sent_at_millis: body.deposit_sent_at_millis != null ? Number(body.deposit_sent_at_millis) : null,
deposit_paid_at_millis: body.deposit_paid_at_millis != null ? Number(body.deposit_paid_at_millis) : null,
quote_amount: body.quote_amount != null ? Number(body.quote_amount) : null,
quote_status: body.quote_status ?? null,
quote_sent_at_millis: body.quote_sent_at_millis != null ? Number(body.quote_sent_at_millis) : null,
payment_due_date_millis: body.payment_due_date_millis != null ? Number(body.payment_due_date_millis) : null,
discount_percent: body.discount_percent != null ? Number(body.discount_percent) : null,
```

**PATCH handler** — added conditional guards for all 10 fields in `UpdateLeadInput` builder from `fields`.

---

### 3.3 `src/app/api/workspace/jobs/route.ts` (v5.0 → v5.1)

**POST handler** — added to `CreateJobInput` builder from `body`:
```typescript
client_reference: body.client_reference ?? null,
survey_date_millis: body.survey_date_millis != null ? Number(body.survey_date_millis) : null,
payment_due_date_millis: body.payment_due_date_millis != null ? Number(body.payment_due_date_millis) : null,
discount_percent: body.discount_percent != null ? Number(body.discount_percent) : null,
```

**PATCH handler** — added conditional guards for all 4 fields in `UpdateJobInput` builder from `fields`.

---

### 3.4 `src/app/api/workspace/leads/[id]/convert/route.ts` (v1.0 → v1.1)

**Bug fixed — discount semantic type corruption:**

| Before (WRONG) | After (CORRECT) |
|---|---|
| `discount_amount: toolDiscountPercent > 0 ? toolDiscountPercent : null` | `discount_percent: toolDiscountPercent > 0 ? toolDiscountPercent : null` |

**Root cause:** `toolDiscountPercent` holds a percentage value (e.g. `15` for 15%). The old code wrote this into `discount_amount`, which is a currency amount field (e.g. `£150.00`). This caused type-semantic corruption — a dimensionless ratio stored as a monetary amount.

**Fix:** Write the percentage value into `discount_percent` where it belongs. The currency field `discount_amount` is not set by the conversion path.

---

## 4. Previously Completed (W1, W2)

These changes were implemented in prior phases and are noted here for completeness:

**W1 — `src/app/(member)/app/leads/[id]/page.tsx`**
- `handleConvertToJob()` now calls `POST /api/workspace/leads/[leadId]/convert` (dedicated endpoint) instead of the manual 2-step path that skipped tool attachment reassignment.

**W2 — `src/app/api/workspace/tool-attachments/route.ts`**
- DELETE handler added: workspace-scoped before fetching, hard delete, `sumToolAttachmentTotals()` recalculates parent lead or job total.
- PATCH handler now calls `sumToolAttachmentTotals()` after successful update.

---

## 5. Contracts Now Aligned

### 5.1 Lead data contract
All Android Lead.kt fields are present end-to-end: TypeScript row type → mutation input type → create/update functions → API route body parsing.

### 5.2 Job data contract
All Android Job.kt fields are present end-to-end: TypeScript row type → mutation input type → create/update functions → API route body parsing.

### 5.3 ToolAttachment ownership contract
- Attachments belong to a lead until conversion; then `reassignToolAttachmentsToJob()` atomically moves ownership.
- DELETE recalculates parent total immediately.
- PATCH recalculates parent total immediately.

### 5.4 Total recalculation contract
`sumToolAttachmentTotals()` sums `unit_price × quantity` for all attachments of a parent, writes back to `estimated_value` (lead) or `job_value` (job). Called on every PATCH and DELETE of a tool attachment.

### 5.5 Lead→Job conversion contract
- `convert/route.ts` reads tool attachments, sums value → `job_value`
- Reads deposit amounts from `raw_payload` → `deposit_amount`
- Reads discount percentage from `raw_payload.discount_percent` → `discount_percent` (fixed in W3 — was incorrectly stored in `discount_amount`)
- Calls `reassignToolAttachmentsToJob()` — moves all attachments atomically
- Marks lead as `WON`
- Logs history on both `lead` side (`converted_to_job`) and `job` side (`created_from_lead`)

### 5.6 Deletion audit trail contract
`deleteLead()` and `deleteJob()` now capture the full entity row as a pre-deletion snapshot, passed as `details` to `logHistory()` — matching the `deleteTask()` pattern already established in the codebase.

---

## 6. Remaining Known Gaps (W4+ scope)

These are documented but out of scope for W3:

1. **`src/app/(member)/app/jobs/page.tsx`** — uses `Job` type alias internally instead of `JobRow`. Purely cosmetic — no data impact. Low priority.
2. **`src/app/(member)/app/leads/page.tsx`** — uses `Lead` type alias internally instead of `LeadRow`. Same as above.
3. **PDF contract** — `document_pdf_info` fields (e.g. `pdf_url`, `pdf_generated_at`) are not audited in this phase.
4. **rawPayload contract** — `tool_attachments.raw_payload` field parsing is done inline in convert route; no typed contract exists. Could be formalized as `ToolAttachmentPayload` type.
5. **Android sync endpoint** — `/api/workspace/sync` (if it exists) needs to serve all new fields. Not audited in W3.

---

## 7. Build Verification

```
✓ Compiled successfully
npm run build exit code: 0
```

One pre-existing warning (unrelated to W3):
```
Warning: React Hook useEffect has missing dependencies: 's.errors.loadFailed'...
```
This was present before W3 and is not caused by any change in this phase.
