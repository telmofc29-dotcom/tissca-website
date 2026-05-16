# Website General Tool Vertical Slice — Phase 1-2 Report

**Date:** 2025-07-16
**Status:** COMPLETE
**Build:** PASSING (`npx next build` — zero errors)

---

## Objective

Lock the shared data architecture and prove one real structured tool pipeline using the General Tool. This is the canonical "vertical slice" that future tools (Flooring, Plumbing, Bathroom, etc.) will copy.

**Lifecycle proven:** Tool → Lead → Job → Calendar → Revenue

---

## Phase 1: Shared Data Architecture

### Created: `src/lib/tools/tool-types.ts`

Single source of truth for the entire tool→lead→job lifecycle.

| Concept | Type/Function | Purpose |
|---------|---------------|---------|
| `ToolKey` | Union type | Stable identifier: `'general_estimate'` — future tools extend this |
| `TOOL_TITLES` | Map | ToolKey → human-readable title |
| `TOOL_ROUTES` | Map | ToolKey → app route for reopening |
| `TOOL_ICONS` | Map | ToolKey → emoji icon for cards |
| `ToolLineItem` | Interface | Shared line item (index, description, amount) |
| `GeneralEstimatePayload` | Interface | Typed version of General Tool's result_data |
| `ToolPayload` | Discriminated union | All tool payloads (extensible via `tool_key`) |
| `ToolAttachment` | Interface | Full Supabase record shape |
| `ToolAttachmentResultData` | Interface | Contents of `result_data` jsonb: tool_key, preview_text, total_value, payload |
| `ToolCardSummary` | Interface | Minimal shape for rendering attachment cards |
| `buildPreviewText()` | Function | Canonical preview string from any ToolPayload |
| `buildResultData()` | Function | Build full result_data jsonb from a payload |
| `attachmentToCard()` | Function | Convert raw API attachment → renderable card (handles legacy + new format) |
| `toolKeyToTitle()` | Function | Look up human title from tool key |
| `toolKeyToRoute()` | Function | Look up app route from tool key |
| `toolKeyToIcon()` | Function | Look up icon from tool key |
| `fmtToolCurrency()` | Function | Format £ currency values |
| `saveDraft()` | Function | Save tool draft to localStorage |
| `loadDraft()` | Function | Load tool draft from localStorage (7-day expiry) |
| `clearDraft()` | Function | Clear tool draft from localStorage |
| `hasDraft()` | Function | Check if a draft exists |

### Design Decisions

1. **`tool_key` lives inside `result_data`** — No schema migration required. Backward compatible with existing legacy attachments.
2. **`preview_text` and `total_value` are stored alongside the payload** — Enables card rendering without parsing the full payload.
3. **Discriminated union via `tool_key` field** — Future tools add new payload interfaces and extend the `ToolPayload` union.
4. **Legacy support** — `attachmentToCard()` handles old-format attachments (flat `result_data`) gracefully.
5. **Draft persistence** — localStorage with 7-day expiry. Auto-saves on changes (800ms debounce). Clears on success or manual clear.

---

## Phase 2: General Tool Vertical Slice

### Upgraded: `src/app/(member)/app/tools/general/page.tsx` (v1.0 → v2.0)

| Feature | Status | Details |
|---------|--------|---------|
| Line items (description + amount) | ✅ Preserved | No change from v1.0 |
| Adjustments (discount, VAT, deposit) | ✅ Preserved | No change from v1.0 |
| Notes section | ✅ Preserved | No change from v1.0 |
| Summary with subtotal/total | ✅ Preserved | No change from v1.0 |
| Generated breakdown text | ✅ Preserved | No change from v1.0 |
| **Generate Lead** | ✅ Enhanced | Now uses typed `GeneralEstimatePayload` + `buildResultData()` |
| **Add to Lead** | ✅ NEW | Fetches existing leads via picker with search, attaches estimate |
| **Add to Job** | ✅ NEW | Fetches existing jobs via picker with search, attaches estimate |
| **Clear** | ✅ NEW | Resets form + clears draft from localStorage |
| **Draft persistence** | ✅ NEW | Auto-saves to localStorage, auto-restores on mount, "Draft restored" badge |
| **Typed payloads** | ✅ NEW | All attachments use `ToolAttachmentResultData` via `buildResultData()` |
| **Success states** | ✅ Enhanced | Distinct messages for new_lead / add_to_lead / add_to_job |

