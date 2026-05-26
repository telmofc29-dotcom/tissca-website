# TISSCA Website — PDF, rawPayload & Quote/Invoice Bridge Parity
## Phase W4 Audit & Implementation Report

**Date:** 2026-05-19  
**Build status at delivery:** ✅ Clean (`✓ Compiled successfully`)  
**Scope:** Documents PDF route multi-tool support, rawPayload format parity, quote/invoice bridge gap

---

## 1. PDF Architecture Map

Three separate PDF routes share a single rendering engine:

| Route | Auth | Items source | Tool-aware? |
|-------|------|-------------|-------------|
| `GET /api/workspace/documents/[id]/pdf` | Bearer token | `tool_attachments.raw_payload` → `doc.items` fallback | ✅ YES (v2.2) |
| `GET /api/quotes/[id]/pdf` | `supabase.auth.getUser()` | `quote_items` table | ❌ NO |
| `GET /api/invoices/[id]/pdf` | `supabase.auth.getUser()` | `invoice_items` table | ❌ NO |

All three call `renderPdfBody()` from `src/lib/pdf/branding.ts` (v820 lines, unchanged in W4).

---

## 2. rawPayload Format Map

Four distinct rawPayload formats exist in the system. The dispatcher `extractItemsFromPayload()` in `src/lib/pdf/tool-payload.ts` detects the format automatically:

### Format A — Website `TradeToolPayload` (from `buildRawPayload()`)
```json
{
  "_toolKey": "kitchen",
  "sections": [{ "key": "...", "title": "...", "rows": [{ "id", "description", "quantity", "unit", "unit_price", "amount", "cost_bucket" }] }],
  "subtotal": 0, "discount_percent": 0, "discount_amount": 0,
  "after_discount": 0, "vat_percent": 0, "vat_amount": 0,
  "total": 0, "deposit_amount": 0, "balance_due": 0, "generated_at": "..."
}
```
Detection: has `_toolKey` field AND `sections` array.

### Format B — Website `GeneralEstimatePayload` (from `general/page.tsx`)
```json
{
  "tool_key": "general_estimate",
  "project_name": "...",
  "line_items": [{ "index", "description", "quantity", "unit_price", "amount", "cost_bucket" }],
  "subtotal": 0, "discount_percent": 0, "discount_amount": 0,
  "after_discount": 0, "vat_percent": 0, "vat_amount": 0,
  "total": 0, "deposit_paid": 0, "balance_due": 0
}
```
Detection: `tool_key === 'general_estimate'` AND has `line_items` array.

### Format C — Android flooring tool (`FlooringScreen.kt buildRawPayload()`)
```json
{
  "rooms": [{ "name", "length", "width", "sqm", "isVisibleToClient" }],
  "flooringType": "lvt",
  "costPerSqm": "22.0",
  "items": [{ "name", "qty", "price", "unit", "costBucket" }]
}
```
Detection: `tool_key === 'flooring'` OR has `rooms`/`flooringType`/`costPerSqm` fields.  
Special handling: sqm values come from `items[].qty` (unit-corrected), NOT `rooms[].length × rooms[].width`.

### Format D — Android generic trade tool
```json
{
  "items": [{ "name", "qty", "price", "unit", "costBucket" }],
  "subtotal": 0, "discount_percent": 0, "deposit_amount": 0, "total": 0
}
```
Detection: has `items` array at root (and not Format C).

---

## 3. Shared Helper Library: `src/lib/pdf/tool-payload.ts` (NEW)

Created as part of W4. Centralises all rawPayload parsing and item extraction.

### Exports

