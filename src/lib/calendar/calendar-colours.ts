/**
 * CROSS-PLATFORM CALENDAR COLOUR CONTRACT
 *
 * This is the single source of truth for all date type colours across all platforms
 * (website, Android, iOS). All date displays must reference this contract.
 *
 * Never use hardcoded colours for date types — always use the contract from calendar-types.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COLOUR MAPPING (LOCKED)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Survey = Purple (bg-purple-50 | border-purple-200 | text-purple-700 | dot-purple-500)
 * Follow-up = Blue (bg-blue-50 | border-blue-200 | text-blue-700 | dot-blue-500)
 * Materials Delivery = Amber (bg-amber-50 | border-amber-200 | text-amber-700 | dot-amber-500)
 * Work Start = Emerald (bg-emerald-50 | border-emerald-200 | text-emerald-700 | dot-emerald-500)
 * Work Finish = Rose (bg-rose-50 | border-rose-200 | text-rose-700 | dot-rose-500)
 */

import { DATE_TYPE_COLOURS, type CalendarDateType } from './calendar-types';

/**
 * Get the colour palette for a specific date type
 * @param dateType - The date type (survey | follow_up | materials_delivery | work_start | work_finish)
 * @returns Colour palette object with bg, border, text, dot, label
 */
export function getDateTypeColour(dateType: CalendarDateType) {
  return DATE_TYPE_COLOURS[dateType];
}

/**
 * Apply colour palette to a date label chip/badge
 * @param dateType - The date type
 * @returns JSX className string for a coloured chip
 */
export function getDateLabelClasses(dateType: CalendarDateType): string {
  const cfg = getDateTypeColour(dateType);
  return `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.border} border ${cfg.text}`;
}

/**
 * Get full colour palette for rendering a date entry
 * Useful for creating consistent date items across different views (timeline, cards, etc.)
 * @param dateType - The date type
 * @returns Object with all colour variants
 */
export function getDateColourPalette(dateType: CalendarDateType) {
  const cfg = getDateTypeColour(dateType);
  return {
    // For backgrounds / containers
    background: cfg.bg,
    border: cfg.border,
    // For text
    text: cfg.text,
    textLight: cfg.text.replace('700', '600'),
    textDark: cfg.text.replace('700', '800'),
    // For dots / indicators
    dot: cfg.dot,
    // Semantic label
    label: cfg.label,
  };
}

/**
 * Create a date display object combining value and colour
 * Use this when rendering dates in lists, cards, or timeline views
 */
export type DateDisplay = {
  dateType: CalendarDateType;
  date: Date | null;
  label: string;
  colours: ReturnType<typeof getDateColourPalette>;
};

export function createDateDisplay(
  dateType: CalendarDateType,
  dateMs: number | null,
): DateDisplay | null {
  if (dateMs == null || dateMs === 0) return null;
  try {
    return {
      dateType,
      date: new Date(dateMs),
      label: getDateTypeColour(dateType).label,
      colours: getDateColourPalette(dateType),
    };
  } catch {
    return null;
  }
}

/**
 * Format date display for rendering
 * @param displayDate - The date display object
 * @param formatOptions - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateDisplay(
  displayDate: DateDisplay,
  formatOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
): string {
  if (!displayDate.date) return '—';
  try {
    return displayDate.date.toLocaleDateString('en-GB', formatOptions);
  } catch {
    return '—';
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE EXAMPLES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * // In a React component rendering a date chip:
 * import { getDateLabelClasses, getDateTypeColour } from '@/lib/calendar/calendar-colours';
 *
 * const cfg = getDateTypeColour('work_start');
 * return <span className={`${cfg.bg} ${cfg.border} border rounded px-2 py-1 text-xs ${cfg.text}`}>
 *   Work Start: {formattedDate}
 * </span>
 *
 * // In a timeline component:
 * import { createDateDisplay, formatDateDisplay } from '@/lib/calendar/calendar-colours';
 *
 * const display = createDateDisplay('materials_delivery', lead.materials_delivery_date_millis);
 * if (display) {
 *   return <div className={`flex gap-2 ${display.colours.border} border-l-4 pl-3`}>
 *     <span className={display.colours.text}>{display.label}</span>
 *     <span className="text-slate-700">{formatDateDisplay(display)}</span>
 *   </div>
 * }
 *
 * // Never do this:
 * <span className="text-emerald-500">Work Start</span>  // ❌ Hardcoded — breaks if contract changes
 * <span className="text-rose-500">Due Date</span>       // ❌ Hardcoded — inconsistent
 *
 * // Always do this:
 * <span className={DATE_TYPE_COLOURS['work_start'].text}>Work Start</span>  // ✅ Centralized
 * <span className={getDateTypeColour('work_finish').text}>Due Date</span>    // ✅ Consistent
 */
