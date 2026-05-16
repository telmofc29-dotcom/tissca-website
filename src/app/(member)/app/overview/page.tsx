// src/app/(member)/app/overview/page.tsx v2.0
//
// PURPOSE:
// - Member app overview UI with real workspace metrics.
//
// CHANGES (v2.0):
// - SYNC: Wire KPIs to real workspace data via /api/workspace/stats.
// - Keep light SaaS styling + floating card feel.
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v1.1 (2026-03-01): Light theme + improved readability.
// - v2.0 (2026-03-25): Wire metrics to real /api/workspace/stats data.

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
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
  const [stats, setStats] = useState<WorkspaceStats>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const res = await fetch('/api/workspace/stats', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (res.ok) {
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
        }
      } catch (e) {
        console.warn('[AppOverviewPage] Failed to load workspace stats:', e);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

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

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]"
          >
            <p className="text-sm font-medium text-slate-600">{kpi.label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{kpi.value}</p>
            <p className="mt-1 text-xs text-slate-500">{kpi.note}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.24)]">
          <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
          <p className="mt-1 text-sm text-slate-600">Jump straight into the key areas of your workspace.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/app/leads"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-gray-50"
              onClick={() => trackEvent('quick_action_click', '/app/overview', { metadata: { feature: 'leads', action: 'open_leads', sourcePage: '/app/overview' } })}
            >
              Open leads
            </Link>
            <Link
              href="/app/quotes"
              className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100/50"
              onClick={() => trackEvent('quick_action_click', '/app/overview', { metadata: { feature: 'quotes', action: 'create_quote', sourcePage: '/app/overview' } })}
            >
              Create quote
            </Link>
            <Link
              href="/app/invoices"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-gray-50"
              onClick={() => trackEvent('quick_action_click', '/app/overview', { metadata: { feature: 'invoices', action: 'view_invoices', sourcePage: '/app/overview' } })}
            >
              View invoices
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.18)]">
          <h2 className="text-lg font-semibold text-amber-800">Team tip</h2>
          <p className="mt-2 text-sm text-amber-800/80">
            Keep your leads and jobs updated daily so your conversion and revenue metrics stay meaningful.
          </p>
        </article>
      </section>
    </div>
  );
}
