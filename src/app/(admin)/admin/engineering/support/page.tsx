// src/app/(admin)/admin/engineering/support/page.tsx v1.2
//
// PURPOSE:
// - Admin Support Inbox: lists admin_user_notes across all users.
// - Email-like workflow:
//   - Default: Open notes only
//   - Filters: New / Open / Archived / All
//   - Search: note text, email, name, user_id
//   - Actions:
//     - Archive thread / Reopen thread (thread-level, direct from inbox)
//     - Jump to user (Users page) and auto-open user modal
//
// NOTE:
// - This page relies on GET /api/admin/support/notes.
// - Thread archive endpoint:
//   PATCH /api/admin/users/[id]/notes/archive  body: { archived: true|false }
//
// CHANGES (v1.2):
// - Add "Archive thread" / "Reopen thread" buttons in inbox (no need to open Users modal).
// - Add filters: New + All (in addition to Open/Archived).
// - Because support/notes endpoint only supports status=open|archived, "All" fetches both and merges.
// - "New" is defined as Open notes created within the last 7 days (no "seen" field exists yet).

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';

type InboxRow = {
  id: string;
  user_id: string;
  created_by: string;
  note: string;
  created_at: string;
  status: 'open' | 'archived';
  archived_at?: string | null;
  user_profiles?: {
    email?: string | null;
    full_name?: string | null;
    current_workspace_id?: string | null;
  } | null;
};

type ViewFilter = 'new' | 'open' | 'archived' | 'all';

const NEW_WINDOW_DAYS = 7;

function fmtDate(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString();
}

function readInboxRows(payload: any): InboxRow[] {
  if (Array.isArray(payload?.notes)) return payload.notes as InboxRow[];
  if (Array.isArray(payload?.rows)) return payload.rows as InboxRow[];
  return [];
}

function uniqById(rows: InboxRow[]) {
  const m = new Map<string, InboxRow>();
  for (const r of rows) m.set(r.id, r);
  return Array.from(m.values());
}

