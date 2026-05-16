// src/app/(member)/app/history/page.tsx v4.0
//
// PURPOSE:
// - Unified audit trail across leads, jobs, tasks, assets, and documents.
// - Reads merged crm_history + documents from /api/workspace/history v2.0.
// - Entity-type-aware rendering: document events show reference, client, total, platform.
// - Task events show snapshot data (title, status, checklist count, due date) when available.
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v1.1 (2026-03-01): Light theme + improved layout/UX.
// - v2.0 (2026-03-27): Wire to real /api/workspace/history data.
// - v3.0 (2026-04-05): Unified audit trail — merged crm_history + documents,
//                        entity-type-aware cards, filter tabs, platform badges.
// - v4.0 (2026-04-08): Android-aligned snapshot rendering for task history.

'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { formatCurrency } from '@/lib/currency';
import { trackEvent } from '@/utils/analytics';

type HistoryEntry = {
  id: string;
  entity_type: string | null;
  entity_id: string | null;
  action: string | null;
  snapshot_json?: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
};

// ─── Entity-type config ──────────────────────────────────────────────────────

const ENTITY_CONFIG: Record<string, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  lead:        { icon: '📋', color: 'text-blue-700',    bgColor: 'bg-blue-50',    borderColor: 'border-blue-200' },
  job:         { icon: '🔨', color: 'text-amber-700',   bgColor: 'bg-amber-50',   borderColor: 'border-amber-200' },
  task:        { icon: '✅', color: 'text-violet-700',  bgColor: 'bg-violet-50',  borderColor: 'border-violet-200' },
  asset:       { icon: '📦', color: 'text-teal-700',    bgColor: 'bg-teal-50',    borderColor: 'border-teal-200' },
  document:    { icon: '📄', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  room_layout: { icon: '🏗️', color: 'text-indigo-700', bgColor: 'bg-indigo-50',  borderColor: 'border-indigo-200' },
};

const DEFAULT_CONFIG = { icon: '●', color: 'text-slate-700', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' };

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'document', label: 'Documents' },
  { value: 'lead', label: 'Leads' },
  { value: 'job', label: 'Jobs' },
  { value: 'task', label: 'Tasks' },
  { value: 'asset', label: 'Assets' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + `, ${time}`;
  } catch {
    return dateStr;
  }
}

function formatAction(entry: HistoryEntry): string {
  const action = entry.action || 'action';
  const entityType = entry.entity_type || '';

  // Document events: show "Quote generated" / "Invoice generated" instead of "Document generated"
  if (entityType === 'document') {
    const docType = (entry.details as Record<string, unknown>)?.type as string | undefined;
    if (docType === 'quote') return 'Quote generated';
    if (docType === 'invoice') return 'Invoice generated';
    if (docType === 'layout_quote') return 'Layout quote generated';
    return `Document ${action}`;
  }

  // Task events: semantic action labels
  if (entityType === 'task') {
    const labels: Record<string, string> = {
      created: 'Task created',
      updated: 'Task updated',
      completed: 'Task completed',
      cancelled: 'Task cancelled',
      restored: 'Task restored',
      deleted: 'Task deleted',
      due_date_updated: 'Task due date changed',
      checklist_updated: 'Task checklist updated',
    };
    return labels[action] || `Task ${action}`;
  }

  // Lead conversion
  if (entityType === 'lead' && action === 'converted_to_job') return 'Lead converted to job';

  // Job deposit
  if (entityType === 'job' && action === 'deposit_paid') return 'Deposit confirmed';

  // Default
  const label = entityType.charAt(0).toUpperCase() + entityType.slice(1).replace('_', ' ');
  return `${label} ${action}`;
}

function formatDetail(entry: HistoryEntry): string | null {
  // Task entries: prefer snapshot_json for title, fall back to details
  if (entry.entity_type === 'task' && entry.snapshot_json) {
    const snap = entry.snapshot_json as Record<string, unknown>;
    return (snap.title as string) || null;
  }
  if (!entry.details || typeof entry.details !== 'object') {
    return entry.entity_id ? `ID: ${entry.entity_id.slice(0, 8)}…` : null;
  }
  const d = entry.details as Record<string, unknown>;
  if (d.description && typeof d.description === 'string') return d.description;
  if (d.name && typeof d.name === 'string') return d.name;
  if (d.title && typeof d.title === 'string') return d.title;
  return null;
}

// ─── Task snapshot sub-content ───────────────────────────────────────────────

