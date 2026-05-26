# Website Quote / Invoice Creation Lifecycle — Architecture Audit

**Status**: READ-ONLY AUDIT. No schema changes. No migrations. No implementation.  
**Date**: 2025-07  
**Purpose**: Document the complete, real, current state of quote and invoice creation
on the website before any further CRM-linkage work is designed.

---

## Executive Summary

The website has **four parallel, non-overlapping** quote/invoice data paths. The member
app's primary quote/invoice display (`/app/quotes`, `/app/invoices`) reads exclusively
from `public.documents` — it does NOT read from `public.quotes` or `public.invoices`.
There is currently **no column** on `public.quotes`, `public.invoices`, or
`public.clients` that links to the CRM (leads / jobs) or to Android's
`client_record_id` identity system.

---

## Part 1 — The Four Systems

### System A — Prisma Legacy (effectively dead for the member app)

| Attribute | Value |
|-----------|-------|
| Entry point | `POST /api/quotes` (Bearer auth) |
| Auth | `supabase.auth.admin.getUserById(token)` |
| Write target | Prisma `quote` table (separate Postgres schema) |
| Helper | `src/lib/db.ts` → `createQuote(userId, data)` |
| Quote PK | CUID (`cuid()`) |
| Scoping | `userId` (Supabase auth UID) |
| Invoice | `POST /api/invoices` (Prisma) → `createInvoice(userId, data)` |
| UI | `/account/quotes` → redirects to `/app/quotes` (redirect only) |

**Status**: No current member app UI creates or reads from this system.
The route file (`src/app/api/quotes/route.ts`) and `lib/db.ts` functions
(`createQuote`, `createInvoice`) remain in the codebase but are not reachable from
any active page.

---

### System B — Supabase-Native Web Portal (staff ↔ client portal flow)

This is the **active quote engine** used by staff to prepare and send quotes to clients.

#### Quote creation (staff side)

```
useQuote.ts → createQuote(businessId, quoteData)
           ↓
  Direct Supabase client insert (ANON key)
           ↓
  public.quotes (UUID PK, business_id-scoped)
  public.quote_items (FK: quote_id)
```

- Zod-validated via `CreateQuoteSchema` (`src/lib/validators/quoteSchemas.ts`)
- Fields stored: `business_id`, `client_id`, `quote_number`, `status`, `vat_rate`,
  `currency`, `notes`, `terms_and_conditions`, `is_locked`, `discount_type`,
  `discount_value`, `deposit_percentage`, `valid_until`, `sent_at`, `accepted_at`,
  `accepted_by`, `acceptance_ip`, `acceptance_note`
- **No CRM columns**: no `lead_id`, no `job_id`, no `client_record_id`

#### Quote lifecycle (System B)

```
[Staff creates quote in web portal]
         |
         ↓
  public.quotes (status: 'draft')
         |
  [Staff sends to client]
         ↓
  public.quotes (status: 'sent')
         |
  [Client views at /dashboard/client/quotes/:id]
         |
  [Client accepts]
         ↓
  POST /api/quotes/:id/accept
    → public.quote_acceptance_snapshot (items_snapshot, totals frozen)
    → public.quotes.status = 'accepted', is_locked = true
         |
  [Staff converts to invoice]
         ↓
  POST /api/quotes/:id/create-invoice
    → reads quote_acceptance_snapshot.items_snapshot as source of truth
    → public.invoices (UUID PK, business_id-scoped, quote_id FK)
    → public.invoice_items (FK: invoice_id)
         |
  [PDF generated]
         ↓
  GET /api/quotes/:id/pdf  (session auth)
    → generateQuotePDF(...)
    → persistDocumentAndLog() → public.documents (type='quote',
        linked_entity_type='quote', linked_entity_id=quote.id, platform='web')
```

#### Invoice PDF (System B)

```
GET /api/invoices/:id/pdf  (session auth)
    → generateInvoicePDF(...)
    → persistDocumentAndLog() → public.documents (type='invoice',
        linked_entity_type='invoice', linked_entity_id=invoice.id, platform='web')
```

