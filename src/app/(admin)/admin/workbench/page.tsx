// src/app/(admin)/admin/workbench/page.tsx
//
// Phase 5B — My Workbench.
//
// A private operational queue for the current staff member. Reads from
// GET /api/admin/workbench and renders three buckets:
//   1. Assigned to me (active)
//   2. Waiting (WAITING_USER / WAITING_ENGINEER / WAITING_ACCOUNTANT)
//   3. Recently resolved by me (limit 10)
//
// Each card links to /admin/notifications?focus=<id> to open the item in the
// existing notifications operations centre. Minimal UI — does not redesign the
// admin shell (the shell is provided by the (admin) layout).

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkbenchEvent {
  id: string;
  module: string;
  event_type: string;
  severity: string;
  title: string;
  body: string | null;
  deep_link: string | null;
  occurred_at: string;
}

interface WorkbenchItem {
  id: string;
  workflow_status: string;
  created_at: string;
  handled_at: string | null;
  platform_events: WorkbenchEvent | null;
}

interface WorkbenchData {
  assigned: WorkbenchItem[];
  waiting: WorkbenchItem[];
  recentlyResolved: WorkbenchItem[];
  activeCount: number;
}

// ─── Config (mirrors notifications page) ────────────────────────────────────────

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-blue-100 text-blue-700',
  low:      'bg-gray-100 text-gray-500',
  info:     'bg-gray-50 text-gray-400',
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  NEW:                { label: 'New',           cls: 'bg-gray-100 text-gray-500'   },
  INVESTIGATING:      { label: 'Investigating', cls: 'bg-blue-100 text-blue-700'   },
  WAITING_USER:       { label: 'Waiting: User', cls: 'bg-amber-100 text-amber-700' },
  WAITING_ENGINEER:   { label: 'Waiting: Eng',  cls: 'bg-orange-100 text-orange-700' },
  WAITING_ACCOUNTANT: { label: 'Waiting: Acct', cls: 'bg-yellow-100 text-yellow-800' },
  ESCALATED:          { label: 'Escalated',     cls: 'bg-rose-100 text-rose-700'   },
  RESOLVED:           { label: 'Resolved',      cls: 'bg-green-100 text-green-700' },
  DISMISSED:          { label: 'Dismissed',     cls: 'bg-gray-100 text-gray-400'   },
  REOPENED:           { label: 'Reopened',      cls: 'bg-purple-100 text-purple-700' },
};

const MODULE_ICON: Record<string, string> = {
  feedback: '💬', crm: '👥', invoices: '🧾', subscription: '💳',
  sync: '🔄', release: '🚀', ai: '🤖', planner: '📅', chat: '💬',
  quotes: '📋', accountant: '📊', admin: '🛡️',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'yesterday';
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function WorkbenchCard({ item }: { item: WorkbenchItem }) {
  const evt = item.platform_events;
  const sev = SEVERITY_BADGE[evt?.severity ?? 'info'] ?? SEVERITY_BADGE.info;
  const status = STATUS_BADGE[item.workflow_status] ?? STATUS_BADGE.NEW;
  const icon = MODULE_ICON[evt?.module ?? ''] ?? '📩';

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/70 transition-colors">
      <span className="text-xl flex-shrink-0 leading-none mt-0.5" aria-hidden="true">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <span className="text-[11px] font-medium text-gray-500 capitalize">{evt?.module ?? 'system'}</span>
          {evt?.severity && evt.severity !== 'info' && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${sev}`}>
              {evt.severity}
            </span>
          )}
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${status.cls}`}>
            {status.label}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900 leading-snug truncate">{evt?.title ?? '(no title)'}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Created {timeAgo(item.created_at)}
          {item.handled_at && ` · Resolved ${timeAgo(item.handled_at)}`}
        </p>
      </div>
      <Link
        href={`/admin/notifications?focus=${item.id}`}
        className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
      >
        Open
      </Link>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  title, icon, items, emptyText,
}: {
  title: string;
  icon: string;
  items: WorkbenchItem[];
  emptyText: string;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span aria-hidden="true">{icon}</span>
          {title}
        </h2>
        <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-gray-200 px-2 text-xs font-semibold text-gray-600">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-400 text-center">{emptyText}</p>
      ) : (
        <div>{items.map(item => <WorkbenchCard key={item.id} item={item} />)}</div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminWorkbenchPage() {
  const [data, setData] = useState<WorkbenchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) { setError('Auth unavailable'); setLoading(false); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError('Not authenticated'); setLoading(false); return; }

      const res = await fetch('/api/admin/workbench', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as { error?: string }).error ?? 'Failed to load workbench');
        setLoading(false);
        return;
      }
      const json = await res.json() as WorkbenchData;
      setData(json);
      setError('');
    } catch {
      setError('Failed to load workbench');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    const handleVisibility = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">My Workbench</h2>
          <p className="text-sm text-gray-500 mt-1">
            Your private operational queue — items assigned to you, waiting states, and recent resolutions.
          </p>
        </div>
        <button
          onClick={load}
          className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          aria-label="Refresh workbench"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 animate-pulse space-y-3">
              <div className="h-4 w-40 rounded bg-gray-100" />
              <div className="h-12 rounded bg-gray-50" />
              <div className="h-12 rounded bg-gray-50" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="space-y-6">
          <Section
            title="Assigned to me"
            icon="✋"
            items={data.assigned}
            emptyText="Nothing assigned to you right now. Claim items from the Notifications page."
          />
          <Section
            title="Waiting"
            icon="⏳"
            items={data.waiting}
            emptyText="No items waiting on a third party."
          />
          <Section
            title="Recently resolved by me"
            icon="✅"
            items={data.recentlyResolved}
            emptyText="No resolutions yet."
          />
        </div>
      ) : null}

      {/* Footer note */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">
        <p>
          This is your private workbench. Items appear here once you claim them on the{' '}
          <Link href="/admin/notifications" className="text-blue-600 hover:underline">Notifications</Link> page.
          Private troubleshooting notes are available inside each item&apos;s detail drawer.
        </p>
      </div>
    </div>
  );
}
