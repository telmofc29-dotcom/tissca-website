# Website Dashboard + PDF Notes Cleanup

Date: 2026-05-19

Scope:
- Website only
- No SQL
- No Supabase schema changes
- No Android/iOS changes

## Summary

Two separate website-only issues were addressed:

1. The member dashboard overview page was still using an older light theme and a weaker auth/data-loading path.
2. The shared documents PDF route was automatically appending `tool_attachments.values_text` into the bottom `NOTES` box even when the same tool payload had already been rendered as structured table items.

## Dashboard audit

Owning file:
- `src/app/(member)/app/overview/page.tsx`

Root cause:
- The overview page fetched its token via `getSupabaseClient().auth.getSession()` instead of the already-proofed `WorkspaceContext` flow used by the rest of the member app.
- That made the page more fragile than other member routes and left it on an older light-card implementation.

Fix applied:
- Switched the page to `useWorkspace()`.
- Reused the member app's existing auth context for `accessToken`, `isLoading`, `error`, and `refresh()`.
- Restyled the overview surface using existing TISSCA navy/gold tokens (`bg-navy`, `bg-navy-light`, gold accents) without redesigning the app shell.
- Added a visible retry state if workspace stats fail to load.

Result:
- The dashboard now renders on the same authenticated data path as the rest of `/app`.
- The overview content uses a premium dark TISSCA surface instead of white cards on a light background.

## PDF notes audit

Audited files:
- `src/app/api/workspace/documents/[id]/pdf/route.ts`
- `src/app/api/quotes/[id]/pdf/route.ts`
- `src/app/api/invoices/[id]/pdf/route.ts`
- `src/lib/pdf/branding.ts`
- `src/lib/pdf/tool-payload.ts`

Findings:

### 1. Exact reason page 2 was created

The extra second page was not caused by the item table.

It was caused by `src/app/api/workspace/documents/[id]/pdf/route.ts` building `bottomNotes` like this:

1. `doc.footer_notes`
2. `attachment.user_notes`
3. `attachment.values_text`

For flooring documents, `values_text` contains a long raw/generated semantic breakdown such as:

- `TISSCA – FLOORING`
- `FLOOR AREAS`
- `FLOORING SUPPLY`
- `SKIRTING & FINISHING`
- `LABOUR`

At the same time, the route was already extracting proper table line items from `raw_payload` via `extractItemsFromPayload()`.

That meant the same tool content appeared twice:

- once correctly in the item table
- then again as raw text in `NOTES`

`renderPdfBody()` in `src/lib/pdf/branding.ts` correctly checks whether the notes box fits below totals. When the appended `values_text` block is long, the notes box overflows the remaining page-1 space and is moved to a continuation page. That is why page 2 appeared.

### 2. Quote and invoice routes

`src/app/api/quotes/[id]/pdf/route.ts` and `src/app/api/invoices/[id]/pdf/route.ts` already pass only:

- header/user notes into `headerNotes`
- terms/payment text into `bottomNotes`

They were not the source of the duplicate flooring breakdown.

### 3. Branding renderer

`src/lib/pdf/branding.ts` was behaving correctly.

The renderer did not create a false page. It only moved the `NOTES` section to page 2 because the notes content supplied by the route was too large to fit on page 1.

### 4. Tool payload extraction

`src/lib/pdf/tool-payload.ts` was already extracting structured items correctly from:

- Android flooring payloads
- Android generic tool payloads
- website TradeToolPayload payloads
- website GeneralEstimate payloads

The duplication bug was downstream of extraction, in notes assembly.

## PDF fix applied

Owning file changed:
- `src/app/api/workspace/documents/[id]/pdf/route.ts`

Behaviour change:
- If tool-aware items are successfully extracted from tool attachments into the PDF item table, `values_text` is no longer auto-appended into `bottomNotes`.
- `user_notes` are still preserved in `NOTES`.
- `doc.footer_notes` are still preserved in `NOTES`.
- `values_text` is only appended when no tool-aware items were extracted, which keeps it as a fallback rather than an automatic duplicate block.

Result for the reported flooring invoice:
- Page 1 keeps the flooring item table.
- `NOTES` only keeps the genuine user note, such as `1 sqm to be delivered 3 days after the first delivery.`
- The raw flooring breakdown no longer becomes a forced extra notes page unless some future route explicitly chooses to include it.

## Files changed

Dashboard:
- `src/app/(member)/app/overview/page.tsx`

PDF:
- `src/app/api/workspace/documents/[id]/pdf/route.ts`

Audit:
- `docs/audit/website-dashboard-pdf-notes-cleanup.md`

## Validation

Validation command:

```bash
npm run build
```

Build proof:
- `next build` completed successfully.
- `Compiled successfully`
- `Generating static pages (170/170)`
- Only pre-existing lint warnings remain outside this change set.