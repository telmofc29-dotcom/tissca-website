# Website Leads/Jobs/ToolAttachment — Android Contract Parity Gap Audit

**Audit version:** 1.0.0  
**Date:** 2026-05-19  
**Auditor:** GitHub Copilot (automated analysis)  
**Source of truth:** Android Architecture Audit v1.0.0, 2026-05-19  
**Scope:** Website-side Leads, Jobs, and ToolAttachment routes + data layer only. No implementation changes.  
**Status:** DRAFT — analysis only. No production code changed.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Android Contract Summary](#2-android-contract-summary)
3. [Current Website Architecture Map](#3-current-website-architecture-map)
4. [Exact Gaps vs Android](#4-exact-gaps-vs-android)
5. [Wrong / Invented Website Behaviours](#5-wrong--invented-website-behaviours)
6. [Missing Fields — Lead](#6-missing-fields--lead)
7. [Missing Fields — Job](#7-missing-fields--job)
8. [Missing Fields — ToolAttachment](#8-missing-fields--toolattachment)
9. [Missing Sync Behaviours](#9-missing-sync-behaviours)
10. [Missing `rawPayload` Handling](#10-missing-rawpayload-handling)
11. [Missing Delete / Tombstone Behaviour](#11-missing-delete--tombstone-behaviour)
12. [PDF Generation Mismatches](#12-pdf-generation-mismatches)
13. [Recommended Correction Plan](#13-recommended-correction-plan)
14. [Risk Level Per Fix](#14-risk-level-per-fix)
15. [Phased Implementation Plan](#15-phased-implementation-plan)
16. [File-by-File Proof Table](#16-file-by-file-proof-table)

---

## 1. Executive Summary

The website CRM (Leads, Jobs, ToolAttachments) is broadly aligned to the Android contract on table structure and workspace scoping, but has **4 critical gaps**, **4 high-severity gaps**, and **8 medium gaps** that would cause data loss or incorrect behaviour when records sync between Android and the website.

The single most severe finding is a **split-path Lead→Job conversion bug**: the leads list page (`leads/page.tsx`) correctly calls the dedicated `/api/workspace/leads/[id]/convert` endpoint (which reassigns tool attachments), but the lead detail page (`leads/[id]/page.tsx`) bypasses that endpoint entirely and calls `POST /api/workspace/jobs` directly without reassigning tools. Any conversion done from the detail page leaves orphaned tool attachments still linked to the closed lead.

The second most severe finding is that there is **no DELETE handler on the tool-attachments route**, making it impossible for the website to delete a tool attachment. Android can delete attachments and propagates deletions via `OperationalSyncDto.deletedItems`. The website has no equivalent mechanism.

**Files inspected:** 12  
**Biggest gap:** Split-path Lead→Job conversion in `leads/[id]/page.tsx` — tool attachments not reassigned on conversion from detail page.

---

## 2. Android Contract Summary

Source: Android Architecture Audit v1.0.0, 2026-05-19.

| Android Class | Version | Role |
|---|---|---|
| `Lead.kt` | v1.12.0 | Lead entity with `discountPercent`, `surveyDateMillis`, `clientReference`, `depositDueDateMillis`, `depositSentAtMillis`, `depositPaidAtMillis`, `quoteAmount`, `quoteStatus`, `quoteSentAtMillis`, `paymentDueDateMillis` |
| `Job.kt` | v1.14.0 | Job entity with `surveyDateMillis`, `discountPercent`, `clientReference`, `amountPaidSoFar` |
| `ToolAttachment.kt` | v1.3 | Linked calculator output; `parentId`/`parentType` = 'LEAD' or 'JOB'; `rawPayload` stored as JSON string; `isSynced`/`lastSyncedAtMillis` are LOCAL-ONLY on Android, never pushed to Supabase |
| `LeadToJobMapper.kt` | v1.13 | Converts Lead→Job: copies all financial fields, rebuilds `addressText` from structured fields, migrates all tool attachments via `parent_id` reassignment |
| `OperationalSyncDto.kt` | v1.15.0 | Sync contract; includes `deletedItems: List<DeletedItemDto>` containing `deletedToolAttachmentIds` tombstones; `updateAttachment()` always recalculates parent total |
| `CrmViewModel.kt` | v5.74.9 | After any attachment create/update/delete: calls `recalculateParentTotal()` which calls `sumToolAttachmentTotals()` then writes back to `estimatedValue`/`jobValue` |
| `PdfGenerator.kt` | v3.11.0 | Reads `rawPayload` for flooring tool; uses `extractFlooringPdfItems()` |
| `OperationalSyncRepository.kt` | v1.16.0 | Workspace-scoped `DELETE WHERE id=? AND workspace_id=?` for attachment deletions |

**Android total-recalculation rule (CrmViewModel.kt v5.74.9):** After every `createAttachment()`, `updateAttachment()`, or `deleteAttachment()`, Android immediately calls `recalculateParentTotal()`. The parent total is set to `quoteAmount ?: quotedValue ?: estimatedValue` (Lead) or `jobValue` (Job), with the aggregated tool total as the new value. This must happen on CREATE, UPDATE, **and DELETE**.

**Android delete contract (OperationalSyncRepository.kt v1.16.0):** Hard delete scoped by `workspace_id`. Deletion is communicated to other clients via `deletedToolAttachmentIds` in the next sync `OperationalSyncDto`. No soft-delete or `is_deleted` flag — just tombstone IDs in the outbound sync payload.

---

## 3. Current Website Architecture Map

```
Website CRM Route Layer
├── GET/POST/PATCH/DELETE  /api/workspace/leads/route.ts         v4.0
├── POST                   /api/workspace/leads/[id]/convert/route.ts  v1.0  ← EXISTS
├── GET/POST/PATCH/DELETE  /api/workspace/jobs/route.ts          v5.0
├── GET/POST/PATCH         /api/workspace/tool-attachments/route.ts    v5.0  ← NO DELETE
└── GET/POST/PATCH/DELETE  /api/workspace/history/route.ts       (exists)

Website Data Layer
└── src/lib/workspace-data.ts  v2.2
    ├── LeadRow type             ← has most fields; missing survey_date_millis, discount_percent
    ├── JobRow type              ← has most fields; missing survey_date_millis, discount_percent
    ├── ToolAttachmentRow type   ← has raw_payload, parent_id, parent_type; missing nothing critical
    ├── CreateLeadInput          ← missing 10 fields that exist on LeadRow
    ├── CreateJobInput           ← missing 4 fields that exist on JobRow
    ├── createLead()             ← does not write survey_date_millis or discount_percent
    ├── updateLead()             ← does not write survey_date_millis or discount_percent
    ├── createJob()              ← does not write survey_date_millis or discount_percent
    ├── updateJob()              ← does not write survey_date_millis or discount_percent
    ├── deleteLead()             ← HARD DELETE, no snapshot, no tombstone
    ├── deleteJob()              ← HARD DELETE, no snapshot, no tombstone
    ├── createToolAttachment()   ← no parent total recalculation (done at route level only)
    ├── updateToolAttachment()   ← no parent total recalculation (gap)
    ├── reassignToolAttachmentsToJob()  ← EXISTS, correct
    └── sumToolAttachmentTotals()       ← EXISTS, correct

Website UI Layer (relevant to conversion paths)
├── src/app/(member)/app/leads/page.tsx           ← calls /api/workspace/leads/[id]/convert  ✓
└── src/app/(member)/app/leads/[id]/page.tsx      ← bypasses convert endpoint  ✗ (see §5)
```

**Tables in Supabase:** `leads`, `jobs`, `tool_attachments`, `documents`, `crm_history`, `document_pdf_info`.

---

## 4. Exact Gaps vs Android

### 4.1 Lead Schema Gaps

| Android Field | Android Source | Website `LeadRow` | Website `CreateLeadInput` | Website `createLead()` / `updateLead()` | Severity |
|---|---|---|---|---|---|
| `surveyDateMillis` | `Lead.kt` v1.12.0 | **MISSING** | **MISSING** | **MISSING** | HIGH |
| `discountPercent` | `Lead.kt` v1.12.0 | **MISSING** | **MISSING** | **MISSING** | HIGH |
| `clientReference` → `client_reference` | `Lead.kt` v1.12.0 | Present in `LeadRow` ✓ | **MISSING** from `CreateLeadInput` | **NOT WRITTEN** in `createLead()` | MEDIUM |
| `depositDueDateMillis` → `deposit_due_date_millis` | `Lead.kt` v1.12.0 | Present in `LeadRow` ✓ | **MISSING** from `CreateLeadInput` | **NOT WRITTEN** in `createLead()` | MEDIUM |
| `depositSentAtMillis` → `deposit_sent_at_millis` | `Lead.kt` v1.12.0 | Present in `LeadRow` ✓ | **MISSING** from `CreateLeadInput` | **NOT WRITTEN** in `createLead()` | MEDIUM |
| `depositPaidAtMillis` → `deposit_paid_at_millis` | `Lead.kt` v1.12.0 | Present in `LeadRow` ✓ | **MISSING** from `CreateLeadInput` | **NOT WRITTEN** in `createLead()` | MEDIUM |
| `quoteAmount` → `quote_amount` | `Lead.kt` v1.12.0 | Present in `LeadRow` ✓ | **MISSING** from `CreateLeadInput` | **NOT WRITTEN** in `createLead()` | MEDIUM |
| `quoteStatus` → `quote_status` | `Lead.kt` v1.12.0 | Present in `LeadRow` ✓ | **MISSING** from `CreateLeadInput` | **NOT WRITTEN** in `createLead()` | MEDIUM |
| `quoteSentAtMillis` → `quote_sent_at_millis` | `Lead.kt` v1.12.0 | Present in `LeadRow` ✓ | **MISSING** from `CreateLeadInput` | **NOT WRITTEN** in `createLead()` | MEDIUM |
| `paymentDueDateMillis` → `payment_due_date_millis` | `Lead.kt` v1.12.0 | Present in `LeadRow` ✓ | **MISSING** from `CreateLeadInput` | **NOT WRITTEN** in `createLead()` | LOW-MEDIUM |

### 4.2 Job Schema Gaps

| Android Field | Android Source | Website `JobRow` | Website `CreateJobInput` | Website `createJob()` / `updateJob()` | Severity |
|---|---|---|---|---|---|
| `surveyDateMillis` | `Job.kt` v1.14.0 | **MISSING** | **MISSING** | **MISSING** | HIGH |
| `discountPercent` | `Job.kt` v1.14.0 | **MISSING** | **MISSING** | **MISSING** | HIGH |
| `clientReference` → `client_reference` | `Job.kt` v1.14.0 | Present in `JobRow` ✓ | **MISSING** from `CreateJobInput` | **NOT WRITTEN** in `createJob()` | MEDIUM |
| `paymentDueDateMillis` → `payment_due_date_millis` | `Job.kt` v1.14.0 | Present in `JobRow` ✓ | **MISSING** from `CreateJobInput` | **NOT WRITTEN** in `createJob()` | LOW-MEDIUM |

### 4.3 Behavioural Gaps

| Behaviour | Android Contract | Website Implementation | Severity |
|---|---|---|---|
| Lead→Job conversion from detail page | `LeadToJobMapper.kt` v1.13: copies all fields, reassigns all tool attachments | `leads/[id]/page.tsx` bypasses `/api/workspace/leads/[id]/convert`, calls `POST /api/workspace/jobs` directly — **NO tool reassignment** | CRITICAL |
| Tool attachment DELETE | `OperationalSyncRepository.kt` v1.16.0: `DELETE WHERE id=? AND workspace_id=?` | `/api/workspace/tool-attachments/route.ts` has NO DELETE handler | CRITICAL |
| Parent total recalculate after attachment PATCH | `CrmViewModel.kt` v5.74.9: `updateAttachment()` always calls `recalculateParentTotal()` | `/api/workspace/tool-attachments` PATCH handler does NOT call `sumToolAttachmentTotals()` | HIGH |
| Parent total recalculate after attachment DELETE | `CrmViewModel.kt` v5.74.9: same | NOT APPLICABLE — DELETE does not exist | CRITICAL (blocked by DELETE gap) |
| Lead/job hard delete with snapshot | Android: workspace-scoped hard delete; `CrmViewModel` logs action | Website `deleteLead()`/`deleteJob()` do hard delete without capturing entity snapshot for history | MEDIUM |

---

## 5. Wrong / Invented Website Behaviours

### 5.1 `discount_amount` Used as Discount Percentage in Convert Route

**File:** `src/app/api/workspace/leads/[id]/convert/route.ts` v1.0, lines 120–130  
**Evidence:**
```typescript
// From convert/route.ts:
if (typeof payload.discount_percent === 'number' && payload.discount_percent > 0) {
  toolDiscountPercent = payload.discount_percent;
}
// ...
await createJob(resolved, {
  discount_amount: toolDiscountPercent > 0 ? toolDiscountPercent : null,
```

`toolDiscountPercent` holds a percentage value (e.g. `15` for 15%). It is written into `discount_amount`, which is a currency amount field (e.g. `£500`). This corrupts the `discount_amount` column with a percentage when converting from a tool that has `discount_percent` in its `raw_payload`.

**Android contract:** `discountAmount` and `discountPercent` are separate columns. When `discountPercent` is non-null, it is the source of truth for the discount and overrides `discountAmount`. The website has no `discount_percent` column and stores the percentage in the wrong field.

### 5.2 Jobs UI Type Uses Wrong Field Names

**File:** `src/app/(member)/app/jobs/page.tsx` v4.0, lines 28–45  
**Evidence:**
```typescript
type Job = {
  deposit_requested: number | null;   // should be: deposit_amount
  deposit_paid: number | null;        // should be: deposit_paid_amount
  vat_rate: number | null;            // should be: vat_percent
  discount_type: string | null;       // NOT in schema — invented
  discount_value: number | null;      // should be: discount_amount
  header_notes: string | null;        // NOT in schema — should be: top_pdf_notes
  footer_notes: string | null;        // NOT in schema — should be: bottom_pdf_notes
};
```

These field names do not match the Supabase `jobs` table columns (`deposit_amount`, `deposit_paid_amount`, `vat_percent`, `discount_amount`, `top_pdf_notes`, `bottom_pdf_notes`). This means the jobs page silently renders null for deposit, VAT, and discount values when displaying Android-synced data.

### 5.3 Two Parallel Lead→Job Conversion Paths with Different Behaviour

**Files:**  
- `src/app/(member)/app/leads/page.tsx` line 360–394 → calls `/api/workspace/leads/${lead.id}/convert` ✓  
- `src/app/(member)/app/leads/[id]/page.tsx` line 176–202 → calls `POST /api/workspace/jobs` directly ✗  

The website has two UI surfaces that both offer "Convert to Job". They use different code paths with different outcomes. The detail page path is missing:
- Tool attachment reassignment (`reassignToolAttachmentsToJob()` never called)
- VAT rate lookup from `document_pdf_info`
- Deposit aggregation from `raw_payload`
- `created_from_lead` history event on the job
- `converted_to_job` history event on the lead (no history event written at all — only analytics tracking)

### 5.4 `estimated_value` Used as Sole Parent Total Target

**File:** `src/app/api/workspace/tool-attachments/route.ts` v5.0, POST handler  
**Evidence:** After creating a tool attachment, the route calls `sumToolAttachmentTotals()` and then:
```typescript
await updateLead(resolved, parentId, { estimated_value: subtotal });
```

**Android contract (`CrmViewModel.kt` v5.74.9):** The parent total update sets `estimatedValue` on leads and `jobValue` on jobs. The website POST correctly writes `job_value` for jobs, but the lead path writes `estimated_value`. This is correct per Android contract for leads — however, Android also evaluates `quoteAmount ?: quotedValue ?: estimatedValue` as the display value. If `quote_amount` or `quoted_value` are set, overwriting `estimated_value` will not affect the display total on Android. Partial alignment.

---

## 6. Missing Fields — Lead

Fields present in Android `Lead.kt` v1.12.0 / `OperationalSyncDto` §12.1 that are absent from the website's `CreateLeadInput` type and `createLead()` / `updateLead()` functions.

> `LeadRow` (the read type) has most of these columns — they exist in Supabase. The gap is in the write path: these fields cannot be set via the website's create/update API.

| Column | Android field | In `LeadRow` | In `CreateLeadInput` | Written by `createLead()` | Written by `updateLead()` |
|---|---|---|---|---|---|
| `survey_date_millis` | `surveyDateMillis` | **NO** | **NO** | **NO** | **NO** |
| `discount_percent` | `discountPercent` | **NO** | **NO** | **NO** | **NO** |
| `client_reference` | `clientReference` | YES | **NO** | **NO** | **NO** |
| `deposit_due_date_millis` | `depositDueDateMillis` | YES | **NO** | **NO** | **NO** |
| `deposit_sent_at_millis` | `depositSentAtMillis` | YES | **NO** | **NO** | **NO** |
| `deposit_paid_at_millis` | `depositPaidAtMillis` | YES | **NO** | **NO** | **NO** |
| `quote_amount` | `quoteAmount` | YES | **NO** | **NO** | **NO** |
| `quote_status` | `quoteStatus` | YES | **NO** | **NO** | **NO** |
| `quote_sent_at_millis` | `quoteSentAtMillis` | YES | **NO** | **NO** | **NO** |
| `payment_due_date_millis` | `paymentDueDateMillis` | YES | **NO** | **NO** | **NO** |

**Note on `survey_date_millis`:** This field is present in the UI type at `leads/[id]/page.tsx` line 45 (`survey_date_millis: number | null`), meaning the frontend reads it from the Supabase row. However, the Supabase column is not present in `LeadRow` in `workspace-data.ts` and cannot be written via any website mutation function.

---

## 7. Missing Fields — Job

| Column | Android field | In `JobRow` | In `CreateJobInput` | Written by `createJob()` | Written by `updateJob()` |
|---|---|---|---|---|---|
| `survey_date_millis` | `surveyDateMillis` | **NO** | **NO** | **NO** | **NO** |
| `discount_percent` | `discountPercent` | **NO** | **NO** | **NO** | **NO** |
| `client_reference` | `clientReference` | YES | **NO** | **NO** | **NO** |
| `payment_due_date_millis` | `paymentDueDateMillis` | YES | **NO** | **NO** | **NO** |

**Note:** `amount_paid_so_far` IS present in `JobRow` and is hardcoded to `0` in `createJob()`. This is correct default behaviour for new jobs.

---

## 8. Missing Fields — ToolAttachment

The `ToolAttachmentRow` type and `createToolAttachment()` are broadly aligned to Android `ToolAttachment.kt` v1.3.

| Column | Android field | Website Status |
|---|---|---|
| `parent_id` | `parentId` | ✓ Present |
| `parent_type` | `parentType` ('LEAD'/'JOB') | ✓ Present, correct casing |
| `tool_key` | `toolKey` | ✓ Present |
| `tool_title` | `toolTitle` | ✓ Present |
| `values_text` | `valuesText` | ✓ Present |
| `total` | `total` | ✓ Present |
| `user_notes` | `userNotes` | ✓ Present |
| `raw_payload` | `rawPayload` | ✓ Present |
| `client_record_id` | `clientRecordId` | ✓ Present |
| `created_at_millis` | `createdAtMillis` | ✓ Present |
| `updated_at_millis` | `updatedAtMillis` | ✓ Present |
| `isSynced` | LOCAL-ONLY on Android | Correctly absent (Android never syncs this field) |
| `lastSyncedAtMillis` | LOCAL-ONLY on Android | Correctly absent |
| `labour_total` | Website-only extension | Present (website addition, not in Android contract) |
| `materials_total` | Website-only extension | Present (website addition, not in Android contract) |
| `subcontractor_total` | Website-only extension | Present (website addition, not in Android contract) |
| `plant_hire_total` | Website-only extension | Present (website addition, not in Android contract) |
| `other_direct_cost_total` | Website-only extension | Present (website addition, not in Android contract) |
| `overhead_total` | Website-only extension | Present (website addition, not in Android contract) |
| `unknown_total` | Website-only extension | Present (website addition, not in Android contract) |

**Finding:** `ToolAttachmentRow` is well aligned. The website-only cost-bucket totals (`labour_total` etc.) are additive extensions that Android ignores — no conflict. The `isSynced`/`lastSyncedAtMillis` omission is correct per Android contract.

**The only structural gap is behavioural:** there is no DELETE path and PATCH does not recalculate parent totals (see §4.3 and §11).

---

## 9. Missing Sync Behaviours

The website is a **server-rendered pull-driven app** — it reads from Supabase directly on each page load. It does not implement an offline-first DataStore pattern. The following Android sync behaviours have no equivalent on the website by architectural design (not defects unless cross-platform sync is a goal):

| Android Sync Behaviour | Android Source | Website Equivalent | Classification |
|---|---|---|---|
| `OperationalSyncDto` batch push (write side) | `OperationalSyncRepository.kt` v1.16.0 | NOT IMPLEMENTED | Architectural difference |
| Ghost-sync repair (re-sync lost rows) | `CrmViewModel.kt` v5.74.9 | NOT IMPLEMENTED | Architectural difference |
| `isSynced` / `lastSyncedAtMillis` per attachment | `ToolAttachment.kt` v1.3 | NOT IMPLEMENTED | Correct — LOCAL-ONLY on Android |
| `deletedToolAttachmentIds` tombstone propagation | `OperationalSyncDto.kt` v1.15.0 | **MISSING** — no DELETE handler | **CRITICAL GAP** (see §11) |
| Parent total recalculate after PATCH | `CrmViewModel.kt` v5.74.9 `updateAttachment()` | **MISSING** from PATCH handler | HIGH GAP (see §4.3) |
| Parent total recalculate after DELETE | `CrmViewModel.kt` v5.74.9 | **MISSING** (no DELETE) | CRITICAL (blocked) |

**The tombstone gap is the most important sync behaviour to fix.** If Android deletes a tool attachment, the website will continue displaying it until a page reload sees the row is gone from Supabase. But if the website ever gains a DELETE UI, there is currently no handler to process it.

---

## 10. Missing `rawPayload` Handling

Android stores the full structured tool payload as a JSON string in `tool_attachments.raw_payload`. The website reads this field correctly in:

- `src/app/api/workspace/documents/[id]/pdf/route.ts` v2.1: reads `raw_payload` from tool_attachments, calls `extractFlooringItems()` for `tool_key='flooring'`. ✓
- `src/lib/workspace-data.ts` stats section: reads `raw_payload` to extract `other_direct_cost` items for materials calculation. ✓
- `src/app/api/workspace/leads/[id]/convert/route.ts` v1.0: reads `raw_payload` to extract `deposit_amount`/`deposit_percent` for job creation. ✓

**Gaps in `rawPayload` usage:**

| Gap | File | Detail |
|---|---|---|
| `discount_percent` extracted from `raw_payload` but stored in wrong field | `leads/[id]/convert/route.ts` lines 120–130 | Writes to `discount_amount` (currency) instead of `discount_percent` (percent) column. See §5.1. |
| No `rawPayload` handling in website lead/job UI detail pages | `leads/[id]/page.tsx`, `jobs/page.tsx` | UI displays `values_text` and `total` only. The structured breakdown from `raw_payload` is not surfaced. Not a data loss issue — informational gap only. |
| No `rawPayload` re-parsing on attachment PATCH | `tool-attachments/route.ts` PATCH, `workspace-data.ts updateToolAttachment()` | After patching `raw_payload`, the parent total is not recalculated from the new payload. |

---

## 11. Missing Delete / Tombstone Behaviour

### 11.1 Tool Attachment DELETE

**Finding: CRITICAL**

`/api/workspace/tool-attachments/route.ts` v5.0 has GET, POST, and PATCH handlers only. There is no DELETE handler.

**Evidence:** `src/app/api/workspace/tool-attachments/route.ts` — file exports `GET`, `POST`, `PATCH`. No `DELETE` export present.

**Impact:**
- Website UI cannot delete a tool attachment (no UI for this exists either — consistent, but incomplete).
- Android can delete attachments and communicates this via `deletedToolAttachmentIds` in the next sync. The website has no mechanism to honour these tombstones.
- After Android deletes an attachment, it remains visible in the website if the page caches tool attachments.

**Android contract:** `OperationalSyncRepository.kt` v1.16.0 performs `DELETE FROM tool_attachments WHERE id = ? AND workspace_id = ?`. The website should offer the same scoped delete.

### 11.2 Lead / Job Deletion — No Snapshot History

**Finding: MEDIUM**

`deleteLead()` and `deleteJob()` in `workspace-data.ts` perform hard deletes with no pre-deletion entity snapshot captured.

**Evidence (`workspace-data.ts` ~line 1580):**
```typescript
export async function deleteLead(resolved, leadId) {
  // ... hard delete ...
  await logHistory(resolved, 'lead', leadId, 'deleted');  // no snapshot
  return { error: null };
}
```

Compare with `deleteTask()` (same file ~line 980) which fetches the full row before deletion and passes it as `snapshot` to `logTaskHistory()`.

**Android contract:** Lead/job deletion is workspace-scoped and irreversible. Audit trail should preserve the entity state at moment of deletion.

### 11.3 No Tombstone Infrastructure for Leads / Jobs

**Finding: ARCHITECTURAL**

Android propagates deleted lead/job IDs via `OperationalSyncDto.deletedItems`. The website has no equivalent outbound mechanism. If the website deletes a lead, Android will receive that deletion only by not finding it in the next full-sync response. This is a known architectural difference (website does not run OperationalSyncRepository), but is noted here for completeness.

---

## 12. PDF Generation Mismatches

### 12.1 Documents PDF Route — Tool-Aware Rendering (RESOLVED)

`src/app/api/workspace/documents/[id]/pdf/route.ts` v2.1 is fully aligned to Android `PdfGenerator.kt` v3.11.0 for flooring tool documents. It queries `tool_attachments` and calls `extractFlooringItems()`. Build-clean. No gap.

### 12.2 Invoice / Quote PDF Routes — No Tool Linkage (BY DESIGN)

`src/app/api/invoices/[id]/pdf/route.ts` and `src/app/api/quotes/[id]/pdf/route.ts` use the Supabase-native `invoices`/`quotes` tables which have no `linked_entity_id` link to `tool_attachments`. This is architecturally correct — web-created invoices/quotes are not Android-synced documents and have no tool chain. No gap.

### 12.3 `valuesText` vs `rawPayload` Priority

**Finding: LOW**

Android `PdfGenerator.kt` v3.11.0 uses `rawPayload` for flooring items and falls back to `valuesText` for the breakdown section. The website PDF route (`documents/[id]/pdf/route.ts` v2.1) does the same. However, for non-flooring tools, the website uses `doc.footer_notes` (from the `documents` table) as `bottomNotes`. Android uses `toolAttachment.valuesText` directly. This means non-flooring tool value breakdowns are NOT included in the bottom notes of website-generated PDFs for non-flooring tools. The gap is limited to PDF display only — no data loss.

---

## 13. Recommended Correction Plan

### Priority 1 — CRITICAL (must fix before lead/job sync is reliable)

1. **Fix `leads/[id]/page.tsx` `handleConvertToJob()` to use the convert endpoint**  
   Replace the manual `POST /api/workspace/jobs` call with a call to `POST /api/workspace/leads/${leadId}/convert`. The endpoint already exists and handles all required behaviours.  
   File: `src/app/(member)/app/leads/[id]/page.tsx` lines 176–202.

2. **Add DELETE handler to `/api/workspace/tool-attachments/route.ts`**  
   Implement `export async function DELETE(req)` — workspace-scoped `DELETE WHERE id=? AND workspace_id=?`, followed by `sumToolAttachmentTotals()` → write back parent total. Mirror the POST handler's parent total recalculation.  
   File: `src/app/api/workspace/tool-attachments/route.ts`.

3. **Add parent total recalculation to tool-attachments PATCH handler**  
   After successful PATCH, call `sumToolAttachmentTotals(resolved, entityType, parentId)` and write back to `estimated_value` (lead) or `job_value` (job), matching the POST handler pattern.  
   File: `src/app/api/workspace/tool-attachments/route.ts` PATCH handler.

### Priority 2 — HIGH (should fix for data integrity)

4. **Add `survey_date_millis` to `LeadRow`, `JobRow`, `CreateLeadInput`, `CreateJobInput`, `createLead()`, `updateLead()`, `createJob()`, `updateJob()`**  
   This field exists in the Supabase schema (read by the UI) but cannot be set via the website.  
   File: `src/lib/workspace-data.ts`.

5. **Add `discount_percent` to `LeadRow`, `JobRow`, `CreateLeadInput`, `CreateJobInput`, `createLead()`, `updateLead()`, `createJob()`, `updateJob()`**  
   Required to correctly interpret Android leads/jobs that use percentage discounts.  
   File: `src/lib/workspace-data.ts`.

6. **Fix `convert/route.ts` semantic confusion — do not write `discount_percent` into `discount_amount`**  
   After adding `discount_percent` column: store percentage value in `discount_percent`, not `discount_amount`.  
   File: `src/app/api/workspace/leads/[id]/convert/route.ts` lines 120–130.

### Priority 3 — MEDIUM (should fix for UI correctness)

7. **Fix `jobs/page.tsx` UI type field name mismatches**  
   Update `Job` type to use correct column names: `deposit_amount`, `deposit_paid_amount`, `vat_percent`, `discount_amount`, `top_pdf_notes`, `bottom_pdf_notes`.  
   File: `src/app/(member)/app/jobs/page.tsx` lines 28–45.

8. **Add missing fields to `CreateLeadInput` / `UpdateLeadInput`**  
   Fields: `client_reference`, `deposit_due_date_millis`, `deposit_sent_at_millis`, `deposit_paid_at_millis`, `quote_amount`, `quote_status`, `quote_sent_at_millis`, `payment_due_date_millis`.  
   File: `src/lib/workspace-data.ts`.

9. **Add missing fields to `CreateJobInput` / `UpdateJobInput`**  
   Fields: `client_reference`, `payment_due_date_millis`.  
   File: `src/lib/workspace-data.ts`.

10. **Add pre-deletion snapshot to `deleteLead()` and `deleteJob()`**  
    Fetch full row before delete and pass to `logHistory()` as a snapshot, matching the `deleteTask()` pattern.  
    File: `src/lib/workspace-data.ts`.

---

## 14. Risk Level Per Fix

| Fix | Risk | Reason |
|---|---|---|
| Fix `leads/[id]/page.tsx` conversion path | LOW | Call existing, tested endpoint. Remove two manual fetch calls. No schema change. |
| Add DELETE to tool-attachments route | MEDIUM | New endpoint. Requires correct workspace scoping. Must also recalculate parent total. |
| Add parent total recalc to PATCH | LOW | Add ~5 lines after existing PATCH success block. Pattern already exists in POST. |
| Add `survey_date_millis` to types + mutations | LOW | Additive column addition. No existing data affected. |
| Add `discount_percent` to types + mutations | MEDIUM | New column. Requires DB migration to add column if not already present. Verify Supabase schema first. |
| Fix `convert/route.ts` discount field | LOW | After `discount_percent` column exists — just write to correct field. |
| Fix `jobs/page.tsx` UI type names | LOW | Type-only change. Will surface real data from Supabase that was previously silently null. |
| Add missing fields to `CreateLeadInput` | LOW | Additive. TypeScript-safe. |
| Add missing fields to `CreateJobInput` | LOW | Additive. TypeScript-safe. |
| Add snapshot to `deleteLead()`/`deleteJob()` | LOW | Pattern already proven in `deleteTask()`. Fire-and-forget. |

---

## 15. Phased Implementation Plan

### Phase W1 — Conversion Path Fix (zero risk, zero schema change)
- [ ] Fix `leads/[id]/page.tsx` `handleConvertToJob()` to call `/api/workspace/leads/${leadId}/convert`
- [ ] Verify both UI paths now go through the same endpoint

### Phase W2 — Tool Attachment Delete + PATCH Fix (low-medium risk)
- [ ] Add DELETE handler to `/api/workspace/tool-attachments/route.ts`
- [ ] Add parent total recalculation to PATCH handler
- [ ] Run `npm run build` to verify clean

### Phase W3 — Schema Additions (additive only)
- [ ] Verify `survey_date_millis` and `discount_percent` exist as nullable columns on `leads` and `jobs` in Supabase
- [ ] Add to `LeadRow`, `JobRow` types in `workspace-data.ts`
- [ ] Add to `CreateLeadInput`, `CreateJobInput`, `UpdateLeadInput`, `UpdateJobInput`
- [ ] Add to `createLead()`, `updateLead()`, `createJob()`, `updateJob()` insert/update blocks
- [ ] Fix `convert/route.ts` to use `discount_percent` column

### Phase W4 — API Completeness (medium, additive)
- [ ] Add remaining `CreateLeadInput` fields: `client_reference`, `deposit_due_date_millis`, `deposit_sent_at_millis`, `deposit_paid_at_millis`, `quote_amount`, `quote_status`, `quote_sent_at_millis`, `payment_due_date_millis`
- [ ] Add remaining `CreateJobInput` fields: `client_reference`, `payment_due_date_millis`
- [ ] Wire all new input fields through `createLead()`, `updateLead()`, `createJob()`, `updateJob()`

### Phase W5 — UI Correctness + History (low risk)
- [ ] Fix `jobs/page.tsx` `Job` type field names
- [ ] Add pre-deletion snapshots to `deleteLead()` and `deleteJob()`

---

## 16. File-by-File Proof Table

| File | Version | Finding | Severity | Line(s) |
|---|---|---|---|---|
| `src/app/(member)/app/leads/[id]/page.tsx` | v1.0 | `handleConvertToJob()` calls `POST /api/workspace/jobs` directly without tool reassignment — bypasses convert endpoint | CRITICAL | 176–202 |
| `src/app/(member)/app/leads/page.tsx` | — | `handleConvertToJob()` correctly calls `/api/workspace/leads/${lead.id}/convert` | CORRECT | 360–394 |
| `src/app/api/workspace/leads/[id]/convert/route.ts` | v1.0 | Dedicated conversion endpoint exists; handles tool reassignment, VAT, history | CORRECT | — |
| `src/app/api/workspace/leads/[id]/convert/route.ts` | v1.0 | `toolDiscountPercent` (a %) is stored in `discount_amount` (a currency field) — semantic type corruption | HIGH | 120–130 |
| `src/app/api/workspace/tool-attachments/route.ts` | v5.0 | No DELETE handler | CRITICAL | entire file |
| `src/app/api/workspace/tool-attachments/route.ts` | v5.0 | PATCH handler does not recalculate parent total after update | HIGH | PATCH handler |
| `src/app/api/workspace/tool-attachments/route.ts` | v5.0 | POST handler correctly calls `sumToolAttachmentTotals()` → writes parent total | CORRECT | POST handler |
| `src/app/api/workspace/leads/route.ts` | v4.0 | POST `CreateLeadInput` missing `survey_date_millis`, `discount_percent`, `client_reference`, deposit/quote fields | MEDIUM-HIGH | POST handler |
| `src/app/api/workspace/leads/route.ts` | v4.0 | DELETE performs hard delete — correct per Android contract | CORRECT | DELETE handler |
| `src/app/api/workspace/jobs/route.ts` | v5.0 | POST `CreateJobInput` missing `survey_date_millis`, `discount_percent`, `client_reference`, `payment_due_date_millis` | MEDIUM-HIGH | POST handler |
| `src/app/(member)/app/jobs/page.tsx` | v4.0 | `Job` UI type uses wrong field names: `deposit_requested`, `deposit_paid`, `vat_rate`, `discount_type`, `discount_value`, `header_notes`, `footer_notes` | MEDIUM | 28–45 |
| `src/lib/workspace-data.ts` | v2.2 | `LeadRow` type missing `survey_date_millis`, `discount_percent` | HIGH | ~400–445 |
| `src/lib/workspace-data.ts` | v2.2 | `JobRow` type missing `survey_date_millis`, `discount_percent` | HIGH | ~446–490 |
| `src/lib/workspace-data.ts` | v2.2 | `CreateLeadInput` missing 10 fields that exist on `LeadRow` | MEDIUM | ~1100–1140 |
| `src/lib/workspace-data.ts` | v2.2 | `CreateJobInput` missing 4 fields that exist on `JobRow` | MEDIUM | ~1140–1175 |
| `src/lib/workspace-data.ts` | v2.2 | `createLead()` does not write `survey_date_millis`, `discount_percent`, or any new lead fields | MEDIUM-HIGH | ~1470–1520 |
| `src/lib/workspace-data.ts` | v2.2 | `updateLead()` does not write `survey_date_millis`, `discount_percent`, or any new lead fields | MEDIUM-HIGH | ~1525–1580 |
| `src/lib/workspace-data.ts` | v2.2 | `createJob()` does not write `survey_date_millis`, `discount_percent` | MEDIUM-HIGH | ~1620–1680 |
| `src/lib/workspace-data.ts` | v2.2 | `updateJob()` does not write `survey_date_millis`, `discount_percent` | MEDIUM-HIGH | ~1685–1750 |
| `src/lib/workspace-data.ts` | v2.2 | `deleteLead()` hard deletes without entity snapshot | MEDIUM | ~1580–1595 |
| `src/lib/workspace-data.ts` | v2.2 | `deleteJob()` hard deletes without entity snapshot | MEDIUM | ~1755–1770 |
| `src/lib/workspace-data.ts` | v2.2 | `updateToolAttachment()` does not recalculate parent total | HIGH | ~1920–1960 |
| `src/lib/workspace-data.ts` | v2.2 | `reassignToolAttachmentsToJob()` exists and is correct | CORRECT | ~2044–2075 |
| `src/lib/workspace-data.ts` | v2.2 | `sumToolAttachmentTotals()` exists and is correct | CORRECT | ~2080–2100 |
| `src/app/api/workspace/documents/[id]/pdf/route.ts` | v2.1 | Tool-aware flooring PDF rendering — aligned to Android `PdfGenerator.kt` v3.11.0 | CORRECT | entire file |
| `src/lib/pdf/branding.ts` | — | Android PDF renderer port — build-clean, unchanged | CORRECT | — |

---

*Audit generated from live codebase inspection. All file paths are absolute-relative to the workspace root. All line numbers are approximate — verify against current file state before acting.*
