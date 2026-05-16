// src/app/(admin)/admin/engineering/stripe/health/page.tsx v1.0
//
// PURPOSE:
// - Engineering Stripe health screen.
// - Calls staff-only /api/admin/engineering/stripe/health.
// - Fail closed.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

type Payload =
  | { ok: true; now: string; env: any; stripe: any }
  | { error: string; details?: string };

export default function StripeHealthPage() {
  const { isLoggedIn, getAccessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Payload | null>(null);

  async function load() {
    setLoading(true);
    try {
      if (!isLoggedIn) {
        setData({ error: 'UNAUTHENTICATED' });
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        setData({ error: 'UNAUTHENTICATED' });
        return;
      }

      const res = await fetch('/api/admin/engineering/stripe/health', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const payload = (await res.json().catch(() => null)) as Payload | null;
      setData(payload || { error: 'BAD_RESPONSE' });
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
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Stripe Health</h1>
          <p className="text-sm sm:text-base text-gray-600">Environment sanity + optional Stripe connectivity ping.</p>
        </header>

        <div className={card}>
          {loading ? (
            <div className="text-sm text-gray-600">Checking…</div>
          ) : !data ? (
            <div className="text-sm text-red-700">No response.</div>
          ) : 'error' in data ? (
            <div className="text-sm text-red-700">
              {data.error}
              {data.details ? <div className="mt-1 text-xs text-gray-500">{data.details}</div> : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500">Now</div>
                <div className="text-sm font-semibold text-slate-900">{data.now}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Env</div>
                  <pre className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(data.env, null, 2)}</pre>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Stripe ping</div>
                  <pre className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(data.stripe, null, 2)}</pre>
                </div>
              </div>

              <div className="text-[11px] text-gray-500">
                Safety: no secrets are ever returned. This is engineer-only via proof-based staff gate.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}