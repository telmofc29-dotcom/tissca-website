# Phase 3–4: Create Lead Flow + Lead Detail + General Tool Edit Mode

**Date:** 2026-04-01  
**Status:** ✅ Complete — build passes  
**Scope:** Lead creation with client contacts, dedicated Lead Detail page, General Tool edit/reopen mode

---

## Summary

Completed the round-trip lifecycle: **Tool → Lead → Lead Detail → Edit Tool Attachment → Save Update**. This proves the full bidirectional relationship between tools, leads, and attachments.

---

## Changes

### 1. Data Layer (`src/lib/workspace-data.ts`)
- **LeadRow** extended: `client_email`, `client_phone`, `client_address` (all `string | null`)
- **CreateLeadInput** extended: same 3 fields (optional)
- **createLead()**: uses spread syntax so new columns are included only when defined
- **updateLead()**: 3 new `if` checks for contact fields
- **getLeads()**: both Supabase-native and Prisma fallback paths now map client contact fields
- **NEW** `updateToolAttachment(resolved, attachmentId, resultData)`: updates `result_data` + `updated_at`, scoped by `business_id`

### 2. API Routes
- **`/api/workspace/tool-attachments`** v2.0 → v3.0: added `PATCH` handler accepting `{id, result_data}`
- **`/api/workspace/leads`**: `POST` and `PATCH` now accept `client_email`, `client_phone`, `client_address`

### 3. Leads Pipeline Page (`src/app/(member)/app/leads/page.tsx`)
- **Lead type** extended with client contact fields
- **LeadFormData** + **EMPTY_FORM** extended with `client_email`, `client_phone`, `client_address`
- Form now renders **Client Contact** section (email, phone, address fields)
- Create + update handlers send contact fields to API
- Edit panel populates contact fields from lead data
- "Open tool" button now passes `?attachmentId=xxx` for edit mode
- Each lead row has a "View details →" link to `/app/leads/[id]`

### 4. Lead Detail Page (`src/app/(member)/app/leads/[id]/page.tsx`) — NEW
- Dedicated page showing full lead info, client profile, dates, notes
- Tool attachment cards with value, preview, date
- "Edit in tool →" button opens General Tool in edit mode (`?attachmentId=xxx`)
- Actions sidebar: Edit in pipeline, Convert to job, Delete
- Timeline section showing created/updated/follow-up dates

### 5. General Tool Edit Mode (`src/app/(member)/app/tools/general/page.tsx`)
- Reads `attachmentId` from URL search params
- On mount: fetches attachment, extracts `GeneralEstimatePayload` from `result_data.payload`, hydrates form
- **Draft persistence disabled** in edit mode (prevents data corruption)
- Header shows "Edit Estimate" title + purple "Editing" badge
- Action buttons switch to "Update Estimate" (purple, PATCH) + "Discard & Start New" + "← Back"
- Success screen shows "Estimate Updated" with nav options
- `handleClear` exits edit mode and cleans URL param
- Wrapped in `<Suspense>` boundary for `useSearchParams` compatibility

---

## SQL Migration (run manually if columns don't exist)

```sql
-- Add client contact columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_address text;
```

---

## Files Changed

| File | Action |
|------|--------|
| `src/lib/workspace-data.ts` | Extended (LeadRow, createLead, updateLead, getLeads, NEW updateToolAttachment) |
| `src/app/api/workspace/tool-attachments/route.ts` | Extended (PATCH handler) |
| `src/app/api/workspace/leads/route.ts` | Extended (contact fields in POST/PATCH) |
| `src/app/(member)/app/leads/page.tsx` | Extended (form fields, types, edit link, detail link) |
| `src/app/(member)/app/leads/[id]/page.tsx` | **Created** (Lead Detail page) |
| `src/app/(member)/app/tools/general/page.tsx` | Extended (edit mode, Suspense wrap) |

---

## Verification

- `npx next build` — **passes** (no errors, warnings are pre-existing in unrelated files)
- No existing flows broken (auth, workspace, admin, warehouse, importer)
- Additive-only changes — no rewrites, no schema changes required for basic functionality