**Key observation**: A PDF must be generated at least once before a System B quote or
invoice appears in the member app's `/app/quotes` or `/app/invoices` view. The PDF
generation step is the "bridge" into the documents layer.

---

### System C — Android-Synced Documents (what the member app actually shows)

```
[Android app]
    |
    ↓
  public.documents (type='quote'|'invoice', platform='android')
    |
    ↓
  GET /api/workspace/documents  (Bearer token)
    → getDocuments(resolved) — scoped by workspace_id
    |
    ↓
  /app/quotes page — filters: type.includes('quote')
  /app/invoices page — filters: type.includes('invoice')
    |
  [PDF button]
    ↓
  GET /api/workspace/documents/:id/pdf  (Bearer token)
    → tool-payload.ts extraction → generateXxxPDF(...)
```

The `/app/quotes` and `/app/invoices` pages show **all documents** from
`public.documents` where `type` contains 'quote' or 'invoice' — regardless of origin.
This means they show:
- Android-created documents (platform='android')
- System B web-generated PDFs (platform='web', linked_entity_type='quote'/'invoice')
- System D layout quotes (platform='web', type='layout_quote')

**The "New Quote" button on `/app/quotes`** links to `/app/scan-to-layout`,
not to a form that creates a `public.quotes` record.

---

### System D — Layout Quotes (Scan-to-Layout Planner)

```
/app/scan-to-layout → editor → QuoteSummary component
    |
    [handleDownloadPdf()]
    ↓
  POST /api/workspace/layout-quote-pdf  (Bearer token)
    → GeneratedQuote payload (in-memory, from scan-to-layout planner)
    → generateLayoutQuotePDF(...)
    → persistDocumentAndLog() → public.documents (type='layout_quote',
        linked_entity_type='layout', linked_entity_id=layoutId, platform='web')
    → returns PDF blob
```

This system is entirely independent of `public.quotes`. It creates a document record
directly from the layout planner without going through the quote table.

---

## Part 2 — ID Availability at Each Stage

### Quote creation (System B)

| ID | Source | Available? |
|----|--------|-----------|
| `business_id` (workspace UUID) | Caller context | ✅ Always |
| `client_id` | Client selector in UI | ✅ When client selected |
| `quote_id` | Generated on insert | ✅ After creation |
| `lead_id` | Lead context | ❌ Never |
| `job_id` | Job context | ❌ Never |
| `client_record_id` | Android contract | ❌ Never |

### Invoice creation via `POST /api/invoices` (System B, direct)

| ID | Available? |
|----|-----------|
| `business_id` | ✅ (from client lookup) |
| `client_id` | ✅ |
| `quote_id` | ✅ (optional) |
| `lead_id` / `job_id` | ❌ |
| `client_record_id` | ❌ |

### Invoice creation via `POST /api/quotes/:id/create-invoice` (System B, from quote)

| ID | Available? |
|----|-----------|
| `business_id` | ✅ (from quote) |
| `client_id` | ✅ (from quote) |
| `quote_id` | ✅ |
| `lead_id` / `job_id` | ❌ |
| `client_record_id` | ❌ |

### Lead / Job context (CRM)

| Column | Type | Notes |
|--------|------|-------|
| `leads.id` | UUID (Postgres PK) | Website uses this as tool_attachments.parent_id |
| `leads.client_record_id` | UUID (nullable) | Android uses this as tool_attachments.parent_id |
| `jobs.id` | UUID (Postgres PK) | Website uses this as tool_attachments.parent_id |
| `jobs.client_record_id` | UUID (nullable) | Android uses this as tool_attachments.parent_id |
| `clients.id` | UUID (Postgres PK) | Linked from quotes/invoices via client_id |
| `clients.client_record_id` | **Does not exist** | ❌ Not in ClientRow or clients table |

---

## Part 3 — The CRM Linkage Gap

### Current state of `tool_attachments`