### Action Buttons

```
[ Generate Lead ] [ Add to Lead ] [ Add to Job ] [ Clear ] [ Back to Tools ]
```

- **Generate Lead** — Creates new lead + attaches tool result (same as v1.0 but typed)
- **Add to Lead** — Opens lead picker → fetches leads → search/filter → creates tool attachment linked to selected lead
- **Add to Job** — Opens job picker → fetches jobs → search/filter → creates tool attachment linked to selected job
- **Clear** — Resets all form fields + clears localStorage draft

### New result_data Format

```json
{
  "tool_key": "general_estimate",
  "preview_text": "Project: Kitchen reno · 3 items · 10% discount · 20% VAT · Total: £1,296.00",
  "total_value": 1296.00,
  "payload": {
    "tool_key": "general_estimate",
    "project_name": "Kitchen reno",
    "line_items": [
      { "index": 1, "description": "Labour", "amount": 800 },
      { "index": 2, "description": "Materials", "amount": 300 },
      { "index": 3, "description": "Waste disposal", "amount": 100 }
    ],
    "subtotal": 1200,
    "discount_percent": 10,
    "discount_amount": 120,
    "after_discount": 1080,
    "vat_percent": 20,
    "vat_amount": 216,
    "total": 1296,
    "deposit_paid": 500,
    "balance_due": 796,
    "notes": "Quote valid for 30 days",
    "generated_at": "2025-07-16T12:00:00.000Z"
  }
}
```

---

## Phase 2b: Leads Page Enhancement

### Updated: `src/app/(member)/app/leads/page.tsx`

| Feature | Status | Details |
|---------|--------|---------|
| Fetch tool attachments | ✅ NEW | Parallel fetch with leads on mount |
| Display attachment cards | ✅ NEW | In edit panel, shows tool attachment cards linked to each lead |
| Card rendering | ✅ NEW | Icon + title + preview text + total value + date + "Open tool" link |
| Legacy support | ✅ | `attachmentToCard()` handles both old and new format attachments |

---

## Files Changed

| File | Action | Size |
|------|--------|------|
| `src/lib/tools/tool-types.ts` | CREATED | Shared types, helpers, draft persistence |
| `src/app/(member)/app/tools/general/page.tsx` | REWRITTEN | v1.0 → v2.0 (all v1 features preserved + 4 new capabilities) |
| `src/app/(member)/app/leads/page.tsx` | UPDATED | Added tool attachment fetch + card display in edit panel |

## Files NOT Changed (Verified Aligned)

- `src/lib/workspace-data.ts` — No changes needed (ToolAttachmentRow + createToolAttachment already accept the new format)
- `src/app/api/workspace/tool-attachments/route.ts` — No changes needed (POST accepts any result_data jsonb)
- `src/app/(member)/app/jobs/page.tsx` — Already fetches and displays tool attachments
- `src/contexts/WorkspaceContext.tsx` — No changes needed

---

## Adding a New Tool (Future)

To add a new tool (e.g. Flooring Calculator):

1. **Extend `ToolKey`** in `tool-types.ts`: `| 'flooring_calculator'`
2. **Add entries** to `TOOL_TITLES`, `TOOL_ROUTES`, `TOOL_ICONS`
3. **Create `FlooringCalculatorPayload`** interface with `tool_key: 'flooring_calculator'`
4. **Extend `ToolPayload`** union: `| FlooringCalculatorPayload`
5. **Add case** to `buildPreviewText()` and `extractTotalValue()`
6. **Create page** at the route defined in `TOOL_ROUTES`
7. Use `buildResultData()` to create attachments — everything else works automatically

---

## Build Verification

```
npx next build → PASS
/app/tools/general → 5.66 kB (149 kB first load)
/app/leads → 4.63 kB (148 kB first load)
```

Zero errors. Only pre-existing warnings (unescaped entities in public pages, useEffect deps in legacy dashboard).
