// src/app/(admin)/admin/engineering/stripe/page.tsx v1.2
//
// PURPOSE:
// - Engineering Stripe Backbone (observability hub).
// - NOT support ops (no cancel/refund/vouchers).
// - Engineer-only visibility into:
//   - Webhook event intake + failures
//   - Stripe API operation failures (checkout/portal/etc)
//   - Health checks
//   - Correlation via request IDs / workspace / user
//
// SECURITY (LOCKED):
// - Must be protected by /admin/engineering/layout.tsx (engineer-only gate).
// - All data must come from staff-only APIs (fail closed).
//
// DESIGN (LOCKED):
// - White base, light grey surfaces, subtle borders.
// - Gold only as accent.
//
// CHANGES (v1.2):
// - Make hub feel truly “live”: add real-time API reachability probes (fail closed) and surface request-id on failures.
// - Add quick correlation jump (request_id / workspace_id / email) to reduce debugging time.
// - Keep same styling + keep ALL tiles live (routes unchanged).
//
// NOTE (PROOF-BASED):
// - This page does NOT assume API payload shapes.
// - It only probes endpoints for reachability (ok vs not ok) and shows request-id when present.

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Card = {
  key: string;
  title: string;
  description: string;
  href: string;
  status: 'live';
};

type ProbeState =
  | { phase: 'idle' | 'loading' }
  | { phase: 'ok'; ms: number }
  | { phase: 'error'; ms: number; status?: number; code?: string; reqId?: string; message?: string };

function GoldRuleLine() {
  return <div className="mt-1 h-[2px] w-10 rounded-full bg-[#C7A24B] opacity-70" />;
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
      Live
    </span>
  );
}

