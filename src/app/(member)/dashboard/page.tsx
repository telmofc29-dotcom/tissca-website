// src/app/(member)/dashboard/page.tsx v2.0
//
// PURPOSE:
// - Member dashboard UI (web) styled to match the TISSCA mobile app (espresso + warm glow + glass).
// - Route: /dashboard
//
// CHANGES (v2.0):
// - SYNC: Dashboard metrics now fetch from /api/workspace/stats (real Prisma data).
// - SYNC: KPIs reflect actual leads, jobs, quotes, invoices data.
// - SYNC: Outstanding payments section shows real invoice count.
// - SYNC: Quick actions show real open quotes/invoices counts.
// - Keep Support Mode banner proof-based via /api/user/me.
// - Keep espresso + warm glow + glass styling unchanged.
//
// VERSION HISTORY:
// - v1.1: Add History preview + TissChat preview + clickable outstanding payments -> invoices list
// - v1.2 (2026-03-02): Option A routing + link hygiene for /app/*
// - v2.0 (2026-03-25): Wire dashboard metrics to real workspace data via /api/workspace/stats

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/i18n';
import { trackEvent } from '@/utils/analytics';
import { formatCurrency as _fmtCur } from '@/lib/currency';

type SupportModeState = {
  active: boolean;
  workspaceId: string | null;
};

type WorkspaceStats = {
  leads: { total: number; new: number; quoted: number; won: number; lost: number };
  jobs: { total: number; active: number; completed: number };
  tasks: { total: number; pending: number; in_progress: number; completed: number };
  quotes: { total: number; open: number; total_value: number };
  invoices: { total: number; outstanding: number; outstanding_value: number; paid: number; draft: number };
  earnings: { yearGross: number; monthGross: number; monthNet: number; materials: number };
  conversion: number;
  documents: { invoicesGenerated: number; quotesGenerated: number };
};

