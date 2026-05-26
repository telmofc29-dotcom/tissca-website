// src/app/(member)/app/overview/page.tsx v2.1
//
// PURPOSE:
// - Member app overview UI with real workspace metrics.
//
// CHANGES (v2.1):
// - FIX: Use WorkspaceContext token flow instead of local getSession() so
//   dashboard stats load on the same proofed auth path as the rest of /app.
// - UI: Restore dark TISSCA overview styling using existing navy/gold tokens.
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v1.1 (2026-03-01): Light theme + improved readability.
// - v2.0 (2026-03-25): Wire metrics to real /api/workspace/stats data.
// - v2.1 (2026-05-19): Fix auth/data loading path and restore premium dark theme.

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { trackEvent } from '@/utils/analytics';

type WorkspaceStats = {
  leads: { total: number; new: number; quoted: number; won: number; lost: number };
  jobs: { total: number; active: number; completed: number };
  quotes: { total: number; open: number };
  invoices: { total: number; outstanding: number; outstanding_value: number; paid: number; draft: number };
  earnings: { yearGross: number; monthGross: number; monthNet: number; materials: number };
  conversion: number;
  documents: { invoicesGenerated: number; quotesGenerated: number };
};

const emptyStats: WorkspaceStats = {
  leads: { total: 0, new: 0, quoted: 0, won: 0, lost: 0 },
  jobs: { total: 0, active: 0, completed: 0 },
  quotes: { total: 0, open: 0 },
  invoices: { total: 0, outstanding: 0, outstanding_value: 0, paid: 0, draft: 0 },
  earnings: { yearGross: 0, monthGross: 0, monthNet: 0, materials: 0 },
  conversion: 0,
  documents: { invoicesGenerated: 0, quotesGenerated: 0 },
};

export default function AppOverviewPage() {
  const { accessToken, isLoading: ctxLoading, error: ctxError, refresh } = useWorkspace();
  const [stats, setStats] = useState<WorkspaceStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxLoading) return;
    if (!accessToken) {
      setLoading(false);
      setError(ctxError ?? 'No workspace session available.');
      return;
    }

    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/workspace/stats', {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Failed to load dashboard stats (HTTP ${res.status})`);
        }

        const json = await res.json();
        setStats(json as WorkspaceStats);
        trackEvent('feature_view', '/app/overview', {
          eventLabel: 'overview_viewed',
          metadata: {
            feature: 'overview',
            action: 'overview_viewed',
            itemCount: (json as WorkspaceStats).leads.total + (json as WorkspaceStats).jobs.total,
            sourcePage: '/app/overview',
          },
        });
      } catch (e) {
        console.warn('[AppOverviewPage] Failed to load workspace stats:', e);
        setError(e instanceof Error ? e.message : 'Failed to load dashboard stats.');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [accessToken, ctxError, ctxLoading]);

  const fmtCurrency = (v: number) =>
    v === 0
      ? '\u00A30'
      : `\u00A3${v.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const kpis = [
    {
      label: 'Open leads',
      value: loading ? '\u2014' : String(stats.leads.new),
      note: loading ? 'Loading\u2026' : `${stats.leads.total} total leads`,
    },
    {
      label: 'Active jobs',
      value: loading ? '\u2014' : String(stats.jobs.active),
      note: loading ? 'Loading\u2026' : `${stats.jobs.total} total jobs`,
    },
    {
      label: 'Open quotes',
      value: loading ? '\u2014' : String(stats.quotes.open),
      note: loading ? 'Loading\u2026' : `${stats.quotes.total} total quotes`,
    },
    {
      label: 'Outstanding invoices',
      value: loading ? '\u2014' : fmtCurrency(stats.invoices.outstanding_value),
      note: loading ? 'Loading\u2026' : `${stats.invoices.outstanding} outstanding`,
    },
  ];

  const summaryCards = [
    {
      label: 'Year gross',
      value: loading ? '\u2014' : fmtCurrency(stats.earnings.yearGross),
      note: 'Invoices generated this year',
    },
    {
      label: 'Month gross',
      value: loading ? '\u2014' : fmtCurrency(stats.earnings.monthGross),
      note: 'Current month revenue',
    },
    {
      label: 'Month net',
      value: loading ? '\u2014' : fmtCurrency(stats.earnings.monthNet),
      note: 'Current month net estimate',
    },
    {
      label: 'Conversion',
      value: loading ? '\u2014' : `${stats.conversion}%`,
      note: 'Lead to won conversion',
    },
  ];

  return (
    <div className="space-y-6 rounded-[28px] border border-white/10 bg-gradient-to-br from-navy via-navy-light to-[#101a24] p-5 text-white shadow-[0_28px_90px_-48px_rgba(0,0,0,0.75)] sm:p-6">
      <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(203,178,107,0.18),_transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#cbb26b]">TISSCA overview</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Dashboard</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/60">
              Live workspace metrics on the same authenticated path as the rest of the member app.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">{card.label}</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-[#f2e3b3]">{card.value}</p>
                <p className="mt-1 text-xs text-white/40">{card.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <section className="flex flex-col gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Dashboard data could not be loaded.</p>
            <p className="mt-1 text-red-100/80">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-full border border-red-200/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Retry
          </button>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.4)] backdrop-blur-sm"
          >
            <p className="text-sm font-medium text-white/60">{kpi.label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{kpi.value}</p>
            <p className="mt-1 text-xs text-white/40">{kpi.note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.32)] backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white">Quick actions</h2>
          <p className="mt-1 text-sm text-white/60">Jump straight into the key areas of your workspace.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/app/leads"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              onClick={() => trackEvent('quick_action_click', '/app/overview', { metadata: { feature: 'leads', action: 'open_leads', sourcePage: '/app/overview' } })}
            >
              Open leads
            </Link>
            <Link
              href="/app/quotes"
              className="rounded-full border border-[#cbb26b]/40 bg-[#cbb26b]/15 px-4 py-2 text-sm font-semibold text-[#f2e3b3] transition hover:bg-[#cbb26b]/20"
              onClick={() => trackEvent('quick_action_click', '/app/overview', { metadata: { feature: 'quotes', action: 'create_quote', sourcePage: '/app/overview' } })}
            >
              Create quote
            </Link>
            <Link
              href="/app/invoices"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              onClick={() => trackEvent('quick_action_click', '/app/overview', { metadata: { feature: 'invoices', action: 'view_invoices', sourcePage: '/app/overview' } })}
            >
              View invoices
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(203,178,107,0.16),rgba(20,30,42,0.78))] p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.3)]">
          <h2 className="text-lg font-semibold text-[#f2e3b3]">Team tip</h2>
          <p className="mt-2 text-sm text-white/70">
            Keep leads, jobs, and documents current so your conversion, invoice, and earnings metrics stay trustworthy.
          </p>
        </article>
      </section>
    </div>
  );
}
