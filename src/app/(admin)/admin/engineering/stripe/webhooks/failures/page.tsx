// src/app/(admin)/admin/engineering/stripe/webhooks/failures/page.tsx v1.0
//
// PURPOSE:
// - Webhook failures only (engineer-only).
// - Reads /api/admin/engineering/stripe/webhooks/failures.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

type Row = {
  id: string;
  received_at: string;
  stripe_event_id: string;
  event_type: string;
  signature_valid: boolean | null;
  http_status: number | null;
  processed: boolean;
  error_message: string | null;
  stripe_request_id: string | null;
};

export default function StripeWebhookFailuresPage() {
  const { isLoggedIn, getAccessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Row[]>([]);
  const [err, setErr] = useState<string>('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      if (!isLoggedIn) {
        setErr('UNAUTHENTICATED');
        setItems([]);
        return;
      }
      const token = await getAccessToken();
      if (!token) {
        setErr('UNAUTHENTICATED');
        setItems([]);
        return;
      }

      const res = await fetch('/api/admin/engineering/stripe/webhooks/failures?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(payload?.error || 'FAILED');
        setItems([]);
        return;
      }

      setItems(payload?.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = 'bg-white border border-gray-200 rounded-2xl p-5 sm:p-6';

  return (
    <div className="min-h-[calc(100vh-120px)]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin/engineering/stripe" className="text-blue-600 hover:text-blue-700 inline-block">
            ← Stripe Backbone
          </Link>

          <button
            onClick={load}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Webhook Failures</h1>
          <p className="text-sm sm:text-base text-gray-600">Only failures: signature issues, HTTP 4xx/5xx, not processed.</p>
        </header>

        <div className={card}>
          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : err ? (
            <div className="text-sm text-red-700">{err}</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-gray-600">No failures recorded (nice).</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-[1050px] w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4">Received</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Event ID</th>
                    <th className="py-2 pr-4">HTTP</th>
                    <th className="py-2 pr-4">Sig</th>
                    <th className="py-2 pr-4">Processed</th>
                    <th className="py-2 pr-4">Request ID</th>
                    <th className="py-2 pr-4">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-gray-700">{new Date(r.received_at).toLocaleString()}</td>
                      <td className="py-2 pr-4 font-medium text-slate-900">{r.event_type}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-700">{r.stripe_event_id}</td>
                      <td className="py-2 pr-4 text-gray-700">{r.http_status ?? '—'}</td>
                      <td className="py-2 pr-4 text-gray-700">
                        {r.signature_valid === null ? '—' : r.signature_valid ? 'OK' : 'BAD'}
                      </td>
                      <td className="py-2 pr-4">
                        {r.processed ? 'Yes' : <span className="text-rose-700 font-semibold">No</span>}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-700">{r.stripe_request_id ?? '—'}</td>
                      <td className="py-2 pr-4 text-gray-700">{r.error_message ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 text-[11px] text-gray-500">
            If failures exist but you can’t correlate them, ensure your webhook handler stores request IDs and error_message.
          </div>
        </div>
      </div>
    </div>
  );
}