type HistoryRow = {
  id: string;
  entity_type: string | null;
  action: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const emptyStats: WorkspaceStats = {
  leads: { total: 0, new: 0, quoted: 0, won: 0, lost: 0 },
  jobs: { total: 0, active: 0, completed: 0 },
  tasks: { total: 0, pending: 0, in_progress: 0, completed: 0 },
  quotes: { total: 0, open: 0, total_value: 0 },
  invoices: { total: 0, outstanding: 0, outstanding_value: 0, paid: 0, draft: 0 },
  earnings: { yearGross: 0, monthGross: 0, monthNet: 0, materials: 0 },
  conversion: 0,
  documents: { invoicesGenerated: 0, quotesGenerated: 0 },
};

export default function MemberDashboardPage() {
  const { supportMode: ctxSupportMode, accessToken, isLoading: ctxLoading } = useWorkspace();
  console.log('[Dashboard] mount — ctxLoading:', ctxLoading);
  const { t } = useLanguage();
  const m = t.member;

  const [supportMode, setSupportMode] = useState<SupportModeState>({
    active: false,
    workspaceId: null,
  });

  const [exiting, setExiting] = useState(false);
  const [stats, setStats] = useState<WorkspaceStats>(emptyStats);
  const [, setStatsLoading] = useState(true);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);

  // Derive support mode from WorkspaceContext (eliminates redundant /api/user/me call)
  useEffect(() => {
    setSupportMode({
      active: ctxSupportMode.active,
      workspaceId: ctxSupportMode.workspace_id,
    });
  }, [ctxSupportMode]);

  // ✅ Fetch real workspace stats
  useEffect(() => {
    if (ctxLoading || !accessToken) return;

    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const res = await fetch('/api/workspace/stats', {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });

        if (!res.ok) return;

        const json = await res.json();
        setStats(json as WorkspaceStats);
      } catch (e) {
        console.warn('[MemberDashboardPage] Failed to load workspace stats:', e);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
    // Also fetch recent history for the dashboard preview
    const loadHistory = async () => {
      try {
        const res = await fetch('/api/workspace/history', {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = await res.json();
        setHistoryRows((json.history ?? []).slice(0, 5));
      } catch {
        // silent — history preview is non-critical
      }
    };
    loadHistory();
  }, [accessToken, ctxLoading]);

  const exitSupportMode = async () => {
    try {
      setExiting(true);

      await fetch('/api/admin/support/clear-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      // After clearing, update local state (fail closed)
      setSupportMode({ active: false, workspaceId: null });

      // Light refresh so server-rendered areas update
      window.location.reload();
    } catch (e) {
      console.error('[MemberDashboardPage] Failed to exit support mode:', e);
    } finally {
      setExiting(false);
    }
  };

  // NOTE: Real workspace stats from /api/workspace/stats
  const fmtCurrency = (v: number) => v === 0 ? _fmtCur(0) : _fmtCur(v);
  const conversionRate = stats.conversion;

  const kpis = [
    { label: m.dashboard.outstanding, value: fmtCurrency(stats.invoices.outstanding_value), sub: `${stats.invoices.outstanding} invoice${stats.invoices.outstanding !== 1 ? 's' : ''}`, icon: '!' },
    { label: m.dashboard.conversion, value: `${conversionRate}%`, sub: `${stats.leads.won} won · ${stats.leads.lost} lost`, icon: '↗' },
    { label: 'Leads Won', value: String(stats.leads.won), sub: `${stats.leads.total} total leads`, icon: '✓' },
    { label: 'Jobs Completed', value: String(stats.jobs.completed), sub: `${stats.jobs.total} total jobs`, icon: '◉' },
  ];

  const docKpis = [
    { label: 'Invoices Generated', value: String(stats.documents.invoicesGenerated), icon: '⎙' },
    { label: 'Quotes Generated', value: String(stats.documents.quotesGenerated), icon: '⎘' },
  ];

  const historyChip = (entityType: string | null) => {
    const raw = String(entityType || '').toLowerCase();
    if (raw.includes('invoice') || raw.includes('pdf')) return 'text-amber-100/90 border-amber-200/20 bg-amber-200/10';
    if (raw.includes('lead')) return 'text-sky-100/90 border-sky-200/20 bg-sky-200/10';
    if (raw.includes('job')) return 'text-emerald-100/90 border-emerald-200/20 bg-emerald-200/10';
    if (raw.includes('quote')) return 'text-purple-100/90 border-purple-200/20 bg-purple-200/10';
    if (raw.includes('task')) return 'text-rose-100/90 border-rose-200/20 bg-rose-200/10';
    return 'text-slate-100/90 border-white/10 bg-white/5';
  };

  const fmtHistoryTime = (d: string) => {
    try {
      const date = new Date(d);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      if (diffDays === 0) return `Today \u2022 ${time}`;
      if (diffDays === 1) return `Yesterday \u2022 ${time}`;
      return `${date.toLocaleDateString('en-GB', { weekday: 'short' })} \u2022 ${time}`;
    } catch { return d; }
  };

  const fmtHistoryTitle = (row: HistoryRow) => {
    const action = row.action || 'action';
    const entity = row.entity_type || 'item';
    const detail = row.details && typeof row.details === 'object'
      ? (row.details as Record<string, string>).description || (row.details as Record<string, string>).name || (row.details as Record<string, string>).title || ''
      : '';
    return detail ? `${entity} ${action}: ${detail}` : `${entity} ${action}`;
  };

  return (
    <main className="min-h-screen px-4 py-10 text-slate-100 bg-slate-950">
      {/* Premium ambient background (espresso + warm glow) */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-black" />
        <div className="absolute -top-40 right-[-180px] h-[520px] w-[520px] rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute top-[30%] left-[-220px] h-[520px] w-[520px] rounded-full bg-orange-300/10 blur-3xl" />
        <div className="absolute bottom-[-260px] right-[10%] h-[520px] w-[520px] rounded-full bg-amber-200/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),rgba(0,0,0,0))]" />
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Support Mode Banner */}
        {supportMode.active && supportMode.workspaceId && (
          <div className="rounded-2xl border border-amber-200/20 bg-amber-200/10 backdrop-blur px-5 py-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-100">
                Support Mode – Viewing as Workspace: {supportMode.workspaceId}
              </p>
              <p className="mt-1 text-sm text-amber-100/80">
                You are not “becoming” the user. You are viewing the member experience for support/troubleshooting.
              </p>
            </div>
            <button
              onClick={exitSupportMode}
              disabled={exiting}
              className="shrink-0 rounded-full border border-amber-200/30 bg-amber-200/15 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-200/20 disabled:opacity-60"
            >
              {exiting ? 'Exiting…' : 'Exit Support Mode'}
            </button>
          </div>
        )}

        <header className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{m.dashboard.title}</h1>
          <p className="text-slate-200/70">{m.dashboard.subtitle}</p>
        </header>

        {/* Earnings Overview (document-driven) */}
        <section className="rounded-2xl border border-amber-200/20 bg-amber-200/10 backdrop-blur p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)]">
          <h2 className="text-lg font-semibold text-amber-100">Earnings Overview</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-amber-100/60">Year Gross</p>
              <p className="mt-1 text-xl font-semibold text-amber-100">{fmtCurrency(stats.earnings.yearGross)}</p>
            </div>
            <div>
              <p className="text-xs text-amber-100/60">Month Gross</p>
              <p className="mt-1 text-xl font-semibold text-amber-100">{fmtCurrency(stats.earnings.monthGross)}</p>
            </div>
            <div>
              <p className="text-xs text-amber-100/60">Month Net</p>
              <p className="mt-1 text-xl font-semibold text-amber-100">{fmtCurrency(stats.earnings.monthNet)}</p>
            </div>
            <div>
              <p className="text-xs text-amber-100/60">Materials</p>
              <p className="mt-1 text-xl font-semibold text-amber-100">{fmtCurrency(stats.earnings.materials)}</p>
            </div>
          </div>
        </section>

        {/* KPI grid (app-like) */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-200/70">{kpi.label}</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100/90">
                  <span className="text-sm font-semibold">{kpi.icon}</span>
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{kpi.value}</p>
              <p className="mt-1 text-xs text-slate-200/60">{kpi.sub}</p>
            </div>
          ))}
        </section>

        {/* Document counters */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {docKpis.map((dk) => (
            <div
              key={dk.label}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-200/70">{dk.label}</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-100/90">
                  <span className="text-sm font-semibold">{dk.icon}</span>
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{dk.value}</p>
            </div>
          ))}
        </section>

        {/* Quick actions (app-like) */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{m.dashboard.quickActions}</h2>

            <div className="hidden md:flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/70">
                Open Quotes: <span className="text-slate-100 font-semibold">{stats.quotes.open}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/70">
                Outstanding Invoices: <span className="text-slate-100 font-semibold">{stats.invoices.outstanding}</span>
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <Link
              href="/app/quotes"
              onClick={() => trackEvent('cta_click', '/dashboard', { eventLabel: 'create_quote', metadata: { ctaName: 'Create a quote', ctaSource: 'dashboard_quick_actions', sourcePage: '/dashboard' } })}
              className="flex items-center justify-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/10 px-5 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-200/15"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-amber-200/20 bg-amber-200/10 text-xs">
                ⎘
              </span>
              Create a quote
            </Link>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/app/leads"
                onClick={() => trackEvent('cta_click', '/dashboard', { eventLabel: 'add_lead', metadata: { ctaName: 'Add lead', ctaSource: 'dashboard_quick_actions', sourcePage: '/dashboard' } })}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100/90 hover:bg-white/10"
              >
                Add lead
              </Link>
              <Link
                href="/app/jobs"
                onClick={() => trackEvent('cta_click', '/dashboard', { eventLabel: 'add_job', metadata: { ctaName: 'Add job', ctaSource: 'dashboard_quick_actions', sourcePage: '/dashboard' } })}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100/90 hover:bg-white/10"
              >
                Add job
              </Link>
              <Link
                href="/app/invoices"
                onClick={() => trackEvent('cta_click', '/dashboard', { eventLabel: 'invoice', metadata: { ctaName: 'Invoice', ctaSource: 'dashboard_quick_actions', sourcePage: '/dashboard' } })}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100/90 hover:bg-white/10"
              >
                Invoice
              </Link>
              <Link
                href="/app/settings"
                onClick={() => trackEvent('cta_click', '/dashboard', { eventLabel: 'account', metadata: { ctaName: 'Account', ctaSource: 'dashboard_quick_actions', sourcePage: '/dashboard' } })}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100/90 hover:bg-white/10"
              >
                Account
              </Link>

              <div className="ml-auto flex gap-2">
                <Link
                  href="/app/quotes"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100/90 hover:bg-white/10"
                >
                  View quotes
                </Link>
                <Link
                  href="/app/invoices"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100/90 hover:bg-white/10"
                >
                  View invoices
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Grid: Outstanding payments + History + TissChat (app-like) */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Outstanding payments */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)] lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Outstanding payments</h2>
              <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200/70">
                {stats.invoices.outstanding}
              </span>
            </div>

            {stats.invoices.outstanding > 0 ? (
              <div className="mt-4 space-y-3">
                <Link
                  href="/app/invoices"
                  className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-100/95">
                        {stats.invoices.outstanding} outstanding invoice{stats.invoices.outstanding !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-slate-200/70">View and manage in Invoices</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-semibold">{fmtCurrency(stats.invoices.outstanding_value)}</p>
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center">
                <p className="font-medium text-slate-100/90">No outstanding invoices</p>
                <p className="mt-1 text-sm text-slate-200/60">Outstanding invoices will appear here once created.</p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-2 text-xs text-slate-200/60">
                <span>{stats.invoices.paid} paid</span>
                <span>•</span>
                <span>{stats.invoices.draft} draft</span>
                <span>•</span>
                <span>{stats.invoices.total} total</span>
              </div>
              <Link
                href="/app/invoices"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100/90 hover:bg-white/10"
              >
                View all
              </Link>
            </div>
          </div>

          {/* Right column: History + TissChat */}
          <div className="space-y-6">
            {/* History preview */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{m.dashboard.recentHistory}</h2>
                <Link
                  href="/app/history"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100/90 hover:bg-white/10"
                >
                  Show more
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {historyRows.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center">
                    <p className="text-sm text-slate-200/60">No recent activity yet.</p>
                  </div>
                ) : (
                  historyRows.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${historyChip(h.entity_type)}`}
                        >
                          {h.entity_type || 'event'}
                        </span>
                        <span className="text-xs text-slate-200/55">{fmtHistoryTime(h.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-slate-100/90">{fmtHistoryTitle(h)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TissChat preview */}
            <div className="rounded-2xl border border-amber-200/20 bg-amber-200/10 backdrop-blur p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.85)]">
              <h2 className="text-lg font-semibold text-amber-100">TissChat</h2>
              <p className="mt-1 text-sm text-amber-100/70">
                Share quotes, invoices, leads, jobs, and asset cards directly into chat.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/app/chat"
                  className="rounded-full border border-amber-200/30 bg-amber-200/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-200/15"
                >
                  Open chat
                </Link>
                <Link
                  href="/app/history"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100/90 hover:bg-white/10"
                >
                  See shared items
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}