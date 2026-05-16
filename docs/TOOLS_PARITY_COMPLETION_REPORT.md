# TISSCA WEBSITE — Tools Parity Completion + Reopen/Edit + Survey/Calendar

## PROOF REPORT — Strict Verification

**Date:** Generated during build-verified implementation session  
**Build status:** ✅ PASSING (`npx next build` — zero errors)

---

## P1: Supabase Contract — Top-Level Android Parity Columns

### SQL Migration
**File:** `supabase/sql/phase_tools_parity_columns.sql`

Adds 6 top-level columns to `tool_attachments`:
| Column | Type | Purpose |
|---|---|---|
| `tool_key` | text | Android ToolKey string (e.g. `kitchen`) |
| `tool_title` | text | Human-readable title |
| `values_text` | text | Android-compatible summary text |
| `total` | numeric(12,2) | Top-level total for column-level queries |
| `user_notes` | text | Notes separated from rawPayload |
| `raw_payload` | text | JSON string with `_toolKey` + sections + financials |

**Index:** `idx_tool_attachments_tool_key` on `tool_key WHERE tool_key IS NOT NULL`

### Data Layer Proof
**File:** `src/lib/workspace-data.ts`

- `ToolAttachmentRow` — 6 new fields added: `tool_key`, `tool_title`, `values_text`, `total`, `user_notes`, `raw_payload`
- `CreateToolAttachmentInput` — 6 new optional fields matching above
- `createToolAttachment()` — INSERT now writes all 6 top-level columns
- `updateToolAttachment()` — Accepts optional `topLevel` parameter with all 6 fields
- `sumToolAttachmentTotals()` — Prefers top-level `total` column, falls back to JSONB paths for legacy rows

### API Route Proof
**File:** `src/app/api/workspace/tool-attachments/route.ts`

- POST: Extracts `tool_key`, `tool_title`, `values_text`, `total`, `user_notes`, `raw_payload` from body → passes to `createToolAttachment`
- PATCH: Extracts same 6 fields → passes as `topLevel` to `updateToolAttachment`

---

## P2: Reopen/Edit for All 17 Trade Tools

### TradeToolForm Edit Mode
**File:** `src/components/tools/TradeToolForm.tsx`

- New prop: `attachmentId?: string | null`
- Edit state: `isEditMode`, `editAttachmentId`, `editLoading`, `editHydrated` ref
- **Hydration flow:**
  1. If `attachmentIdProp` present → fetch GET `/api/workspace/tool-attachments`
  2. Find attachment by ID
  3. Parse `raw_payload` (prefer top-level, fall back to `result_data.raw_payload`, then `result_data.payload`)
  4. Hydrate `rows[]` from `payload.sections[].rows[]` with correct `sectionKey`, `description`, `quantity`, `unit`, `unitPrice`, `costBucket`
  5. Hydrate financials: `discount_percent`, `vat_percent`, `deposit_amount`
  6. Hydrate notes: prefer `att.user_notes`, fall back to JSONB, fall back to `payload.notes`
- **Save flow:** `handleUpdateAttachment()` → PATCH with `id`, `result_data`, `tool_key`, `tool_title`, `values_text`, `total`, `user_notes`, `raw_payload`
- **UI:** "Editing" badge on header, "Save Changes" / "Cancel" / "Reset" buttons in edit mode
- Draft persistence disabled in edit mode (no draft overwrite)
- Success screen handles `type: 'update'` with "Back" button

### Trade Tool Page
**File:** `src/app/(member)/app/tools/trade/[toolKey]/page.tsx`

- Now reads `useSearchParams().get('attachmentId')`
- Passes `attachmentId` prop to `TradeToolForm`
- Edit URL pattern: `/app/tools/trade/kitchen?attachmentId=<uuid>`

### Lead Detail "Edit in tool" Links (already working)
**File:** `src/app/(member)/app/leads/[id]/page.tsx`

- Tool attachment cards have "Edit in tool →" button
- Links to `${route}?attachmentId=${card.id}` — works for both general and all 17 trade tools

---

## P5: Survey Date + CRM Date Columns

### SQL Migration
**File:** `supabase/sql/phase_tools_parity_columns.sql` (same file)

Adds 4 date columns to `leads`:
| Column | Type |
|---|---|
| `survey_date` | timestamptz |
| `materials_delivery_date` | timestamptz |
| `work_start_date` | timestamptz |
| `work_finish_date` | timestamptz |

**Index:** `idx_leads_survey_date` on `survey_date WHERE survey_date IS NOT NULL`

### Data Layer Proof
**File:** `src/lib/workspace-data.ts`

- `LeadRow` — 4 new fields: `survey_date`, `materials_delivery_date`, `work_start_date`, `work_finish_date`
- `CreateLeadInput` — 4 new optional date fields
- `UpdateLeadInput` (= `Partial<CreateLeadInput>`) — automatically includes them
- `createLead()` — INSERT includes all 4 date columns
- `updateLead()` — UPDATE handles all 4 date fields conditionally
- Prisma fallback mapper — 4 new fields mapped (null for legacy rows)

