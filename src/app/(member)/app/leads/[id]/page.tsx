// src/app/(member)/app/leads/[id]/page.tsx v1.0
//
// PURPOSE:
// - Dedicated Lead Detail page — shows full lead info, client details,
//   tool attachment cards with "Edit in tool" links, and quick actions.
// - Navigated to from the leads pipeline list (/app/leads → /app/leads/:id).
//
// VERSION HISTORY:
// - v1.0 (2026-04-01): Initial build — lead detail, client profile,
//                        tool attachment cards with edit-mode links.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { trackEvent } from '@/utils/analytics';
import { formatCurrency as _fmtCur } from '@/lib/currency';
import { DATE_TYPE_COLOURS, type CalendarDateType } from '@/lib/calendar/calendar-types';
import {
  type ToolCardSummary,
  type ToolAttachment,
  attachmentToCard,
  fmtToolCurrency,
  toolKeyToRoute,
} from '@/lib/tools/tool-types';

// ─── Types ───────────────────────────────────────────────────────────────────

type Lead = {
  id: string;
  client_name: string | null;
  status: string;
  source: string | null;
  estimated_value: number | null;
  follow_up_at_millis: number | null;
  notes: string | null;
  client_id: string | null;
  // ── CRM dates (millis) — all map to CalendarDateType ──
  survey_date_millis: number | null;
  start_date_millis: number | null;
  materials_delivery_date_millis: number | null;
  due_date_millis: number | null;
  // ──────────────
  created_at_millis: number;
  updated_at_millis: number;
};

type ClientInfo = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_line_1: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusPillClasses(status: string) {
  const raw = String(status || '').toLowerCase().trim();
  if (raw === 'new') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (raw === 'contacted') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (raw === 'quoted') return 'border-purple-200 bg-purple-50 text-purple-700';
  if (raw === 'won') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (raw === 'lost') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-gray-200 bg-gray-50 text-slate-700';
}

function formatCurrency(value: number | null) {
  if (value == null) return '\u2014';
  return _fmtCur(value);
}

function formatMillis(ms: number | null) {
  if (ms == null || ms === 0) return '\u2014';
  try {
    return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '\u2014';
  }
}

type DateFieldMapping = {
  dateType: CalendarDateType;
  millis: number | null;
  label: string;
};

