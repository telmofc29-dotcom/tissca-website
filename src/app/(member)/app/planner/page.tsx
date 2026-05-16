// src/app/(member)/app/planner/page.tsx v3.0
//
// PURPOSE:
// Planner = intelligence hub / attention layer / workspace brain.
// NOT the room geometry builder (that is Scan to Layout under Tools).
//
// PRODUCT ALIGNMENT:
// Mirrors the mobile app's Planner screen — a feed of notable activity,
// needs-attention counters, tasks/notes, quick-add, workspace alerts.
//
// SECTIONS:
// - Status summary (needs attention, stale, overdue counters)
// - Quick add input
// - Notable changes / recent activity feed
// - Tasks section
// - Notes section (from lead/job notes)
// - Workspace alerts

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/i18n';
import { trackEvent } from '@/utils/analytics';
import { formatCurrency as _fmtCur } from '@/lib/currency';

// ─── Types ───────────────────────────────────────────────────────────────────

type Lead = { id: string; name: string | null; status: string; follow_up_date: string | null; value_estimate: number | null; created_at: string; updated_at: string; notes: string | null };
type Job = { id: string; title: string | null; status: string; scheduled_date: string | null; due_date: string | null; value: number | null; created_at: string; updated_at: string; notes: string | null };
type Task = { id: string; title: string | null; status: string; priority: string | null; due_date: string | null; created_at: string };
type HistoryEntry = { id: string; entity_type: string | null; entity_id: string | null; action: string | null; details: Record<string, unknown> | null; created_at: string; performed_by: string | null };

type AttentionCounters = {
  leadsNeedingContact: number;
  staleLeads: number;
  overdueJobs: number;
  jobsNotStarted: number;
  overdueTasks: number;
  recentChanges: number;
};

type FeedTab = 'activity' | 'tasks' | 'notes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isStale(dateStr: string, daysThreshold: number = 7): boolean {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 86400000;
  return diff > daysThreshold;
}

function fmtCurrency(v: number | null): string {
  if (v == null) return '—';
  return _fmtCur(v);
}