| Origin | `parent_id` value | `parent_type` |
|--------|------------------|--------------|
| Website (leads) | `leads.id` (Postgres PK) | `'LEAD'` |
| Website (jobs) | `jobs.id` (Postgres PK) | `'JOB'` |
| Android (leads) | `leads.client_record_id` (mobile UUID) | `'LEAD'` |
| Android (jobs) | `jobs.client_record_id` (mobile UUID) | `'JOB'` |

These are stored in the **same** `public.tool_attachments` table but use **different
identity values** for `parent_id`. There is no direct join between them without knowing
which `lead.id` corresponds to which `lead.client_record_id`.

### No path from quotes/invoices to CRM

```
public.quotes.client_id
       ↓
public.clients.id
       ↓
  NO client_record_id column on clients table
       ↓
  NO path to leads.client_record_id
       ↓
  NO path to tool_attachments.parent_id (Android contract)
```

```
public.quotes
  ↓ (no lead_id column)
public.leads
  ↓ (even if added: leads.id ≠ leads.client_record_id)
tool_attachments.parent_id (Android)
```

**Conclusion**: There is currently **no schema path** from a website-created quote or
invoice to the lead/job CRM entities, or to Android's `tool_attachments.parent_id`.

---

## Part 4 — The `public.documents` Bridge (partial)

When a quote or invoice PDF is generated via System B routes, `persistDocumentAndLog`
writes a mirror record to `public.documents`:

| Field | Value set |
|-------|----------|
| `type` | `'quote'` or `'invoice'` |
| `linked_entity_type` | `'quote'` or `'invoice'` |
| `linked_entity_id` | `quote.id` or `invoice.id` (UUID PK) |
| `client_ref` | `client.id` (UUID PK from public.clients) |
| `platform` | `'web'` |

This creates a document record that is **visible in the member app** (`/app/quotes` or
`/app/invoices`), but the `client_ref` field points to `clients.id`, not to
`client_record_id`. No lead/job linkage is stored.

**Deduplication key**: `uq_documents_entity_identity` partial unique index on
`(workspace_id, linked_entity_type, linked_entity_id, type)`. Regenerating a PDF
increments `version` rather than creating a duplicate row.

---

## Part 5 — UI Entry Points Summary

### Where quotes are created today

| Entry Point | Path | System | Target table |
|-------------|------|--------|-------------|
| Staff web portal | `/dashboard/app/quotes/new` (or similar) | B | `public.quotes` |
| Scan-to-Layout PDF | `/app/scan-to-layout` → QuoteSummary | D | `public.documents` |
| Android app | (mobile) | C | `public.documents` |
| Legacy API (dead) | `POST /api/quotes` | A | Prisma `quote` |

### Where quotes are viewed today

| Page | Data source | System |
|------|------------|--------|
| `/app/quotes` | `GET /api/workspace/documents` (type includes 'quote') | C/D/B-PDF |
| `/dashboard/client/quotes` | Direct Supabase `.from('quotes')` query | B |
| `/app/scan-to-layout` | In-memory `GeneratedQuote` state | D |

### Where invoices are created today

| Entry Point | System | Target table |
|-------------|--------|-------------|
| Staff creates direct | `POST /api/invoices` (session) | B | `public.invoices` |
| From accepted quote | `POST /api/quotes/:id/create-invoice` | B | `public.invoices` |
| Android app | (mobile) | C | `public.documents` |
| Legacy API (dead) | `POST /api/invoices` (Prisma) | A | Prisma `invoice` |

---

## Part 6 — Acceptance / Locking Flow (System B detail)

```
POST /api/quotes/:id/accept
  Auth: session (supabase.auth.getUser)
  Checks: quote.status === 'draft'|'sent'
          user_profiles.client_id === quote.client_id
  
  Creates: quote_acceptance_snapshot {
    quote_id,
    accepted_by (user.id),
    acceptance_ip,
    items_snapshot (JSONB: quote_items at moment of acceptance),
    subtotal, vat_amount, total, balance_due,
    acceptance_note
  }
  
  Updates: quotes { status:'accepted', is_locked:true, accepted_at, accepted_by,
                    acceptance_ip, acceptance_note }
```

