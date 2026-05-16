# QUICK REFERENCE: CALENDAR COLOUR CONTRACT

**TL;DR** — Always use `DATE_TYPE_COLOURS` from `src/lib/calendar/calendar-types.ts`

---

## The 5 Date Types

```
Survey        = 🟪 Purple
Follow-up     = 🟦 Blue
Materials     = 🟨 Amber
Work Start    = 🟩 Emerald
Work Finish   = 🟥 Rose
```

---

## How to Use (Web/React)

### Option 1: Direct access
```tsx
import { DATE_TYPE_COLOURS } from '@/lib/calendar/calendar-types';

const cfg = DATE_TYPE_COLOURS['work_start'];
return <span className={cfg.text}>Work Start</span>  // ✅ emerald-700 text
```

### Option 2: Helper functions
```tsx
import { getDateTypeColour, getDateLabelClasses } from '@/lib/calendar/calendar-colours';

const cfg = getDateTypeColour('follow_up');        // Get palette
const className = getDateLabelClasses('survey');   // Get CSS classes
```

### Option 3: Display object
```tsx
import { createDateDisplay, formatDateDisplay } from '@/lib/calendar/calendar-colours';

const display = createDateDisplay('materials_delivery', dateMs);
if (display) {
  return <span className={display.colours.text}>
    {display.label}: {formatDateDisplay(display)}
  </span>
}
```

---

## Colour Values (Tailwind)

```
Survey:
  - Text:   text-purple-700
  - BG:     bg-purple-50
  - Border: border-purple-200
  - Dot:    bg-purple-500

Follow-up:
  - Text:   text-blue-700
  - BG:     bg-blue-50
  - Border: border-blue-200
  - Dot:    bg-blue-500

Materials Delivery:
  - Text:   text-amber-700
  - BG:     bg-amber-50
  - Border: border-amber-200
  - Dot:    bg-amber-500

Work Start:
  - Text:   text-emerald-700
  - BG:     bg-emerald-50
  - Border: border-emerald-200
  - Dot:    bg-emerald-500

Work Finish:
  - Text:   text-rose-700
  - BG:     bg-rose-50
  - Border: border-rose-200
  - Dot:    bg-rose-500
```

---

## Hex Values (Android/iOS)

```
Survey:        #8b5cf6 (dot) | #f3e8ff (bg)
Follow-up:     #3b82f6 (dot) | #eff6ff (bg)
Materials:     #f59e0b (dot) | #fffbeb (bg)
Work Start:    #10b981 (dot) | #f0fdf4 (bg)
Work Finish:   #f43f5e (dot) | #fff5f7 (bg)
```

---

## Common Patterns

### Render all dates in a timeline
```tsx
import { DATE_TYPE_TYPES } from '@/lib/calendar/calendar-types';

const dateFields = [
  { dateType: 'follow_up', millis: lead.follow_up_at_millis },
  { dateType: 'survey', millis: lead.survey_date_millis },
  { dateType: 'work_start', millis: lead.start_date_millis },
  { dateType: 'materials_delivery', millis: lead.materials_delivery_date_millis },
  { dateType: 'work_finish', millis: lead.due_date_millis },
].filter(d => d.millis);

return (
  <div>
    {dateFields.map(({ dateType, millis }) => {
      const cfg = DATE_TYPE_COLOURS[dateType];
      return (
        <div key={dateType} className={`${cfg.bg} ${cfg.border} border rounded p-2`}>
          <span className={cfg.text}>{cfg.label}</span>: {formatDate(millis)}
        </div>
      );
    })}
  </div>
);
```

### Render legend
```tsx
import { ALL_DATE_TYPES, DATE_TYPE_COLOURS } from '@/lib/calendar/calendar-types';

return (
  <div className="flex gap-4">
    {ALL_DATE_TYPES.map(dt => {
      const cfg = DATE_TYPE_COLOURS[dt];
      return (
        <div key={dt} className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${cfg.dot}`} />
          <span className="text-sm text-slate-600">{cfg.label}</span>
        </div>
      );
    })}
  </div>
);
```

### Render date chip
```tsx
import { DATE_TYPE_COLOURS } from '@/lib/calendar/calendar-types';

const cfg = DATE_TYPE_COLOURS['materials_delivery'];
return (
  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.border} border ${cfg.text}`}>
    {cfg.label}
  </span>
);
```

---

## ❌ DON'T DO THIS

```tsx
// ❌ Hardcoded colours
<span className="text-emerald-500">Work Start</span>

// ❌ Hardcoded hex
style={{ color: '#10b981' }}

// ❌ Platform-specific code
if (isAndroid) { setColor(green) } else { setColor(blue) }

// ❌ Duplicating colours across components
// Use contract instead!
```

---

## Files to Reference

- **Contract definition:** `src/lib/calendar/calendar-types.ts`
- **Helper utilities:** `src/lib/calendar/calendar-colours.ts`
- **Full documentation:** `docs/CROSS_PLATFORM_COLOUR_CONTRACT.md`
- **Implementation example:** `src/app/(member)/app/leads/[id]/page.tsx` (timeline section)
- **Live calendar:** `src/app/(member)/app/calendar/page.tsx`

---

## Questions?

→ See full contract: `docs/CROSS_PLATFORM_COLOUR_CONTRACT.md`  
→ See examples: Look at calendar page or lead detail page  
→ See utilities: `src/lib/calendar/calendar-colours.ts`
