// src/lib/calendar/calendar-types.ts
//
// Central colour definitions and types for the TISSCA calendar.
// All 5 CRM date types + their distinct colour palettes.
// Used by the calendar page, date pickers, and legend components.

export type CalendarDateType =
  | 'survey'
  | 'follow_up'
  | 'materials_delivery'
  | 'work_start'
  | 'work_finish';

export type CalendarEventSource = 'lead' | 'job';

export type CalendarEvent = {
  id: string;
  dateType: CalendarDateType;
  date: string; // ISO date string
  entityId: string;
  entityName: string;
  entitySource: CalendarEventSource;
  value: number | null;
};

// ─── Colour Palettes (distinct per date type) ─────────────────────────────

export const DATE_TYPE_COLOURS: Record<
  CalendarDateType,
  { bg: string; border: string; text: string; dot: string; label: string }
> = {
  survey: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
    label: 'Survey',
  },
  follow_up: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    label: 'Follow-up',
  },
  materials_delivery: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    label: 'Materials',
  },
  work_start: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    label: 'Work Start',
  },
  work_finish: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    label: 'Work Finish',
  },
};

export const ALL_DATE_TYPES: CalendarDateType[] = [
  'survey',
  'follow_up',
  'materials_delivery',
  'work_start',
  'work_finish',
];