```
POST /api/quotes/:id/create-invoice
  Auth: session (supabase.auth.getUser)
  Checks: quote.is_locked === true, quote.status === 'accepted'
          invoice does not already exist (quote.invoice_id check)
  
  Source of items: quote_acceptance_snapshot.items_snapshot (NOT live quote_items)
  
  Creates: invoices {
    business_id, client_id, quote_id,
    invoice_number, issue_date, due_date,
    currency, notes,
    terms: quote.terms_and_conditions,
    status: 'draft'
  }
  Creates: invoice_items (from items_snapshot)
  
  Updates: quotes { invoice_id: newInvoiceId }
```

**IDs available at invoice creation**: `business_id`, `client_id`, `quote_id`.
No CRM linkage at any step.

---

## Part 7 — Convert Lead → Job Flow (CRM, separate from quotes/invoices)

```
POST /api/workspace/leads/:id/convert
  Input: leadId (UUID — leads.id PK)
  
  1. Fetch lead (workspace_id scoped)
  2. Fetch document_pdf_info for VAT rate
  3. Sum tool_attachments totals WHERE parent_id = leadId (uses leads.id PK)
  4. Create job { client_record_id: lead.client_record_id, lead_id: lead.id, ... }
  5. reassignToolAttachmentsToJob(resolved, leadId, job.id)
       → UPDATE tool_attachments
           SET parent_id = job.id, parent_type = 'JOB'
           WHERE parent_id = leadId  (i.e. WHERE parent_id = leads.id PK)
  6. UPDATE leads SET status = 'WON'
  7. logHistory(...)
```

**Critical**: Step 3 and 5 use `leads.id` (Postgres PK) as the parent_id. This only
matches **website-created** tool attachments. Android-created tool attachments that
use `leads.client_record_id` as `parent_id` are NOT reassigned by this flow.

---

## Part 8 — Potential Future Bridge Options (For Reference Only)

> **NOT implementing anything here.** These options are documented to inform future
> design decisions. See `docs/audit/website-quote-invoice-lead-job-bridge-implementation.md`
> for the W5 rejection context.

### Option A — Add `client_record_id` to `public.quotes` and `public.invoices`

**Prerequisite**: When creating a quote from a lead context, pass
`lead.client_record_id` into `quote.client_record_id`.

**PDF route lookup**: `tool_attachments.parent_id = quote.client_record_id`

**Android contract compliance**: ✅ Uses `client_record_id` as the canonical identity.

**Risk**: Requires UI changes to pass lead context into quote creation; `client_record_id`
is nullable on leads (website-created leads may not have one until a sync).

### Option B — Add `client_record_id` to `public.clients`

If `public.clients` stored `client_record_id`, then the existing `quotes.client_id →
clients.client_record_id` path would close the gap without schema changes to
`public.quotes`.

**Risk**: Android's `clients` table definition is the authoritative source; website
`ClientRow` does not currently include this field. Requires Android contract audit.

### Option C — Indirect path via `clients.id` join

`documents.client_ref = client.id` → look up `leads.client_id = client.id` →
`leads.client_record_id`. This works only if:
- Every quote has a `client_id`
- Every lead has a `client_id` FK pointing to the same `clients.id`
- `leads.client_record_id` is populated (nullable today)

**Risk**: Multi-hop join across three tables; `leads.client_id` may not always be set.

### Option D — CRM linkage table (no schema alteration)

New table `quote_crm_links (quote_id, client_record_id, lead_id, job_id)`.
Populated explicitly when a quote is created from a lead context.

**Risk**: Requires explicit UI flow; linkage is opt-in, not automatic.

---

## Part 9 — Verified Invariants

1. `public.quotes.business_id === public.invoices.business_id === workspace_id` — all
   three refer to the same workspace UUID. `business_id` and `workspace_id` are used
   interchangeably in the codebase.