export default function AdminSupportInboxPage() {
  const { isLoggedIn, getAccessToken } = useAuth();

  const [view, setView] = useState<ViewFilter>('open');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [rows, setRows] = useState<InboxRow[]>([]);
  const [threadBusyByUserId, setThreadBusyByUserId] = useState<Record<string, boolean>>({});

  async function fetchNotesByStatus(token: string, status: 'open' | 'archived') {
    const url = new URL('/api/admin/support/notes', window.location.origin);
    url.searchParams.set('status', status);
    if (query.trim()) url.searchParams.set('query', query.trim());
    url.searchParams.set('limit', '200');
    url.searchParams.set('offset', '0');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(payload?.error || `Failed (HTTP ${res.status})`);

    return readInboxRows(payload);
  }

  async function load() {
    try {
      setError('');
      setLoading(true);

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      // support/notes endpoint only supports open|archived.
      // For "all" we fetch both and merge client-side.
      // For "new" we fetch open and filter client-side.
      if (view === 'all') {
        const [openRows, archivedRows] = await Promise.all([
          fetchNotesByStatus(token, 'open'),
          fetchNotesByStatus(token, 'archived'),
        ]);

        setRows(
          uniqById([...openRows, ...archivedRows]).sort((a, b) => {
            const ta = new Date(a.created_at).getTime();
            const tb = new Date(b.created_at).getTime();
            return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
          })
        );
        return;
      }

      if (view === 'archived') {
        setRows(await fetchNotesByStatus(token, 'archived'));
        return;
      }

      // open or new
      setRows(await fetchNotesByStatus(token, 'open'));
    } catch (e: any) {
      setRows([]);
      setError(e?.message || 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }

  async function setThreadArchived(userId: string, archived: boolean) {
    try {
      setError('');
      setThreadBusyByUserId((p) => ({ ...p, [userId]: true }));

      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/notes/archive`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({ archived }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || `Failed (HTTP ${res.status})`);

      // Refresh list after thread action
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to update thread');
    } finally {
      setThreadBusyByUserId((p) => ({ ...p, [userId]: false }));
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, view]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const base = rows.filter((r) => {
      if (!q) return true;
      const email = String(r.user_profiles?.email ?? '').toLowerCase();
      const name = String(r.user_profiles?.full_name ?? '').toLowerCase();
      const note = String(r.note ?? '').toLowerCase();
      const userId = String(r.user_id ?? '').toLowerCase();
      return email.includes(q) || name.includes(q) || note.includes(q) || userId.includes(q);
    });

    if (view !== 'new') return base;

    const cutoff = Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return base.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return Number.isFinite(t) && t >= cutoff;
    });
  }, [rows, query, view]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 text-slate-900">
      <div className="max-w-7xl mx-auto px-4">
        <Link href="/admin" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Admin Dashboard
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Support Inbox</h1>
            <p className="text-gray-600">Work the backlog like email: open items stay visible until archived.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="text-sm border border-gray-300 bg-white px-3 py-2 rounded hover:bg-gray-50 font-semibold text-slate-900"
              type="button"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            placeholder="Search notes, email, name, user id..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border border-gray-300 bg-white text-slate-900 placeholder:text-gray-400 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />

          <select
            value={view}
            onChange={(e) => setView(e.target.value as ViewFilter)}
            className="border border-gray-300 bg-white text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="new">New (last {NEW_WINDOW_DAYS} days)</option>
            <option value="open">Open</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center justify-between">
            <span>
              Showing <span className="font-semibold text-slate-900">{filtered.length}</span> items
            </span>
            <span className="text-xs text-gray-500">Tip: archive/reopen thread directly from the inbox</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
        )}

        {loading ? (
          <p className="text-gray-700">Loading inbox...</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">User</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Note</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Created</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((r) => {
                    const email = r.user_profiles?.email || '—';
                    const name = r.user_profiles?.full_name || '—';
                    const workspace = r.user_profiles?.current_workspace_id || '—';

                    const openHref =
                      `/admin/users?openUserId=${encodeURIComponent(r.user_id)}` +
                      (r.user_profiles?.email
                        ? `&openUserEmail=${encodeURIComponent(String(r.user_profiles.email))}`
                        : '');

                    const busy = Boolean(threadBusyByUserId[r.user_id]);

                    const canArchive = r.status === 'open';
                    const actionLabel = canArchive ? 'Archive thread' : 'Reopen thread';

                    return (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{email}</div>
                          <div className="text-xs text-gray-500">{name}</div>
                          <div className="text-[11px] text-gray-500 font-mono break-all">UID: {r.user_id}</div>
                          <div className="text-[11px] text-gray-400 font-mono break-all">WS: {workspace}</div>
                        </td>

                        <td className="px-6 py-4 text-gray-700">
                          <div className="whitespace-pre-wrap break-words">{r.note}</div>
                        </td>

                        <td className="px-6 py-4 text-gray-700">
                          <div>{fmtDate(r.created_at)}</div>
                          {r.archived_at ? <div className="text-xs text-gray-500">Archived: {fmtDate(r.archived_at)}</div> : null}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded border ${
                              r.status === 'open'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {r.status === 'open' ? 'Open' : 'Archived'}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setThreadArchived(r.user_id, canArchive)}
                              className={`text-xs px-3 py-1.5 rounded border font-semibold ${
                                canArchive
                                  ? 'border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100'
                                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-100'
                              } ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                              title="Thread-level action: archives/unarchives ALL notes for this user"
                            >
                              {busy ? 'Working…' : actionLabel}
                            </button>

                            <Link
                              href={openHref}
                              className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                              title="Open Users page and auto-open this user modal"
                            >
                              Open in Users
                            </Link>
                          </div>

                          <div className="text-[11px] text-gray-500 mt-2">
                            Thread actions affect all notes for that user (PATCH /api/admin/users/[id]/notes/archive).
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filtered.length === 0 && (
                    <tr>
                      <td className="px-6 py-10 text-center text-gray-600" colSpan={5}>
                        No items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}