# Website — Quote/Invoice ↔ Lead/Job Bridge Alignment Audit
**Phase W5** | Status: **DEFERRED — NOT APPLIED** | Build: ✓ Compiled successfully

---

## IMPORTANT: W5 Schema Bridge REJECTED / DEFERRED

The initial W5 implementation added `lead_id`/`job_id` columns to `quotes`/`invoices` and
looked up `tool_attachments` by `tool_attachments.parent_id = quotes.lead_id`.

**This design was rejected** because it contradicts the verified Android + Supabase contract.
All W5 schema-bridge changes have been fully reverted. The SQL migration was renamed
`DEFERRED_DO_NOT_RUN_phase_w5_quote_invoice_lead_job_bridge.sql` and must NOT be run.

---

## Verified Android + Supabase Contract (Source of Truth)

### Lead/Job lifecycle — status-based, never deleted
Android leads use status: `NEW`, `VIEWING_BOOKED`, `IN_PROGRESS`, `ON_HOLD`, `WON`, `LOST`, `ARCHIVED`  
Android jobs use status: `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`, `CANCELLED`  
Rows remain in `public.leads` / `public.jobs` forever. Android never SQL-DELETEs leads or jobs.

### Hard-delete: tool_attachments only
Android hard-deletes `tool_attachments` records. No other CRM rows are deleted.

### tool_attachments linkage — canonical identity
```
tool_attachments.parent_id  ↔  leads.client_record_id   (when parent_type = 'LEAD')
tool_attachments.parent_id  ↔  jobs.client_record_id    (when parent_type = 'JOB')
```
`tool_attachments.parent_id` is **NOT** guaranteed to equal `leads.id` / `jobs.id`.  
It links to `client_record_id`, the canonical mobile-side identity for these records.

### Android pull filter
Android queries `tool_attachments` filtered only by `workspace_id`.  
No `is_deleted` filter exists — that column does not exist on leads/jobs.

### Real Supabase columns (verified)
`leads` and `jobs` tables have: `client_record_id`, `updated_at_millis`, `status`, `deposit_status`.  
Android expects these exact field names.

---

## What Was Reverted

| File | Revert action |
|---|---|
| `src/types/quotes.ts` | Removed `lead_id: string \| null` from `Quote` + `CreateQuoteInput` |
| `src/types/invoices.ts` | Removed `lead_id`, `job_id` from `Invoice` + `CreateInvoiceRequest` |
| `src/lib/validators/quoteSchemas.ts` | Removed `lead_id` from `CreateQuoteSchema` |
| `src/lib/validators/invoiceSchemas.ts` | Removed `lead_id`, `job_id` from `CreateInvoiceSchema` |
| `src/app/api/invoices/route.ts` | Removed `lead_id`/`job_id` from POST destructure + INSERT |
| `src/app/api/quotes/[id]/create-invoice/route.ts` | Removed `lead_id` propagation to new invoice |
| `src/app/api/quotes/[id]/pdf/route.ts` | Removed tool-payload import, W5 lookup block, reverted `generateQuotePDF` signature + body |
| `src/app/api/invoices/[id]/pdf/route.ts` | Removed tool-payload import, W5 lookup block, reverted `generateInvoicePDF` signature + body |
| `supabase/sql/phase_w5_quote_invoice_lead_job_bridge.sql` | Renamed to `DEFERRED_DO_NOT_RUN_…` — must NOT be applied |

---

## What Was Kept (Phase W4 — Still Valid)

| File | Status |
|---|---|
| `src/lib/pdf/tool-payload.ts` | KEPT — centralised rawPayload parser used by `documents/[id]/pdf` route |
| `src/app/api/workspace/documents/[id]/pdf/route.ts` | KEPT — multi-tool rawPayload extraction (W4, correct) |
| `src/app/api/workspace/convert/route.ts` | KEPT — uses `extractRawPayloadFinancials` (W4, correct) |

---

## Current Website Behaviour — Quote/Invoice PDF Routes

Both PDF routes (`/api/quotes/[id]/pdf`, `/api/invoices/[id]/pdf`) now:
1. Fetch record + items from DB
2. Build `tableItems` from `quote_items` / `invoice_items` only
3. Use `quote.terms_and_conditions` / `invoice.terms` as `bottomNotes`
4. No `tool_attachments` lookup (no bridge exists yet)

This is the correct pre-bridge baseline. No data loss. No schema change.

---

## Remaining Parity Gap — Future Work

**Gap**: When a quote or invoice is generated from a Lead/Job context, the PDF cannot yet
include tool-attachment line items (e.g. General Estimate payload) because there is no
schema path from `quotes`/`invoices` to `tool_attachments`.

**Correct future bridge design** (per Android contract):
```
Option A: quotes.client_record_id / invoices.client_record_id
   → join leads/jobs where client_record_id matches
   → then lookup tool_attachments.parent_id = client_record_id

Option B: quotes/invoices store the lead's/job's client_record_id directly
   → then lookup tool_attachments.parent_id = that client_record_id
```

Any future implementation MUST use `client_record_id` as the linkage key, NOT `leads.id` / `jobs.id`.

**Prerequisite**: Schema alignment (add `client_record_id` to `quotes`/`invoices`, or join via existing `client_id` → `clients.client_record_id` if that field exists) — to be validated against live Supabase schema before implementing.

---

## Build Result

```
✓ Compiled successfully
> postbuild — Skipping (not Vercel)
```