| Export | Purpose |
|--------|---------|
| `PdfItem` | Canonical item type: `{description, unit, qty, price, total}` |
| `parseRawPayload(raw)` | Safe JSON.parse wrapper, returns `null` on failure |
| `extractRawPayloadFinancials(raw)` | Extracts `{depositAmount, discountPercent}` for convert route |
| `cleanDisplayLabel(id)` | Mirrors Android `cleanDisplayLabel()`: underscore→space, title-case |
| `normaliseAreaItem(it)` | Corrects mm² → m² heuristic for area items with qty ≥ 10,000 |
| `flexNormaliseItem(raw)` | Maps camelCase/snake_case field variants to canonical PdfItem shape |
| `deduplicateItems(items)` | Deduplicates by `description|unit|qty|price` key |
| `extractItemsFromPayload(toolKey, rawPayload)` | **Primary dispatcher** — detects format and extracts PdfItem[] |

---

## 4. Documents Route Changes (v2.1 → v2.2)

**File:** `src/app/api/workspace/documents/[id]/pdf/route.ts`

### What changed

**Removed** (now in `tool-payload.ts`):
- `type PdfItem` (local definition)
- `function normaliseAreaItem()`
- `function flexNormaliseItem()`
- `function deduplicateItems()`
- `function cleanDisplayLabel()`
- `function extractFlooringItems()` (~90 lines, flooring-only Android port)

**Changed: single attachment → all attachments**

Before (v2.1):
```typescript
// Fetched only the most recent attachment, flooring only
const { data: toolAttachment } = await supabase
  .from('tool_attachments')
  .select('tool_key, raw_payload, values_text')
  ...
  .limit(1)
  .maybeSingle();

let items: PdfItem[];
if (toolKey === 'flooring' && toolRawPayload) {
  items = deduplicateItems(extractFlooringItems(toolRawPayload));
} else {
  items = deduplicateItems(rawItems.map(flexNormaliseItem).map(normaliseAreaItem));
}

// values_text only for flooring
if (toolKey === 'flooring' && toolValuesText?.trim()) {
  bottomNotes = ...
}
```

After (v2.2):
```typescript
// Fetches ALL attachments in creation order
const { data: attachments } = await supabase
  .from('tool_attachments')
  .select('tool_key, raw_payload, values_text, user_notes')  // + user_notes
  ...
  .order('created_at_millis', { ascending: true });          // all, no limit

// Extracts items from every attachment using format-auto-detector
const extracted: PdfItem[] = [];
for (const ta of toolAttachments) {
  if (ta.raw_payload) {
    extracted.push(...extractItemsFromPayload(ta.tool_key, ta.raw_payload));
  }
}
items = deduplicateItems(extracted);
// Falls back to doc.items if nothing extracted

// user_notes + values_text for ALL tools
for (const ta of toolAttachments) {
  if (ta.user_notes?.trim()) bottomNotes = append(bottomNotes, ta.user_notes);
  if (ta.values_text?.trim()) bottomNotes = append(bottomNotes, ta.values_text);
}
```

### Gaps fixed

| Gap | Before | After |
|-----|--------|-------|
| Multi-tool leads/jobs | Only most recent attachment shown | All attachments concatenated |
| Non-flooring tools | Fell back to `doc.items` (generic) | Full rawPayload extraction for all 18 tool keys |
| `user_notes` in PDF | Not included | Included for all tools |
| General estimate format | Not handled | `line_items[]` extraction supported |
| Website TradeToolPayload | Not handled | `sections[].rows` extraction supported |

---

## 5. Convert Route Changes (v1.0 → v1.2)

**File:** `src/app/api/workspace/leads/[id]/convert/route.ts`

Replaced inline `JSON.parse` + manual field access with typed helper:

```typescript
// Before (v1.0 — inline):
let payload: Record<string, unknown> = {};
try {
  if (row.raw_payload) payload = JSON.parse(row.raw_payload as string);
} catch { continue; }
if (typeof payload.deposit_paid === 'number' || typeof payload.deposit_amount === 'number') {
  depositRequested += (payload.deposit_amount ?? payload.deposit_paid ?? 0) as number;
}
if (typeof payload.discount_percent === 'number' && payload.discount_percent > 0) {
  toolDiscountPercent = payload.discount_percent;
}

// After (v1.2 — typed helper):
const { depositAmount, discountPercent } = extractRawPayloadFinancials(row.raw_payload);
depositRequested += depositAmount;
if (discountPercent > 0) toolDiscountPercent = discountPercent;
```

