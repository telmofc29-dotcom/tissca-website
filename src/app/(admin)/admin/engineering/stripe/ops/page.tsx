// src/app/(admin)/admin/engineering/stripe/ops/page.tsx v1.1
//
// PURPOSE:
// - Engineering Stripe Backbone → Ops log viewer.
// - Displays rows from stripe_ops_log via /api/admin/engineering/stripe/ops.
//
// CHANGES (v1.1):
// - LIVE: Add filters (kind / success / workspace / user).
// - LIVE: Cursor pagination (Load more).
// - LIVE: Copy buttons for correlation fields (workspace / user / stripe request).
// - LIVE: Failure-first toggle.
// - KEEP: Engineer auth via Bearer token from useAuth().
// - KEEP: White admin UI style.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

type Row = {
  id: string;
  created_at: string;
  kind: string;
  route: string | null;
  workspace_id: string | null;
  user_id: string | null;
  stripe_request_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  success: boolean;
  error_code: string | null;
  error_message: string | null;
};

export default function StripeOpsPage() {
  const { isLoggedIn, getAccessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Row[]>([]);
  const [err, setErr] = useState('');

  const [kind, setKind] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [user, setUser] = useState('');
  const [failuresOnly, setFailuresOnly] = useState(false);

  const [cursor, setCursor] = useState<string | null>(null);

  async function load(reset = true) {
    setLoading(true);
    setErr('');

    try {
      if (!isLoggedIn) {
        setErr('UNAUTHENTICATED');
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        setErr('UNAUTHENTICATED');
        return;
      }

      const params = new URLSearchParams();
      params.set('limit', '100');

      if (kind) params.set('kind', kind);
      if (workspace) params.set('workspace_id', workspace);
      if (user) params.set('user_id', user);
      if (failuresOnly) params.set('success', 'false');
      if (!reset && cursor) params.set('before', cursor);

      const res = await fetch(`/api/admin/engineering/stripe/ops?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(payload?.error || 'FAILED');
        return;
      }

      const newItems: Row[] = payload?.items || [];

      if (reset) setItems(newItems);
      else setItems((prev) => [...prev, ...newItems]);

      if (newItems.length) {
        setCursor(newItems[newItems.length - 1].created_at);
      }
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copy(v: string | null) {
    if (!v) return;
    navigator.clipboard.writeText(v);
  }

  const card = 'bg-white border border-gray-200 rounded-2xl p-5 sm:p-6';

  return (
    <div className="min-h-[calc(100vh-120px)]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin/engineering/stripe" className="text-blue-600 hover:text-blue-700 inline-block">
            ← Stripe Backbone
          </Link>

          <button
            onClick={() => load(true)}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Stripe Ops / Logs</h1>
          <p className="text-sm sm:text-base text-gray-600">
            All Stripe operations attempted by the platform.
          </p>
        </header>

        {/* Filters */}
        <div className={card}>
          <div className="grid md:grid-cols-5 gap-3">
            <input
              placeholder="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />

            <input
              placeholder="workspace id"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />

            <input
              placeholder="user id"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={failuresOnly}
                onChange={(e) => setFailuresOnly(e.target.checked)}
              />
              Failures only
            </label>

            <button
              onClick={() => load(true)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={card}>
          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : err ? (
            <div className="text-sm text-red-700">{err}</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-gray-600">No ops recorded yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-[1400px] w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Kind</th>
                    <th className="py-2 pr-4">Success</th>
                    <th className="py-2 pr-4">Route</th>
                    <th className="py-2 pr-4">Workspace</th>
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Stripe req</th>
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4">Error</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-gray-700">
                        {new Date(r.created_at).toLocaleString()}
                      </td>

                      <td className="py-2 pr-4 font-semibold text-slate-900">
                        {r.kind}
                      </td>

                      <td className="py-2 pr-4">
                        {r.success ? (
                          <span className="badge-success">Yes</span>
                        ) : (
                          <span className="badge-error">No</span>
                        )}
                      </td>

                      <td className="py-2 pr-4">{r.route ?? '—'}</td>

                      <td className="py-2 pr-4 font-mono text-xs">
                        {r.workspace_id ?? '—'}
                        {r.workspace_id && (
                          <button
                            onClick={() => copy(r.workspace_id)}
                            className="ml-2 text-blue-600"
                          >
                            copy
                          </button>
                        )}
                      </td>

                      <td className="py-2 pr-4 font-mono text-xs">
                        {r.user_id ?? '—'}
                        {r.user_id && (
                          <button
                            onClick={() => copy(r.user_id)}
                            className="ml-2 text-blue-600"
                          >
                            copy
                          </button>
                        )}
                      </td>

                      <td className="py-2 pr-4 font-mono text-xs">
                        {r.stripe_request_id ?? '—'}
                        {r.stripe_request_id && (
                          <button
                            onClick={() => copy(r.stripe_request_id)}
                            className="ml-2 text-blue-600"
                          >
                            copy
                          </button>
                        )}
                      </td>

                      <td className="py-2 pr-4 font-mono text-xs">
                        {r.stripe_customer_id ?? '—'}
                      </td>

                      <td className="py-2 pr-4 text-gray-700">
                        {r.error_code ? `${r.error_code}: ` : ''}
                        {r.error_message ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !err && items.length > 0 && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => load(false)}
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm hover:bg-gray-50"
              >
                Load more
              </button>
            </div>
          )}

          <div className="mt-4 text-[11px] text-gray-500">
            Correlation tip: copy workspace_id or stripe_request_id and search it across logs.
          </div>
        </div>
      </div>
    </div>
  );
}