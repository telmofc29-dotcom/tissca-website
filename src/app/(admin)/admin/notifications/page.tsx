// src/app/(admin)/admin/notifications/page.tsx
//
// PURPOSE:
// Phase 2 admin notification centre.
// Reads from GET /api/admin/notifications (admin_notifications joined with platform_events).
// Supports mark-read, mark-all-read, and dismiss — all persisted to DB.
//
// Polling: refreshes every 30 seconds (same cadence as member notification hook).
// No Supabase Realtime yet (Phase 3).

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlatformEvent {
  id: string;
  module: string;
  event_type: string;
  severity: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  deep_link: string | null;
  metadata: Record<string, unknown>;
  workspace_id: string | null;
  occurred_at: string;
}

interface AdminNotification {
  id: string;
  is_read: boolean;
  is_dismissed: boolean;
  read_at: string | null;
  dismissed_at: string | null;
  assigned_to: string | null;
  handled_by: string | null;
  handled_at: string | null;
  escalated: boolean;
  created_at: string;
  platform_events: PlatformEvent | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityBadge(severity?: string) {
  if (!severity || severity === 'info') return null;
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high:     'bg-orange-100 text-orange-700 border-orange-200',
    medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
    low:      'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${map[severity] ?? map.low}`}>
      {severity}
    </span>
  );
}

function moduleBadge(module?: string) {
  if (!module) return null;
  const map: Record<string, string> = {
    feedback:     'bg-blue-100 text-blue-700',
    crm:          'bg-green-100 text-green-700',
    invoices:     'bg-amber-100 text-amber-700',
    subscription: 'bg-purple-100 text-purple-700',
    sync:         'bg-red-100 text-red-700',
    release:      'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[module] ?? 'bg-gray-100 text-gray-600'}`}>
      {module}
    </span>
  );
}