`extractRawPayloadFinancials()` handles all four payload formats: reads `deposit_amount` (Website/Android generic), `deposit_paid` (GeneralEstimate legacy), and `discount_percent` consistently.

---

## 6. Quote / Invoice Route Findings (No Changes Required)

Both quote and invoice PDF routes were audited and found to be **correct for their own system** but **not tool-attachment aware**.

### `GET /api/quotes/[id]/pdf`
- Auth: `supabase.auth.getUser()` (session-based, not Bearer token — intentional for web UI)
- Items: from `quote_items` table (`custom_description` field, `|| 'Service'` fallback)
- Finance: `discount_type`/`discount_value`, `deposit_type`/`deposit_value` on `quotes` table
- Gap: No `lead_id`/`job_id` columns → cannot link to `tool_attachments`

### `GET /api/invoices/[id]/pdf`
- Auth: `supabase.auth.getUser()` (session-based)
- Items: from `invoice_items` table (`description` field, `|| 'Service'` fallback)
- Finance: `calculateInvoiceTotals()`, payments deducted for `balance_due`
- Gap: No `lead_id`/`job_id` columns → cannot link to `tool_attachments`

Both routes call `renderPdfBody()` correctly. No changes made.

---

## 7. Schema Migration Proposal: Quote/Invoice → Lead/Job Bridge

**Status: PROPOSAL ONLY — NOT executed**

To allow quotes and invoices to reference leads/jobs and gain tool-attachment awareness, the following nullable columns could be added:

```sql
-- Link quotes to a lead (optional, backward-compatible)
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;

-- Link invoices to a lead or job (optional, backward-compatible)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_id  uuid REFERENCES public.jobs(id)  ON DELETE SET NULL;

-- No new RLS policies needed — workspace_id already present on both tables
```

**Impact if executed:**
- No data loss (all new columns nullable)
- Existing quotes/invoices continue to work with `lead_id = NULL`
- After migration, PDF routes could JOIN to `tool_attachments` via `lead_id`/`job_id`
- Android CRM sync could populate `lead_id`/`job_id` on quote/invoice creation

This migration was not executed in W4 as it requires product decision (should web quotes be linked to CRM leads?) and RLS review.

---

## 8. Remaining Gaps (Out of W4 Scope)

| Gap | Location | Severity | Notes |
|-----|----------|----------|-------|
| Quote/invoice PDF not tool-aware | `quotes/[id]/pdf`, `invoices/[id]/pdf` | LOW | Schema migration required to bridge. Not executed. |
| Invoice items unit hardcoded `'Item'` | `invoices/[id]/pdf` (line ~95) | LOW | No unit column in `invoice_items`. Acceptable. |
| Quote/invoice auth uses session not Bearer | Both PDF routes | INFO | Intentional — web UI uses session. Android doesn't call these routes. |

---

## 9. Build Result

```
✓ Compiled successfully
[vercel-fix-next-manifests] Skipping (not Vercel).
```

Zero TypeScript errors. All pre-existing ESLint warnings unchanged (unrelated to W4 files).

---

## 10. Files Changed in W4

| File | Change |
|------|--------|
| `src/lib/pdf/tool-payload.ts` | **NEW** — shared rawPayload parsing + item extraction library |
| `src/app/api/workspace/documents/[id]/pdf/route.ts` | v2.1 → v2.2: multi-tool, all formats, `user_notes` |
| `src/app/api/workspace/leads/[id]/convert/route.ts` | v1.0 → v1.2: use `extractRawPayloadFinancials` |
| `docs/audit/website-pdf-rawpayload-quote-invoice-bridge-parity.md` | **NEW** — this file |
