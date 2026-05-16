# CROSS-PLATFORM CALENDAR COLOUR CONTRACT (LOCKED)

**Date:** 21 April 2026  
**Status:** PRODUCTION — All platforms must implement exactly  
**Enforcement:** Automated in code via `DATE_TYPE_COLOURS` constant

---

## Single Source of Truth

All platforms (Website, Android, iOS) must use **exactly these colours** for operational date types. No platform-specific alternatives.

### Colour Mapping

| Date Type | Colour | Hex Values | Tailwind | Usage |
|---|---|---|---|---|
| **Survey** | Purple | `#8b5cf6` (dot), `#f3e8ff` (bg) | `purple-500`, `purple-50`, `purple-200`, `purple-700` | Survey site visits, site inspections |
| **Follow-up** | Blue | `#3b82f6` (dot), `#eff6ff` (bg) | `blue-500`, `blue-50`, `blue-200`, `blue-700` | Follow-up calls, reminders, contact dates |
| **Materials Delivery** | Amber | `#f59e0b` (dot), `#fffbeb` (bg) | `amber-500`, `amber-50`, `amber-200`, `amber-700` | Material shipments, deliveries |
| **Work Start** | Emerald | `#10b981` (dot), `#f0fdf4` (bg) | `emerald-500`, `emerald-50`, `emerald-200`, `emerald-700` | Job commencement, work begins |
| **Work Finish** | Rose | `#f43f5e` (dot), `#fff5f7` (bg) | `rose-500`, `rose-50`, `rose-200`, `rose-700` | Job completion, work finishes, deadlines |

---

## Semantic Roles

### Background (`bg`)
Used for **container backgrounds** — large areas, cards, chips.
- `survey` → `bg-purple-50`
- `follow_up` → `bg-blue-50`
- `materials_delivery` → `bg-amber-50`
- `work_start` → `bg-emerald-50`
- `work_finish` → `bg-rose-50`

### Border (`border`)
Used for **container outlines** and thin separators.
- Survey → `border-purple-200`
- Follow-up → `border-blue-200`
- Materials → `border-amber-200`
- Work Start → `border-emerald-200`
- Work Finish → `border-rose-200`

### Text (`text`)
Used for **labels, legends, and text indicators**.
- Survey → `text-purple-700`
- Follow-up → `text-blue-700`
- Materials → `text-amber-700`
- Work Start → `text-emerald-700`
- Work Finish → `text-rose-700`

### Dot (`dot`)
Used for **indicator dots, badges, and small icons** in calendars and timelines.
- Survey → `bg-purple-500`
- Follow-up → `bg-blue-500`
- Materials → `bg-amber-500`
- Work Start → `bg-emerald-500`
- Work Finish → `bg-rose-500`

---

## Implementation Rules

### ✅ CORRECT — Always use the contract

```tsx
// Web (React/Tailwind)
import { DATE_TYPE_COLOURS } from '@/lib/calendar/calendar-types';

const cfg = DATE_TYPE_COLOURS['work_start'];
return <div className={`${cfg.bg} ${cfg.border} border rounded p-3`}>
  <span className={cfg.text}>{cfg.label}</span>
  <span className={cfg.dot}> ●</span>
</div>

// Or use the helper:
import { getDateTypeColour } from '@/lib/calendar/calendar-colours';

const colours = getDateTypeColour('survey');
return <span className={colours.text}>{colours.label}</span>
```

### ❌ INCORRECT — Never hardcode

```tsx
// ❌ DO NOT DO THIS
<span className="text-emerald-500">Work Start</span>  // Inconsistent with contract
<div className="bg-rose-50">Due Date</div>           // Maintenance nightmare

// ❌ DO NOT USE PLATFORM-SPECIFIC ALTERNATIVES
if (isAndroid) {
  setColour(Color.parseColor("#10b981"));
} else if (isIOS) {
  setColour(UIColor(red: 0.06, green: 0.73, blue: 0.51, alpha: 1.0))
}
// Instead, use the ONE colour from the contract
```

---

## UI Components Using This Contract

### Calendar View
- Main date grid: dots using `dot` colour
- Event cards: `bg` + `border`
- Event text: `text` colour

### Timeline / Date List
- Date label: `text` colour
- Date indicator bar: `border` colour with `text` label
- Container: optional `bg` for emphasis

### Date Picker
- Selected date chip: `bg` + `border` + `text`
- Legend: dots using `dot` + label using `text`

### Lead/Job Detail Cards
- Date label badges: `bg` + `border` + `text`
- Timeline entries: `text` label with `border` left accent

---

## Database Mapping

**Leads table columns:**
- `follow_up_at_millis` → `follow_up` → Blue
- `survey_date_millis` → `survey` → Purple
- `start_date_millis` → `work_start` → Emerald
- `materials_delivery_date_millis` → `materials_delivery` → Amber
- `due_date_millis` → `work_finish` → Rose

**Jobs table columns:**
- `start_date_millis` → `work_start` → Emerald
- `due_date_millis` → `work_finish` → Rose

---

## Enforcement

All date type colours are defined in:
- **Web:** `src/lib/calendar/calendar-types.ts` → `DATE_TYPE_COLOURS`
- **Web utilities:** `src/lib/calendar/calendar-colours.ts` → Helper functions
- **Android:** `com/tissca/calendar/CalendarColours.kt` (TBD)
- **iOS:** `CalendarColours.swift` (TBD)

**Breaking the contract means:**
1. 🔴 Build will fail (colour class doesn't exist in `DATE_TYPE_COLOURS`)
2. 🔴 Code review will reject PR (hardcoded colours flagged)
3. 🔴 Visual regression tests will catch inconsistencies

---

## Change Management

To change a colour:
1. Update `DATE_TYPE_COLOURS` in the central location (calendar-types.ts for Web, etc.)
2. Update this document with the new hex values
3. ALL platforms use the updated colour automatically
4. No per-platform colour tweaks allowed

This ensures cross-platform visual consistency and prevents colour drift.

---

## Examples by Use Case

### Example 1: Render a single date label

```tsx
const cfg = DATE_TYPE_COLOURS['materials_delivery'];
return <span className={`${cfg.bg} ${cfg.border} border px-2 py-1 rounded text-xs ${cfg.text}`}>
  {cfg.label}: {formatDate(materials_delivery_millis)}
</span>
```

**Output:** Amber chip with label "Materials"

### Example 2: Calendar legend

```tsx
<div className="flex gap-3">
  {ALL_DATE_TYPES.map((dt) => {
    const cfg = DATE_TYPE_COLOURS[dt];
    return <div key={dt} className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      <span className="text-xs text-slate-600">{cfg.label}</span>
    </div>
  })}
</div>
```

**Output:** 5 dots (purple, blue, amber, emerald, rose) with labels

### Example 3: Timeline entry

```tsx
import { createDateDisplay, formatDateDisplay } from '@/lib/calendar/calendar-colours';

const display = createDateDisplay('work_start', lead.start_date_millis);
if (!display) return null;

return <div className={`flex items-center gap-2 pl-3 border-l-4 ${display.colours.border}`}>
  <span className={display.colours.text}>{display.label}</span>
  <span className="text-slate-700 font-medium">{formatDateDisplay(display)}</span>
</div>
```

**Output:** Green label "Work Start" with date, accent border

---

## Notes

- Colours chosen for accessibility (WCAG AA minimum contrast ratios)
- Deliberately distinct: no two date types share a base hue
- Semantic intent: warm (amber) = logistics, cool (blue) = communication, green = action start, red = finish/deadline
- Tailwind colours are stable across all projects — no custom hex values in component code