function actionIcon(action: string | null): string {
  if (!action) return '📋';
  const a = action.toLowerCase();
  if (a.includes('creat')) return '✨';
  if (a.includes('updat') || a.includes('edit')) return '✏️';
  if (a.includes('delet')) return '🗑️';
  if (a.includes('status')) return '🔄';
  if (a.includes('complet')) return '✅';
  return '📋';
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function PlannerIntelPage() {
  const router = useRouter();
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const { t } = useLanguage();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedTab, setFeedTab] = useState<FeedTab>('activity');
  const [quickNote, setQuickNote] = useState('');

  // ─── Data fetching ────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);

    const headers = { Authorization: `Bearer ${accessToken}` };
    const opts = { headers, cache: 'no-store' as RequestCache };

    try {
      const [leadsRes, jobsRes, tasksRes, historyRes] = await Promise.all([
        fetch('/api/workspace/leads', opts),
        fetch('/api/workspace/jobs', opts),
        fetch('/api/workspace/tasks', opts),
        fetch('/api/workspace/history', opts),
      ]);

      const [leadsData, jobsData, tasksData, historyData] = await Promise.all([
        leadsRes.ok ? leadsRes.json() : { leads: [] },
        jobsRes.ok ? jobsRes.json() : { jobs: [] },
        tasksRes.ok ? tasksRes.json() : { tasks: [] },
        historyRes.ok ? historyRes.json() : { history: [] },
      ]);

      setLeads(leadsData.leads ?? []);
      setJobs(jobsData.jobs ?? []);
      setTasks(tasksData.tasks ?? []);
      setHistory((historyData.history ?? []).slice(0, 20));
    } catch {
      // Non-critical — show what we can
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;
    fetchAll();
    trackEvent('feature_view', '/app/planner', {
      eventLabel: 'planner_intel',
      metadata: { feature: 'planner', action: 'view' },
    });
  }, [accessToken, ctxLoading, fetchAll]);

  // ─── Compute attention counters ───────────────────────────────────────

  const now = new Date();
  const counters: AttentionCounters = {
    leadsNeedingContact: leads.filter((l) => l.status === 'new' && isStale(l.created_at, 2)).length,
    staleLeads: leads.filter((l) => ['new', 'contacted'].includes(l.status) && isStale(l.updated_at, 7)).length,
    overdueJobs: jobs.filter((j) => j.status !== 'completed' && isOverdue(j.due_date)).length,
    jobsNotStarted: jobs.filter((j) => j.status === 'new' || j.status === 'pending').length,
    overdueTasks: tasks.filter((t) => t.status !== 'completed' && isOverdue(t.due_date)).length,
    recentChanges: history.filter((h) => {
      const diff = (now.getTime() - new Date(h.created_at).getTime()) / 86400000;
      return diff <= 1;
    }).length,
  };

  const totalAttention = counters.leadsNeedingContact + counters.staleLeads + counters.overdueJobs + counters.overdueTasks;

  // ─── Derived data ─────────────────────────────────────────────────────

  const pendingTasks = tasks.filter((t) => t.status !== 'completed').sort((a, b) => {
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Notes from leads and jobs with notes content
  const allNotes = [
    ...leads.filter((l) => l.notes?.trim()).map((l) => ({
      id: l.id,
      type: 'lead' as const,
      title: l.name || 'Untitled Lead',
      text: l.notes!,
      date: l.updated_at,
      href: '/app/leads',
    })),
    ...jobs.filter((j) => j.notes?.trim()).map((j) => ({
      id: j.id,
      type: 'job' as const,
      title: j.title || 'Untitled Job',
      text: j.notes!,
      date: j.updated_at,
      href: '/app/jobs',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);

  // ─── Quick add handler ────────────────────────────────────────────────

  const handleQuickAdd = useCallback(async () => {
    if (!quickNote.trim() || !accessToken) return;

    try {
      await fetch('/api/workspace/leads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: quickNote.trim(),
          status: 'new',
          source: 'Planner Quick Add',
        }),
      });

      setQuickNote('');
      fetchAll(); // Refresh data

      trackEvent('quick_action_click', '/app/planner', {
        eventLabel: 'planner_quick_add',
        metadata: { type: 'lead' },
      });
    } catch {
      // Silently fail — user can retry
    }
  }, [quickNote, accessToken, fetchAll]);

  // ─── Loading ──────────────────────────────────────────────────────────

  const isLoading = ctxLoading || loading;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="mt-2 text-sm text-slate-500">Loading planner...</p>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header with status */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {(t.member.nav as Record<string, string>).planner || 'Planner'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Your workspace brain — activity, alerts, and follow-ups in one place.
            </p>
          </div>
          {totalAttention > 0 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
              {totalAttention}
            </span>
          )}
        </div>
      </div>

      {/* Attention counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Need contact', value: counters.leadsNeedingContact, color: 'red', href: '/app/leads' },
          { label: 'Stale leads', value: counters.staleLeads, color: 'amber', href: '/app/leads' },
          { label: 'Overdue jobs', value: counters.overdueJobs, color: 'red', href: '/app/jobs' },
          { label: 'Not started', value: counters.jobsNotStarted, color: 'blue', href: '/app/jobs' },
          { label: 'Overdue tasks', value: counters.overdueTasks, color: 'red', href: '/app/tasks' },
          { label: 'Today\'s changes', value: counters.recentChanges, color: 'emerald', href: '#' },
        ].map((c) => {
          const colorMap: Record<string, string> = {
            red: c.value > 0 ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50',
            amber: c.value > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50',
            blue: c.value > 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50',
            emerald: c.value > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-gray-50',
          };
          const textMap: Record<string, string> = {
            red: c.value > 0 ? 'text-red-700' : 'text-slate-400',
            amber: c.value > 0 ? 'text-amber-700' : 'text-slate-400',
            blue: c.value > 0 ? 'text-blue-700' : 'text-slate-400',
            emerald: c.value > 0 ? 'text-emerald-700' : 'text-slate-400',
          };

          return (
            <button
              key={c.label}
              onClick={() => c.href !== '#' && router.push(c.href)}
              className={`rounded-xl border p-3 text-left transition-colors hover:shadow-sm ${colorMap[c.color]} ${
                c.href !== '#' ? 'cursor-pointer' : ''
              }`}
            >
              <p className={`text-xl font-bold ${textMap[c.color]}`}>{c.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{c.label}</p>
            </button>
          );
        })}
      </div>

      {/* Quick add */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
        <div className="flex gap-2">
          <input
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd(); }}
            placeholder="Quick add a lead or note..."
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
          />
          <button
            onClick={handleQuickAdd}
            disabled={!quickNote.trim()}
            className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Main feed area (2 cols) */}
        <section className="xl:col-span-2 space-y-4">
          {/* Feed tabs */}
          <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
            {([
              { key: 'activity' as FeedTab, label: 'Activity', count: history.length },
              { key: 'tasks' as FeedTab, label: 'Tasks', count: pendingTasks.length },
              { key: 'notes' as FeedTab, label: 'Notes', count: allNotes.length },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFeedTab(tab.key)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  feedTab === tab.key
                    ? 'border-b-2 border-amber-500 text-amber-700 bg-amber-50/50'
                    : 'text-slate-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-100 px-1.5 text-[10px] font-bold text-slate-600">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Activity feed */}
          {feedTab === 'activity' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
              {history.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-500">No recent activity in your workspace.</p>
                  <p className="mt-1 text-xs text-slate-400">Activity will appear here as you create and update leads, jobs, and tasks.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <span className="mt-0.5 text-base">{actionIcon(entry.action)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-900">
                          <span className="font-medium capitalize">{entry.entity_type}</span>
                          {' '}
                          <span className="text-slate-500">{entry.action}</span>
                          {entry.details && (entry.details as Record<string, unknown>).name ? (
                            <span className="text-slate-700"> — {String((entry.details as Record<string, unknown>).name)}</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatRelativeDate(entry.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tasks feed */}
          {feedTab === 'tasks' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
              {pendingTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-500">No pending tasks.</p>
                  <p className="mt-1 text-xs text-slate-400">Tasks from your projects will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pendingTasks.slice(0, 15).map((task) => {
                    const overdue = isOverdue(task.due_date);
                    return (
                      <div
                        key={task.id}
                        onClick={() => router.push('/app/tasks')}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          overdue ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-amber-500' :
                          task.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-900 truncate">{task.title || 'Untitled Task'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs ${
                              task.status === 'in_progress' ? 'text-blue-600' : 'text-slate-400'
                            }`}>
                              {task.status === 'in_progress' ? 'In progress' : 'Pending'}
                            </span>
                            {task.due_date && (
                              <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                                {overdue ? 'Overdue' : `Due ${new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notes feed */}
          {feedTab === 'notes' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
              {allNotes.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-500">No notes found.</p>
                  <p className="mt-1 text-xs text-slate-400">Notes from leads and jobs will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {allNotes.map((note) => (
                    <div
                      key={`${note.type}-${note.id}`}
                      onClick={() => router.push(note.href)}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 uppercase">
                          {note.type}
                        </span>
                        <span className="text-sm font-medium text-slate-900 truncate">{note.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{note.text}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatRelativeDate(note.date)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right sidebar */}
        <aside className="space-y-4">
          {/* TISSCA Alerts */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
            <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
              <span>⚡</span> Workspace Alerts
            </h3>
            <div className="mt-3 space-y-2">
              {totalAttention === 0 ? (
                <p className="text-sm text-amber-800/80">All clear — nothing needs your attention right now.</p>
              ) : (
                <>
                  {counters.leadsNeedingContact > 0 && (
                    <button
                      onClick={() => router.push('/app/leads')}
                      className="w-full flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 text-left hover:bg-white/80 transition-colors"
                    >
                      <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                      <span className="text-xs text-amber-900"><strong>{counters.leadsNeedingContact}</strong> leads need contact</span>
                    </button>
                  )}
                  {counters.staleLeads > 0 && (
                    <button
                      onClick={() => router.push('/app/leads')}
                      className="w-full flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 text-left hover:bg-white/80 transition-colors"
                    >
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-xs text-amber-900"><strong>{counters.staleLeads}</strong> leads going stale</span>
                    </button>
                  )}
                  {counters.overdueJobs > 0 && (
                    <button
                      onClick={() => router.push('/app/jobs')}
                      className="w-full flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 text-left hover:bg-white/80 transition-colors"
                    >
                      <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                      <span className="text-xs text-amber-900"><strong>{counters.overdueJobs}</strong> overdue jobs</span>
                    </button>
                  )}
                  {counters.overdueTasks > 0 && (
                    <button
                      onClick={() => router.push('/app/tasks')}
                      className="w-full flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 text-left hover:bg-white/80 transition-colors"
                    >
                      <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                      <span className="text-xs text-amber-900"><strong>{counters.overdueTasks}</strong> overdue tasks</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h3>
            <div className="space-y-1.5">
              {[
                { icon: '📝', label: 'New Estimate', href: '/app/tools/general' },
                { icon: '👤', label: 'New Lead', href: '/app/leads' },
                { icon: '🔧', label: 'View Jobs', href: '/app/jobs' },
                { icon: '🛠️', label: 'Open Tools', href: '/app/tools' },
                { icon: '📅', label: 'Calendar', href: '/app/calendar' },
              ].map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base">{link.icon}</span>
                  <span className="text-sm text-slate-700">{link.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Workspace summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Workspace Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Total leads</span>
                <span className="font-medium text-slate-900">{leads.length}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Active jobs</span>
                <span className="font-medium text-slate-900">{jobs.filter((j) => j.status !== 'completed').length}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Open tasks</span>
                <span className="font-medium text-slate-900">{pendingTasks.length}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pipeline value</span>
                <span className="font-medium text-slate-900">
                  {fmtCurrency(leads.reduce((s, l) => s + (l.value_estimate ?? 0), 0) + jobs.reduce((s, j) => s + (j.value ?? 0), 0))}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