### API Route Proof
**File:** `src/app/api/workspace/leads/route.ts`

- POST: Extracts `survey_date`, `materials_delivery_date`, `work_start_date`, `work_finish_date` from body
- PATCH: Handles all 4 new date fields conditionally

### Create Lead Page
**File:** `src/app/(member)/app/leads/create/page.tsx`

- 4 new state fields: `surveyDate`, `materialsDeliveryDate`, `workStartDate`, `workFinishDate`
- "Project Dates" section with 2x2 grid of date inputs
- POST body includes all 4 date fields

### Lead Detail Page
**File:** `src/app/(member)/app/leads/[id]/page.tsx`

- `Lead` type includes all 4 new date fields
- "Project dates" section in details grid — conditionally rendered with colour-coded labels:
  - Survey: purple
  - Materials Delivery: amber
  - Work Start: emerald
  - Work Finish: rose
- Timeline sidebar shows all CRM dates with matching colours

---

## P7: Calendar with All 5 Date Types + Colour Coding

### Calendar Types
**File:** `src/lib/calendar/calendar-types.ts`

- `CalendarDateType`: `survey` | `follow_up` | `materials_delivery` | `work_start` | `work_finish`
- `CalendarEvent`: `{ id, dateType, date, entityId, entityName, entitySource, value }`
- `DATE_TYPE_COLOURS`: 5 distinct palettes (purple, blue, amber, emerald, rose)
- `ALL_DATE_TYPES`: ordered array for legend/filters

### Calendar Page (v2.0)
**File:** `src/app/(member)/app/calendar/page.tsx`

- **Data sources:** Fetches BOTH `/api/workspace/leads` AND `/api/workspace/jobs`
- **Event extraction:**
  - Leads → `follow_up`, `survey`, `materials_delivery`, `work_start`, `work_finish` (5 types)
  - Jobs → `work_start` (from `scheduled_date`), `work_finish` (from `due_date`)
- **Filter bar:** Toggleable pill buttons for each date type with counts
- **Calendar grid:** Colour-coded dots by date type (not status)
- **Selected day panel:** Events listed with type colour, entity name, source (Lead/Job), value
- **Sidebar:** "Upcoming Events" sorted by date, "Summary" with lead/job/event counts

---

## Data Flow Verification

### Create → Lead → Edit → Calendar

1. **Tool form** → POST with `tool_key`, `values_text`, `total`, `user_notes`, `raw_payload` (top-level)
2. **Generate Lead** → sessionStorage carry-forward → Create Lead page → POST with `survey_date` etc.
3. **Lead detail** → "Edit in tool →" → `/app/tools/trade/{key}?attachmentId={id}`
4. **Trade tool edit mode** → hydrate from `raw_payload` → PATCH with all top-level fields
5. **Calendar** → fetches leads + jobs → extracts all 5 date types → colour-coded display

### Column-Level Queries (Android Parity)

Before: `SELECT result_data->>'total_value' FROM tool_attachments` (JSONB path)  
After: `SELECT total FROM tool_attachments WHERE tool_key = 'kitchen'` (column-level)

---

## Files Changed

| File | Change |
|---|---|
| `supabase/sql/phase_tools_parity_columns.sql` | NEW — SQL migration |
| `src/lib/workspace-data.ts` | Updated types + CRUD for tool_attachments + leads |
| `src/app/api/workspace/tool-attachments/route.ts` | POST/PATCH pass top-level fields |
| `src/app/api/workspace/leads/route.ts` | POST/PATCH pass CRM date fields |
| `src/components/tools/TradeToolForm.tsx` | Full edit mode (fetch, hydrate, PATCH) |
| `src/app/(member)/app/tools/trade/[toolKey]/page.tsx` | Pass attachmentId from URL |
| `src/app/(member)/app/leads/create/page.tsx` | 4 CRM date inputs + POST body |
| `src/app/(member)/app/leads/[id]/page.tsx` | Display CRM dates + colour labels |
| `src/lib/calendar/calendar-types.ts` | NEW — Central date type colours |
| `src/app/(member)/app/calendar/page.tsx` | v2.0 — All 5 types, leads+jobs, filters |

---

## Pre-Deployment Checklist

- [x] `npx next build` passes with zero errors
- [ ] Run SQL migration in Supabase SQL Editor (must be done before deploying)
- [ ] Deploy with `vercel --prod`
- [ ] Test: Create trade tool estimate → Generate Lead → verify top-level columns in Supabase
- [ ] Test: Open lead detail → "Edit in tool" → verify hydration → save → verify PATCH
- [ ] Test: Create lead with survey_date → verify in calendar
- [ ] Test: Calendar shows both lead and job events with correct colours