function Pill({
  label,
  kind,
}: {
  label: string;
  kind: 'ok' | 'warn' | 'err' | 'idle';
}) {
  const cls =
    kind === 'ok'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : kind === 'warn'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : kind === 'err'
          ? 'bg-rose-50 text-rose-700 border-rose-200'
          : 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function ProbeBadge({ probe }: { probe: ProbeState }) {
  if (probe.phase === 'idle') return <Pill kind="idle" label="Not checked" />;
  if (probe.phase === 'loading') return <Pill kind="idle" label="Checking…" />;
  if (probe.phase === 'ok') return <Pill kind="ok" label={`Reachable · ${probe.ms}ms`} />;

  // Explicit narrowing: probe.phase === 'error'
  if (probe.phase === 'error') {
    const code = probe.code ? ` · ${probe.code}` : '';
    const status = typeof probe.status === 'number' ? `HTTP ${probe.status}` : 'Failed';
    return <Pill kind="err" label={`${status}${code} · ${probe.ms}ms`} />;
  }

  return null;
}

function SmallMeta({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="text-[11px] text-gray-500">
      <span className="font-semibold text-gray-600">{label}:</span> <span className="font-mono">{value}</span>
    </div>
  );
}

function Tile({ c, probe }: { c: Card; probe?: ProbeState }) {
  const base =
    'block rounded-xl border bg-white p-4 transition ' +
    'hover:border-gray-300 hover:shadow-[0_1px_8px_rgba(0,0,0,0.06)]';

  const hasProbe = Boolean(probe);

  return (
    <Link href={c.href} className={base}>
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 leading-tight">{c.title}</h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{c.description}</p>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <LiveBadge />
            {hasProbe && <ProbeBadge probe={probe!} />}
          </div>
        </div>

        <GoldRuleLine />

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="inline-flex items-center text-sm font-semibold text-blue-600">Open</span>

          {probe && probe.phase === 'error' && (
            <span className="text-[11px] text-gray-500">
              {probe.reqId ? (
                <>
                  Trace: <span className="font-mono">{probe.reqId}</span>
                </>
              ) : (
                'Trace: —'
              )}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * Safe, proof-based reachability probe.
 * - Does NOT assume payload schema.
 * - Surfaces request-id header when present.
 * - Never throws to React.
 */
async function probeApi(url: string): Promise<ProbeState> {
  const t0 = performance.now();

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        // UI-only probe; API is still staff-gated server-side.
        // Token is expected to be handled by the API via existing auth context/session middleware in your stack.
        // If your API requires explicit Authorization header from client, wire it inside those pages (not here).
      } as any,
    });

    const ms = Math.max(0, Math.round(performance.now() - t0));

    if (res.ok) {
      return { phase: 'ok', ms };
    }

    const reqId =
      res.headers.get('x-request-id') ||
      res.headers.get('x-vercel-id') ||
      res.headers.get('cf-ray') ||
      res.headers.get('x-amzn-trace-id') ||
      undefined;

    let code: string | undefined;
    let message: string | undefined;

    // Best-effort parse (do not assume)
    try {
      const json = await res.json();
      if (json && typeof json === 'object') {
        if (typeof (json as any).error === 'string') code = (json as any).error;
        if (typeof (json as any).details === 'string') message = (json as any).details;
        if (!message && typeof (json as any).message === 'string') message = (json as any).message;
      }
    } catch {
      // ignore
    }

    return { phase: 'error', ms, status: res.status, code, reqId, message };
  } catch (e: any) {
    const ms = Math.max(0, Math.round(performance.now() - t0));
    return { phase: 'error', ms, code: 'NETWORK_ERROR', message: String(e?.message ?? e) };
  }
}

export default function EngineeringStripeBackbonePage() {
  const cards: Card[] = [
    {
      key: 'health',
      title: 'Health Check',
      description: 'Verify Stripe env + connectivity. Fail-closed diagnostics (no secrets).',
      href: '/admin/engineering/stripe/health',
      status: 'live',
    },
    {
      key: 'webhooks_recent',
      title: 'Webhook Events (recent)',
      description: 'Recent Stripe webhook events received + processing status.',
      href: '/admin/engineering/stripe/webhooks',
      status: 'live',
    },
    {
      key: 'webhooks_failures',
      title: 'Webhook Failures',
      description: 'Failed deliveries/processing only. Group by event type and surface errors.',
      href: '/admin/engineering/stripe/webhooks/failures',
      status: 'live',
    },
    {
      key: 'checkout_errors',
      title: 'Checkout Session Errors',
      description: 'Failed checkout session creations with request IDs and correlation fields.',
      href: '/admin/engineering/stripe/checkout-errors',
      status: 'live',
    },
    {
      key: 'portal_errors',
      title: 'Billing Portal Errors',
      description: 'Failed billing portal session creations + misconfig signals.',
      href: '/admin/engineering/stripe/portal-errors',
      status: 'live',
    },
    {
      key: 'ops',
      title: 'Stripe Ops / Edge Logs',
      description: 'Stripe-related ops attempts (edge/server): vouchers, refunds, subs actions, etc.',
      href: '/admin/engineering/stripe/ops',
      status: 'live',
    },
  ];

  // Probes: only for endpoints we have strong evidence exist in your repo.
  // (Based on your file tree screenshot under src/app/api/admin/engineering/stripe/*)
  const probeTargets = useMemo(
    () => [
      { key: 'health', url: '/api/admin/engineering/stripe/health' },
      { key: 'ops', url: '/api/admin/engineering/stripe/ops' },
      { key: 'webhooks_failures', url: '/api/admin/engineering/stripe/webhooks/failures' },
    ],
    []
  );

  const [probes, setProbes] = useState<Record<string, ProbeState>>(() => {
    const init: Record<string, ProbeState> = {};
    for (const t of probeTargets) init[t.key] = { phase: 'idle' };
    return init;
  });

  const [refreshTick, setRefreshTick] = useState(0);

  // Quick correlation jump state (does not fetch; just links with query params)
  const [requestId, setRequestId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // set loading
      setProbes((prev) => {
        const next = { ...prev };
        for (const t of probeTargets) next[t.key] = { phase: 'loading' };
        return next;
      });

      const results = await Promise.all(
        probeTargets.map(async (t) => ({ key: t.key, result: await probeApi(t.url) }))
      );

      if (cancelled) return;

      setProbes((prev) => {
        const next = { ...prev };
        for (const r of results) next[r.key] = r.result;
        return next;
      });
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [probeTargets, refreshTick]);

  const healthProbe = probes['health'];
  const opsProbe = probes['ops'];
  const webhooksFailuresProbe = probes['webhooks_failures'];

  // Helper links with query strings (pages can choose to read/ignore these)
  const qp = (k: string, v: string) => (v.trim() ? `${k}=${encodeURIComponent(v.trim())}` : '');
  const qsParts = [
    qp('request_id', requestId),
    qp('workspace_id', workspaceId),
    qp('email', email),
  ].filter(Boolean);
  const qs = qsParts.length ? `?${qsParts.join('&')}` : '';

  return (
    <div className="min-h-[calc(100vh-120px)]">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin/engineering" className="text-blue-600 hover:text-blue-700 inline-block">
            ← Engineering
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setRefreshTick((n) => n + 1)}
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
              title="Re-run live probes"
            >
              Refresh probes
            </button>

            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="text-xs text-gray-500">Scope</div>
              <div className="text-sm font-semibold text-slate-900">
                Engineering-only Stripe observability (no support ops actions).
              </div>
            </div>
          </div>
        </div>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Stripe Backbone</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Webhook events, API failures, and ops logs — under one engineer-only gate.
          </p>
        </header>

        {/* Live reachability strip (zero schema assumptions) */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">Live probes</h2>
              <p className="text-sm text-gray-600 mt-1">
                Fast signal: are key Stripe observability endpoints reachable right now? (Fail closed.)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-500">Health</span>
                <ProbeBadge probe={healthProbe ?? { phase: 'idle' }} />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-500">Ops</span>
                <ProbeBadge probe={opsProbe ?? { phase: 'idle' }} />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-500">Webhook failures</span>
                <ProbeBadge probe={webhooksFailuresProbe ?? { phase: 'idle' }} />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-slate-900">If probes fail…</div>
              <div className="mt-1 text-sm text-gray-600">
                Use the request-id (if present) to correlate across Vercel/Supabase logs and Stripe retries.
              </div>
              {healthProbe && healthProbe.phase === 'error' && (
                <div className="mt-2 space-y-1">
                  <SmallMeta label="request-id" value={healthProbe.reqId} />
                  <SmallMeta label="details" value={healthProbe.message} />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Fail-closed expectation</div>
              <div className="mt-1 text-sm text-gray-600">
                Non-staff must never see data. If you get 401/403 here while signed-in as engineer, auth/session is the
                first suspect.
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Correlation fields</div>
              <div className="mt-1 text-sm text-gray-600">
                Prefer tracing by <span className="font-mono">request_id</span> → <span className="font-mono">workspace_id</span> →
                <span className="font-mono"> user/email</span>.
              </div>
            </div>
          </div>
        </section>

        {/* Quick correlation jump (no assumptions, just query params) */}
        <section className="bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">Quick correlation jump</h2>
              <p className="text-sm text-gray-600 mt-1">
                Paste a trace/workspace/email and jump straight into the relevant views (pages may use/ignore these
                query params).
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-[11px] font-semibold tracking-widest text-gray-500">REQUEST ID</div>
              <input
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                placeholder="x-request-id / x-vercel-id / cf-ray…"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/admin/engineering/stripe/ops${qs}`}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
                >
                  Ops logs
                </Link>
                <Link
                  href={`/admin/engineering/stripe/webhooks/failures${qs}`}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
                >
                  Webhook failures
                </Link>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-[11px] font-semibold tracking-widest text-gray-500">WORKSPACE ID</div>
              <input
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                placeholder="workspace uuid…"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/admin/engineering/stripe/ops${qs}`}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
                >
                  Ops logs
                </Link>
                <Link
                  href={`/admin/engineering/stripe/webhooks${qs}`}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
                >
                  Webhooks
                </Link>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-[11px] font-semibold tracking-widest text-gray-500">EMAIL</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user email…"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/admin/engineering/stripe/checkout-errors${qs}`}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
                >
                  Checkout errors
                </Link>
                <Link
                  href={`/admin/engineering/stripe/portal-errors${qs}`}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-gray-50"
                >
                  Portal errors
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-4 text-[11px] text-gray-500">
            Tip: keep correlation query params consistent across pages: <span className="font-mono">request_id</span>,{' '}
            <span className="font-mono">workspace_id</span>, <span className="font-mono">email</span>.
          </div>
        </section>

        {/* Observability tiles */}
        <section className="bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">Observability</h2>
              <p className="text-sm text-gray-600 mt-1">Start here when “Stripe is not working”.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((c) => (
              <Tile
                key={c.key}
                c={c}
                probe={
                  c.key === 'health'
                    ? probes['health']
                    : c.key === 'ops'
                      ? probes['ops']
                      : c.key === 'webhooks_failures'
                        ? probes['webhooks_failures']
                        : undefined
                }
              />
            ))}
          </div>

          <div className="mt-4 text-[11px] text-gray-500">
            Rule: every page reads from staff-only APIs (fail closed), with correlation fields (workspace/user/request IDs).
          </div>
        </section>
      </div>
    </div>
  );
}