function TaskSnapshotMeta({ entry }: { entry: HistoryEntry }) {
  const snap = entry.snapshot_json as Record<string, unknown> | null | undefined;
  if (!snap) return null;

  const status = snap.status as string | undefined;
  const dueDateMillis = snap.due_date_millis as number | null | undefined;
  const checklist = snap.checklist_items as Array<{ text: string; checked: boolean }> | null | undefined;

  const hasMeta = status || dueDateMillis != null || (checklist && checklist.length > 0);
  if (!hasMeta) return null;

  const doneCount = checklist ? checklist.filter((c) => c.checked).length : 0;
  const totalCount = checklist ? checklist.length : 0;

  let dueDateStr: string | null = null;
  if (dueDateMillis != null) {
    try {
      dueDateStr = new Date(dueDateMillis).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { /* ignore */ }
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      {status && (
        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
          status === 'COMPLETED' ? 'border-green-200 bg-green-50 text-green-700' :
          status === 'CANCELLED' ? 'border-red-200 bg-red-50 text-red-700' :
          'border-slate-200 bg-slate-50 text-slate-700'
        }`}>
          {status}
        </span>
      )}
      {dueDateStr && <span>Due: {dueDateStr}</span>}
      {totalCount > 0 && <span>Checklist: {doneCount}/{totalCount}</span>}
    </div>
  );
}

// ─── Document card sub-content ───────────────────────────────────────────────

function DocumentMeta({ entry }: { entry: HistoryEntry }) {
  const d = (entry.details ?? {}) as Record<string, unknown>;
  const reference = d.reference as string | undefined;
  const clientName = d.client_name as string | undefined;
  const grandTotal = d.grand_total as number | undefined;
  const currency = (d.currency as string) || 'GBP';
  const platform = d.platform as string | undefined;

  const hasAny = reference || clientName || grandTotal != null || platform;
  if (!hasAny) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      {reference && (
        <span className="font-medium text-slate-700">Ref: {reference}</span>
      )}
      {clientName && <span>{clientName}</span>}
      {grandTotal != null && (
        <span className="font-semibold text-slate-900">{formatCurrency(grandTotal, currency)}</span>
      )}
      {platform && platform !== 'web' && (
        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 uppercase">
          {platform}
        </span>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppHistoryPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (ctxLoading || !accessToken) return;

    setLoading(true);
    fetch('/api/workspace/history', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load history');
        return res.json();
      })
      .then((data) => {
        const items = data.history ?? [];
        setHistory(items);
        setError(null);
        trackEvent('feature_view', '/app/history', { eventLabel: 'history_loaded', metadata: { feature: 'history', entityType: 'history', action: 'view', itemCount: items.length, sourcePage: '/app/history' } });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, ctxLoading]);

  const isLoading = ctxLoading || loading;

  const filtered = filter === 'all'
    ? history
    : history.filter((h) => h.entity_type === filter);

  // Count per entity type for filter badges
  const counts = history.reduce<Record<string, number>>((acc, h) => {
    const t = h.entity_type || 'other';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Activity history</h2>
          <p className="mt-1 text-sm text-slate-600">
            Unified audit trail across leads, jobs, quotes, invoices, and assets.
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      {!isLoading && history.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => {
            const count = tab.value === 'all' ? history.length : (counts[tab.value] || 0);
            if (tab.value !== 'all' && count === 0) return null;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filter === tab.value
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-gray-200 bg-white text-slate-600 hover:bg-gray-50'
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-slate-400">
            Loading history&hellip;
          </div>
        ) : filtered.length === 0 && history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-slate-600">
            No activity yet. Workspace activity will appear here as you work.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-slate-500">
            No {filter} events.{' '}
            <button onClick={() => setFilter('all')} className="font-medium text-amber-600 underline">Show all</button>
          </div>
        ) : (
          filtered.map((entry) => {
            const cfg = ENTITY_CONFIG[entry.entity_type ?? ''] ?? DEFAULT_CONFIG;
            const isDocument = entry.entity_type === 'document';

            return (
              <article
                key={entry.id}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${cfg.bgColor} ${cfg.borderColor} border text-sm`}>
                        {cfg.icon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold ${cfg.color}`}>{formatAction(entry)}</p>
                      {isDocument ? (
                        <DocumentMeta entry={entry} />
                      ) : entry.entity_type === 'task' && entry.snapshot_json ? (
                        <>
                          {formatDetail(entry) && (
                            <p className="mt-1 text-sm text-slate-600">{formatDetail(entry)}</p>
                          )}
                          <TaskSnapshotMeta entry={entry} />
                        </>
                      ) : (
                        formatDetail(entry) && (
                          <p className="mt-1 text-sm text-slate-600">{formatDetail(entry)}</p>
                        )
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {formatTime(entry.created_at)}
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>

      {!isLoading && history.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          {filtered.length} of {history.length} event{history.length !== 1 ? 's' : ''} (newest first)
          {filter !== 'all' && ` · filtered by ${filter}`}
        </p>
      )}
    </div>
  );
}