2. `public.documents` is the **single display source** for the member app (`/app/*`).
   Neither `public.quotes` nor `public.invoices` are queried by any `/app/*` page.

3. Every `public.documents` row written by `persistDocumentAndLog` has:
   - `platform = 'web'`
   - `version >= 1` (incremented on PDF regeneration)
   - `linked_entity_type` / `linked_entity_id` only if the source entity has a UUID
     (not set for Android-synced rows, which arrive pre-formed)

4. `public.clients` (website) has **no `client_record_id` column**. The only tables
   with `client_record_id` are: `leads`, `jobs`, `tool_attachments`.

5. The `quote_acceptance_snapshot` table is the **immutable source of truth** for
   invoice line items. The live `quote_items` table is NOT used for invoice creation
   after acceptance.

6. Website CRM convert (`leads → jobs`) only reassigns tool_attachments where
   `parent_id = leads.id`. Android tool_attachments (where `parent_id =
   leads.client_record_id`) are unaffected by the website convert flow.

---

## Part 10 — File Reference Map

| File | Purpose |
|------|---------|
| `src/hooks/useQuote.ts` | Client-side Supabase hook for quote CRUD (System B) |
| `src/lib/validators/quoteSchemas.ts` | Zod schema for quote creation |
| `src/lib/validators/invoiceSchemas.ts` | Zod schema for invoice creation |
| `src/lib/db.ts` | Legacy Prisma `createQuote` / `createInvoice` (System A) |
| `src/lib/workspace-data.ts` | `persistDocumentAndLog`, `DocumentRow`, `ClientRow`, `LeadRow`, `JobRow`, `ToolAttachmentRow`, `getDocuments`, `reassignToolAttachmentsToJob` |
| `src/lib/pdf/tool-payload.ts` | PDF item extraction for documents route (System C) |
| `src/app/api/quotes/route.ts` | Prisma legacy route (System A) |
| `src/app/api/quotes/[id]/pdf/route.ts` | Quote PDF + `persistDocumentAndLog` (System B) |
| `src/app/api/quotes/[id]/accept/route.ts` | Quote acceptance + snapshot (System B) |
| `src/app/api/quotes/[id]/create-invoice/route.ts` | Quote → invoice promotion (System B) |
| `src/app/api/invoices/route.ts` | Direct invoice creation (System B) |
| `src/app/api/invoices/[id]/pdf/route.ts` | Invoice PDF + `persistDocumentAndLog` (System B) |
| `src/app/api/workspace/documents/route.ts` | Documents list endpoint (System C/D) |
| `src/app/api/workspace/documents/[id]/pdf/route.ts` | Document PDF (System C, W4 v2.2) |
| `src/app/api/workspace/layout-quote-pdf/route.ts` | Layout quote PDF → documents (System D) |
| `src/app/api/workspace/leads/[id]/convert/route.ts` | Lead → Job conversion (CRM) |
| `src/app/api/workspace/tool-attachments/route.ts` | Tool attachment create/list |
| `src/app/(member)/app/quotes/page.tsx` | Member app quotes list (reads documents) |
| `src/app/(member)/app/invoices/page.tsx` | Member app invoices list (reads documents) |
| `src/app/(member)/app/leads/[id]/page.tsx` | Lead detail — tool cards by `parent_id = lead.id` |
| `src/app/dashboard/client/quotes/page.tsx` | Client portal quote list (reads public.quotes) |
| `src/app/dashboard/client/quotes/[id]/page.tsx` | Client portal quote accept/reject |
| `src/components/planner/QuoteSummary.tsx` | Scan-to-layout quote PDF trigger (System D) |
| `supabase/sql/DEFERRED_DO_NOT_RUN_phase_w5_quote_invoice_lead_job_bridge.sql` | Rejected W5 migration — DO NOT RUN |

---

*Audit complete. Next step: design the bridge using one of the Options in Part 8,
starting with an Android contract verification of whether `public.clients` can carry
`client_record_id`.*