function moduleIcon(module?: string): string {
  switch (module) {
    case 'feedback':     return '💬';
    case 'crm':          return '👥';
    case 'invoices':     return '🧾';
    case 'subscription': return '💳';
    case 'sync':         return '🔄';
    case 'release':      return '🚀';
    case 'ai':           return '🤖';
    default:             return '📩';
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB');
}

function eventTypeLabel(eventType?: string): string {
  if (!eventType) return 'Event';
  return eventType.replace(/\./g, ' › ').replace(/_/g, ' ');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const MODULE_TABS = [
  { key: 'all',          label: 'All',           icon: '🔔' },
  { key: 'feedback',     label: 'Feedback',       icon: '💬' },
  { key: 'crm',          label: 'CRM',            icon: '👥' },
  { key: 'invoices',     label: 'Invoices',       icon: '🧾' },
  { key: 'subscription', label: 'Subscriptions',  icon: '💳' },
  { key: 'sync',         label: 'Sync',           icon: '🔄' },
] as const;

type ModuleFilter = typeof MODULE_TABS[number]['key'];

export default function AdminNotificationsPage() {
  const [items, setItems]         = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filter, setFilter]       = useState<ModuleFilter>('all');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auth token helper ─────────────────────────────────────────────────────

  const getToken = useCallback(async (): Promise<string | null> => {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) { setError('Not authenticated'); setLoading(false); return; }

      const [listRes, countRes] = await Promise.all([
        fetch('/api/admin/notifications?limit=100', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/notifications/count', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!listRes.ok) {
        const errJson = await listRes.json().catch(() => ({}));
        setError((errJson as { error?: string }).error ?? 'Failed to load notifications');
        return;
      }

      const listJson = await listRes.json() as { notifications?: AdminNotification[] };
      setItems(listJson.notifications ?? []);
      setError('');

      if (countRes.ok) {
        const countJson = await countRes.json() as { count?: number };
        setUnreadCount(countJson.count ?? 0);
      }
    } catch {
      setError('Unable to load. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Initial load + 30s polling
  useEffect(() => {
    setLoading(true);
    load();
    pollTimerRef.current = setInterval(load, 30_000);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [load]);

  // ── Actions (persisted to DB) ─────────────────────────────────────────────

  const markRead = useCallback(async (notifId: string) => {
    setItems((prev) =>
      prev.map((n) => n.id === notifId ? { ...n, is_read: true } : n),
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    const token = await getToken();
    if (!token) return;
    const res = await fetch(`/api/admin/notifications/${notifId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) load();
  }, [getToken, load]);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/admin/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) load();
  }, [getToken, load]);

  const dismiss = useCallback(async (notifId: string) => {
    const wasUnread = items.find((n) => n.id === notifId)?.is_read === false;
    setItems((prev) => prev.filter((n) => n.id !== notifId));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));

    const token = await getToken();
    if (!token) return;
    const res = await fetch(`/api/admin/notifications/${notifId}/dismiss`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) load();
  }, [getToken, load, items]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const visible = filter === 'all'
    ? items
    : items.filter((n) => n.platform_events?.module === filter);

  const tabCount = (key: ModuleFilter) =>
    key === 'all'
      ? items.length
      : items.filter((n) => n.platform_events?.module === key).length;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500 mt-1">
            {loading
              ? 'Loading…'
              : unreadCount > 0
                ? `${unreadCount} unread item${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up — inbox clear'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => { setLoading(true); load(); }}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Refresh
          </button>
          <Link
            href="/admin/feedback"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Feedback dashboard →
          </Link>
        </div>
      </div>

      {/* Module tabs */}
      <div className="flex flex-wrap gap-2">
        {MODULE_TABS.map(({ key, label, icon }) => {
          const count = tabCount(key);
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {count > 0 && (
                <span className={`ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  filter === key ? 'bg-white/25 text-white' : 'bg-gray-300 text-gray-700'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
      )}

      {/* Empty */}
      {!loading && !error && visible.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-500 text-sm">
            No notifications{filter !== 'all' ? ` in ${filter}` : ''}.
          </p>
          {items.length === 0 && (
            <p className="text-gray-400 text-xs mt-2">
              Notifications appear here when feedback is submitted or platform events occur.
            </p>
          )}
        </div>
      )}

      {/* Notification list */}
      {!loading && !error && visible.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {visible.map((notif) => {
            const evt = notif.platform_events;
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                  notif.is_read ? 'bg-white' : 'bg-blue-50/40'
                }`}
              >
                {/* Module icon */}
                <div className={`flex-shrink-0 text-2xl mt-0.5 ${notif.is_read ? 'opacity-40' : ''}`}>
                  {moduleIcon(evt?.module)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {moduleBadge(evt?.module)}
                    {severityBadge(evt?.severity)}
                    {!notif.is_read && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                        NEW
                      </span>
                    )}
                  </div>

                  <p className={`text-sm font-semibold ${notif.is_read ? 'text-gray-500' : 'text-gray-900'}`}>
                    {evt?.title ?? '(no title)'}
                  </p>

                  {evt?.event_type && (
                    <p className="text-xs text-gray-400 mt-0.5">{eventTypeLabel(evt.event_type)}</p>
                  )}

                  {evt?.body && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{evt.body}</p>
                  )}

                  <p className="text-xs text-gray-400 mt-1.5">
                    {timeAgo(evt?.occurred_at ?? notif.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  {evt?.deep_link && (
                    <Link
                      href={evt.deep_link}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                    >
                      Open →
                    </Link>
                  )}

                  {!notif.is_read && (
                    <button
                      onClick={() => markRead(notif.id)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      Mark read
                    </button>
                  )}

                  <button
                    onClick={() => dismiss(notif.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-400 border border-red-100 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Roadmap footer */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-600">Notification system roadmap</p>
        <p>✅ <strong>Phase 1</strong> — Bell icon, sidebar badge, notifications page</p>
        <p>✅ <strong>Phase 2</strong> — platform_events table, admin_notifications table, feedback fan-out, per-staff inbox, mark read/dismiss persisted to DB</p>
        <p>⏳ <strong>Phase 3</strong> — CRM / invoice / sync / subscription events, staff assignment, escalation, email digests</p>
        <p>⏳ <strong>Phase 4</strong> — Supabase Realtime push for critical alerts, mobile push (APNs/FCM), AI clustering</p>
      </div>
    </div>
  );
}

