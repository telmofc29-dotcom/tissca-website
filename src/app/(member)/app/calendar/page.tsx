// src/app/(member)/app/calendar/page.tsx v2.0
//
// PURPOSE:
// Calendar module — shows ALL 5 CRM date types from BOTH leads and jobs.
// Date types: Survey, Follow-up, Materials Delivery, Work Start, Work Finish
// Each type has a distinct colour for dots, events, and legend.
//
// v2.0: Fetches leads + jobs. Colour-codes by date type. Legend. Event detail.

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/i18n';
import { trackEvent } from '@/utils/analytics';
import { formatCurrency as _fmtCur } from '@/lib/currency';
import {
  type CalendarDateType,
  type CalendarEvent,
  DATE_TYPE_COLOURS,
  ALL_DATE_TYPES,
} from '@/lib/calendar/calendar-types';

// ─── Types ───────────────────────────────────────────────────────────────────

type Lead = {
  id: string;
  client_name: string | null;
  status: string;
  estimated_value: number | null;
  follow_up_at_millis: number | null;
  start_date_millis: number | null;
  materials_delivery_date_millis: number | null;
  due_date_millis: number | null;
};

type Job = {
  id: string;
  client_name: string | null;
  status: string;
  start_date_millis: number | null;
  due_date_millis: number | null;
  job_value: number | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtCurrency(v: number | null): string {
  if (v == null) return '';
  return _fmtCur(v);
}

function extractEvents(leads: Lead[], jobs: Job[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  const millisToDateStr = (ms: number | null): string | null => {
    if (ms == null || ms === 0) return null;
    return toDateStr(new Date(ms));
  };

  for (const lead of leads) {
    const fields: [CalendarDateType, number | null][] = [
      ['follow_up', lead.follow_up_at_millis],
      ['work_start', lead.start_date_millis],
      ['materials_delivery', lead.materials_delivery_date_millis],
      ['work_finish', lead.due_date_millis],
    ];
    for (const [dateType, millis] of fields) {
      const dateStr = millisToDateStr(millis);
      if (!dateStr) continue;
      events.push({
        id: `lead-${lead.id}-${dateType}`,
        dateType,
        date: dateStr,
        entityId: lead.id,
        entityName: lead.client_name || 'Untitled Lead',
        entitySource: 'lead',
        value: lead.estimated_value,
      });
    }
  }

  for (const job of jobs) {
    const fields: [CalendarDateType, number | null][] = [
      ['work_start', job.start_date_millis],
      ['work_finish', job.due_date_millis],
    ];
    for (const [dateType, millis] of fields) {
      const dateStr = millisToDateStr(millis);
      if (!dateStr) continue;
      events.push({
        id: `job-${job.id}-${dateType}`,
        dateType,
        date: dateStr,
        entityId: job.id,
        entityName: job.client_name || 'Untitled Job',
        entitySource: 'job',
        value: job.job_value,
      });
    }
  }

  return events;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Component ──────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const { t } = useLanguage();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeFilters, setActiveFilters] = useState<Set<CalendarDateType>>(new Set(ALL_DATE_TYPES));

  // ─── Data fetch ───────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      const [leadsRes, jobsRes] = await Promise.all([
        fetch('/api/workspace/leads', { headers, cache: 'no-store' }),
        fetch('/api/workspace/jobs', { headers, cache: 'no-store' }),
      ]);
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data.leads ?? []);
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs ?? []);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;
    fetchData();
    trackEvent('feature_view', '/app/calendar', {
      eventLabel: 'calendar',
      metadata: { feature: 'calendar', action: 'view' },
    });
  }, [accessToken, ctxLoading, fetchData]);

  // ─── Events ───────────────────────────────────────────────────────────

  const allEvents = useMemo(() => extractEvents(leads, jobs), [leads, jobs]);

  const filteredEvents = useMemo(
    () => allEvents.filter((e) => activeFilters.has(e.dateType)),
    [allEvents, activeFilters],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const evt of filteredEvents) {
      const list = map.get(evt.date) || [];
      list.push(evt);
      map.set(evt.date, list);
    }
    return map;
  }, [filteredEvents]);

  const selectedDayEvents = useMemo(() => {
    return eventsByDate.get(toDateStr(selectedDate)) || [];
  }, [selectedDate, eventsByDate]);

  // ─── Calendar grid ────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
    }
    return days;
  }, [currentMonth]);

  // ─── Counts ───────────────────────────────────────────────────────────

  const typeCounts = useMemo(() => {
    const counts: Record<CalendarDateType, number> = {
      survey: 0, follow_up: 0, materials_delivery: 0, work_start: 0, work_finish: 0,
    };
    for (const evt of allEvents) counts[evt.dateType]++;
    return counts;
  }, [allEvents]);

  // ─── Month navigation ─────────────────────────────────────────────────

  function prevMonth() {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }
  function goToday() {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  }

  function toggleFilter(dt: CalendarDateType) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(dt)) next.delete(dt); else next.add(dt);
      return next;
    });
  }

  // ─── Loading ──────────────────────────────────────────────────────────

  if (ctxLoading || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="mt-2 text-sm text-slate-500">Loading calendar...</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const monthLabel = currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <h2 className="text-lg font-semibold text-slate-900">
          {(t.member.nav as Record<string, string>).calendar || 'Calendar'}
        </h2>
        <p className="mt-0.5 text-sm text-slate-600">
          All project dates from leads and jobs — colour-coded by type.
        </p>
      </div>

      {/* Legend / filter bar */}
      <div className="flex flex-wrap gap-2">
        {ALL_DATE_TYPES.map((dt) => {
          const cfg = DATE_TYPE_COLOURS[dt];
          const active = activeFilters.has(dt);
          return (
            <button
              key={dt}
              onClick={() => toggleFilter(dt)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                active
                  ? `${cfg.border} ${cfg.bg} ${cfg.text}`
                  : 'border-gray-200 bg-gray-50 text-slate-400'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${active ? cfg.dot : 'bg-gray-300'}`} />
              {cfg.label}
              <span className="text-[10px] opacity-70">({typeCounts[dt]})</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Calendar + selected day (2 cols) */}
        <section className="xl:col-span-2 space-y-4">
          {/* Month calendar */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)] overflow-hidden">
            {/* Month header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-slate-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-slate-900">{monthLabel}</h3>
                <button onClick={goToday} className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-gray-100 transition-colors">Today</button>
              </div>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-slate-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {WEEKDAY_LABELS.map((day) => (
                <div key={day} className="py-2 text-center text-[11px] font-semibold text-slate-500 uppercase">{day}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dateStr = toDateStr(day.date);
                const dayEvents = eventsByDate.get(dateStr) || [];
                const isToday = isSameDay(day.date, today);
                const isSelected = isSameDay(day.date, selectedDate);

                // Deduplicate dot types for this day
                const uniqueTypes = [...new Set(dayEvents.map((e) => e.dateType))];

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day.date)}
                    className={`relative flex flex-col items-center py-2 min-h-[52px] border-b border-r border-gray-50 transition-colors ${
                      !day.isCurrentMonth ? 'text-slate-300' :
                      isSelected ? 'bg-amber-50' :
                      isToday ? 'bg-blue-50/50' :
                      'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-sm leading-none ${
                      isSelected ? 'font-bold text-amber-700' :
                      isToday ? 'font-bold text-blue-700' :
                      day.isCurrentMonth ? 'text-slate-700' : 'text-slate-300'
                    }`}>
                      {day.date.getDate()}
                    </span>

                    {/* Colour-coded dots by date type */}
                    {uniqueTypes.length > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {uniqueTypes.slice(0, 4).map((dt) => (
                          <span key={dt} className={`h-1.5 w-1.5 rounded-full ${DATE_TYPE_COLOURS[dt].dot}`} />
                        ))}
                        {uniqueTypes.length > 4 && (
                          <span className="text-[9px] text-slate-400 leading-none ml-0.5">+{uniqueTypes.length - 4}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day details */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              {isSameDay(selectedDate, today) ? 'Today' : selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              {selectedDayEvents.length > 0 && (
                <span className="ml-2 text-xs text-slate-500 font-normal">
                  {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
                </span>
              )}
            </h3>

            {selectedDayEvents.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-500">No events on this day.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((evt) => {
                  const cfg = DATE_TYPE_COLOURS[evt.dateType];
                  return (
                    <div
                      key={evt.id}
                      onClick={() => router.push(evt.entitySource === 'job' ? '/app/jobs' : `/app/leads/${evt.entityId}`)}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer hover:shadow-sm transition-all ${cfg.border} ${cfg.bg}`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{evt.entityName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                          <span className="text-[10px] text-slate-400">{evt.entitySource === 'lead' ? 'Lead' : 'Job'}</span>
                          {evt.value != null && (
                            <span className="text-xs text-slate-500">{fmtCurrency(evt.value)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right sidebar — upcoming events */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Upcoming Events</h3>
            {(() => {
              const todayStr = toDateStr(today);
              const upcoming = filteredEvents
                .filter((e) => e.date >= todayStr)
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 12);

              if (upcoming.length === 0) {
                return (
                  <div className="py-4 text-center">
                    <p className="text-xs text-slate-500">No upcoming events.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {upcoming.map((evt) => {
                    const cfg = DATE_TYPE_COLOURS[evt.dateType];
                    return (
                      <div
                        key={evt.id}
                        onClick={() => router.push(evt.entitySource === 'job' ? '/app/jobs' : `/app/leads/${evt.entityId}`)}
                        className="flex items-center gap-2 rounded-lg border border-gray-100 p-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-900 truncate">{evt.entityName}</p>
                          <p className={`text-[10px] ${cfg.text}`}>{cfg.label}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(evt.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Stats summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Summary</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total leads</span>
                <span className="font-medium text-slate-900">{leads.length}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total jobs</span>
                <span className="font-medium text-slate-900">{jobs.length}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Calendar events</span>
                <span className="font-medium text-slate-900">{allEvents.length}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