function getDateFields(lead: Lead): DateFieldMapping[] {
  const fields: DateFieldMapping[] = [
    { dateType: 'follow_up' as CalendarDateType, millis: lead.follow_up_at_millis, label: 'Follow-up' },
    { dateType: 'survey' as CalendarDateType, millis: lead.survey_date_millis, label: 'Survey' },
    { dateType: 'work_start' as CalendarDateType, millis: lead.start_date_millis, label: 'Work Start' },
    { dateType: 'materials_delivery' as CalendarDateType, millis: lead.materials_delivery_date_millis, label: 'Materials' },
    { dateType: 'work_finish' as CalendarDateType, millis: lead.due_date_millis, label: 'Due Date' },
  ];
  return fields.filter((d) => d.millis != null && d.millis !== 0);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [toolCards, setToolCards] = useState<ToolCardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }),
    [accessToken],
  );

  // ─── Fetch lead + attachments ────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!accessToken || !leadId) return;
    setLoading(true);
    try {
      const [leadsRes, attachRes] = await Promise.all([
        fetch('/api/workspace/leads', { headers: authHeaders(), cache: 'no-store' }),
        fetch('/api/workspace/tool-attachments', { headers: authHeaders(), cache: 'no-store' }),
      ]);
      if (!leadsRes.ok) throw new Error('Failed to load lead');
      const leadsData = await leadsRes.json();
      const allLeads: Lead[] = leadsData.leads ?? [];
      const found = allLeads.find((l) => l.id === leadId);
      if (!found) {
        setError('Lead not found');
        setLoading(false);
        return;
      }
      setLead(found);

      // Fetch linked client
      if (found.client_id) {
        try {
          const clientsRes = await fetch('/api/workspace/clients', { headers: authHeaders(), cache: 'no-store' });
          if (clientsRes.ok) {
            const clientsData = await clientsRes.json();
            const linkedClient = (clientsData.clients ?? []).find((c: ClientInfo) => c.id === found.client_id);
            setClient(linkedClient ?? null);
          }
        } catch { /* client fetch is non-critical */ }
      } else {
        setClient(null);
      }

      if (attachRes.ok) {
        const attachData = await attachRes.json();
        const allCards = (attachData.toolAttachments ?? []).map((a: ToolAttachment) => attachmentToCard(a));
        setToolCards(allCards.filter((c: ToolCardSummary) => c.parent_id === leadId));
      }

      setError(null);
      trackEvent('feature_view', `/app/leads/${leadId}`, { eventLabel: 'lead_detail_viewed' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  }, [accessToken, leadId, authHeaders]);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;
    fetchData();
  }, [accessToken, ctxLoading, fetchData]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  async function handleConvertToJob() {
    if (!lead) return;
    try {
      const res = await fetch('/api/workspace/jobs', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          client_name: lead.client_name || 'Untitled job',
          status: 'SCHEDULED',
          lead_id: lead.id,
          client_id: lead.client_id ?? null,
          job_value: lead.estimated_value,
        }),
      });
      if (!res.ok) throw new Error('Failed to convert to job');

      // Update lead status to "WON"
      await fetch('/api/workspace/leads', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ id: lead.id, status: 'WON' }),
      });

      trackEvent('feature_view', `/app/leads/${leadId}`, { eventLabel: 'lead_converted_to_job' });
      router.push('/app/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert');
    }
  }

  async function handleDelete() {
    if (!lead || !confirm('Delete this lead? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/workspace/leads', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ id: lead.id }),
      });
      if (!res.ok) throw new Error('Failed to delete lead');
      router.push('/app/leads');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  // ─── Loading / error states ──────────────────────────────────────────────

  if (loading || ctxLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <span className="ml-3 text-sm text-slate-500">Loading lead...</span>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <p className="text-sm text-red-600 mb-4">{error || 'Lead not found'}</p>
        <button onClick={() => router.push('/app/leads')} className="text-sm text-amber-600 font-medium underline">
          ← Back to leads
        </button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {/* Main detail */}
      <section className="xl:col-span-2 space-y-4">
        {/* Back link + header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
          <button
            onClick={() => router.push('/app/leads')}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium mb-3 flex items-center gap-1"
          >
            ← Back to leads
          </button>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">{lead.client_name || 'Untitled lead'}</h2>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPillClasses(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Created {formatMillis(lead.created_at_millis)} · Updated {formatMillis(lead.updated_at_millis)}
              </p>
            </div>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(lead.estimated_value)}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Lead details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Source</p>
              <p className="text-slate-900 font-medium">{lead.source || '\u2014'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Follow-up date</p>
              <p className="text-slate-900 font-medium">{formatMillis(lead.follow_up_at_millis)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Est. value</p>
              <p className="text-slate-900 font-medium">{formatCurrency(lead.estimated_value)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
              <p className="text-slate-900 font-medium capitalize">{lead.status}</p>
            </div>
          </div>

          {/* CRM project dates */}
          {(lead.start_date_millis || lead.materials_delivery_date_millis || lead.due_date_millis) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Project dates</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {lead.start_date_millis && (
                  <div>
                    <p className="text-[11px] text-emerald-600 font-medium">Start Date</p>
                    <p className="text-slate-900">{formatMillis(lead.start_date_millis)}</p>
                  </div>
                )}
                {lead.materials_delivery_date_millis && (
                  <div>
                    <p className="text-[11px] text-amber-600 font-medium">Materials Delivery</p>
                    <p className="text-slate-900">{formatMillis(lead.materials_delivery_date_millis)}</p>
                  </div>
                )}
                {lead.due_date_millis && (
                  <div>
                    <p className="text-[11px] text-rose-600 font-medium">Due Date</p>
                    <p className="text-slate-900">{formatMillis(lead.due_date_millis)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {lead.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Client contact */}
        {client && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Client contact</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">👤</span>
                <p className="text-slate-900 font-medium">{client.name}</p>
              </div>
              {client.email && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">✉</span>
                  <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">{client.email}</a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">☎</span>
                  <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">{client.phone}</a>
                </div>
              )}
              {client.address_line_1 && (
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">📍</span>
                  <p className="text-slate-700 whitespace-pre-wrap">{client.address_line_1}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tool attachments */}
        {toolCards.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Tool attachments ({toolCards.length})
            </h3>
            <div className="space-y-3">
              {toolCards.map((card) => {
                const route = toolKeyToRoute(card.tool_key);
                return (
                  <div
                    key={card.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-3"
                  >
                    <span className="text-xl shrink-0">{card.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{card.tool_title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{card.preview_text}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-bold text-amber-700">{fmtToolCurrency(card.total_value)}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(card.created_at_millis).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    {route && (
                      <button
                        onClick={() => router.push(`${route}?attachmentId=${card.id}`)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors shrink-0"
                      >
                        Edit in tool →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Right sidebar — actions */}
      <aside className="space-y-4">
        {/* Quick actions */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => router.push('/app/leads')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50 transition-colors text-left"
            >
              ← Edit in pipeline view
            </button>
            <button
              onClick={handleConvertToJob}
              disabled={lead.status === 'lost'}
              className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition-colors text-left"
            >
              → Convert to job
            </button>
            <button
              onClick={handleDelete}
              className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              Delete lead
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Timeline */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Project Timeline</h3>
          <div className="space-y-2 text-xs">
            {/* System dates */}
            <div className="space-y-1 pb-3 mb-3 border-b border-gray-100">
              <div className="flex justify-between text-slate-500">
                <span>Created</span>
                <span className="text-slate-700 font-medium">{formatMillis(lead.created_at_millis)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Last updated</span>
                <span className="text-slate-700 font-medium">{formatMillis(lead.updated_at_millis)}</span>
              </div>
            </div>
            {/* CRM dates with colour contract */}
            <div className="space-y-1">
              {getDateFields(lead).map(({ dateType, millis }) => {
                const cfg = DATE_TYPE_COLOURS[dateType];
                return (
                  <div key={dateType} className="flex justify-between items-center">
                    <span className={cfg.text}>{cfg.label}</span>
                    <span className="text-slate-700 font-medium">{formatMillis(millis)}</span>
                  </div>
                );
              })}
              {getDateFields(lead).length === 0 && (
                <p className="text-slate-400 italic text-xs">No dates scheduled</p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
