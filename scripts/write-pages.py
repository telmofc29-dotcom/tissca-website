#!/usr/bin/env python3
"""Write all wired member app pages to replace placeholders."""

import os
import sys

BASE = "src/app/(member)/app"

def write_file(rel_path, content):
    full_path = os.path.join(BASE, rel_path)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  Written: {full_path} ({len(content)} bytes)")

# ─── LEADS ───────────────────────────────────────────────────────────────────

LEADS = r"""// src/app/(member)/app/leads/page.tsx v2.0
//
// PURPOSE:
// - Display real leads from public.leads via /api/workspace/leads.
// - Scoped by workspace business_id (resolved server-side).
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v1.1 (2026-03-01): Light theme + improved layout/UX.
// - v2.0 (2026-03-27): Wire to real /api/workspace/leads data.

'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type Lead = {
  id: string;
  name: string | null;
  status: string;
  source: string | null;
  value_estimate: number | null;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const leadColumns = ['Lead', 'Status', 'Value', 'Updated'];

function statusPillClasses(status: string) {
  const raw = String(status || '').toLowerCase().trim();
  if (raw === 'new') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (raw.includes('contact')) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (raw.includes('quote')) return 'border-purple-200 bg-purple-50 text-purple-700';
  if (raw.includes('won')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (raw.includes('lost') || raw.includes('declined')) return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-gray-200 bg-gray-50 text-slate-700';
}

function formatCurrency(value: number | null) {
  if (value == null) return '\u2014';
  return `\u00A3${value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '\u2014';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function AppLeadsPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;

    setLoading(true);
    fetch('/api/workspace/leads', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load leads');
        return res.json();
      })
      .then((data) => {
        setLeads(data.leads ?? []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, ctxLoading]);

  const isLoading = ctxLoading || loading;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Lead pipeline</h2>
          <p className="mt-1 text-sm text-slate-600">
            Track prospects from new enquiries through to won jobs.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-slate-600">
              {leadColumns.map((column) => (
                <th key={column} className="px-4 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Loading leads&hellip;
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr className="border-b border-gray-200 last:border-b-0">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">No leads yet</p>
                  <p className="mt-0.5 text-xs text-slate-500">Leads synced from the Android app will appear here.</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold border-gray-200 bg-gray-50 text-slate-700">&mdash;</span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">&mdash;</td>
                <td className="px-4 py-3 text-slate-700">&mdash;</td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-200 last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{lead.name || 'Untitled lead'}</p>
                    {lead.source && (
                      <p className="mt-0.5 text-xs text-slate-500">Source: {lead.source}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClasses(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(lead.value_estimate)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(lead.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && leads.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Showing {leads.length} lead{leads.length !== 1 ? 's' : ''} synced from Android.
        </p>
      )}
    </div>
  );
}
"""

# ─── JOBS ─────────────────────────────────────────────────────────────────────

JOBS = r"""// src/app/(member)/app/jobs/page.tsx v2.0
//
// PURPOSE:
// - Display real jobs from public.jobs via /api/workspace/jobs.
// - Shows tool attachments (calculator results) linked to each job.
// - Scoped by workspace business_id (resolved server-side).
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v1.1 (2026-03-01): Light theme + improved layout/UX.
// - v2.0 (2026-03-27): Wire to real /api/workspace/jobs + tool-attachments data.

'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type Job = {
  id: string;
  title: string | null;
  lead_id: string | null;
  status: string;
  scheduled_date: string | null;
  due_date: string | null;
  value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ToolAttachment = {
  id: string;
  lead_id: string | null;
  job_id: string | null;
  tool_type: string | null;
  tool_name: string | null;
  result_data: Record<string, unknown> | null;
  created_at: string;
};

function statusBadgeClasses(status: string) {
  const raw = String(status || '').toLowerCase().trim();
  if (raw.includes('active') || raw === 'in_progress') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (raw.includes('scheduled')) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (raw.includes('complete')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-gray-200 bg-gray-50 text-slate-700';
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '\u2014';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: number | null) {
  if (value == null) return '\u2014';
  return `\u00A3${value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function AppJobsPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [toolAttachments, setToolAttachments] = useState<ToolAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;

    setLoading(true);
    const headers = { Authorization: `Bearer ${accessToken}` };

    Promise.all([
      fetch('/api/workspace/jobs', { headers, cache: 'no-store' }).then((r) => r.ok ? r.json() : { jobs: [] }),
      fetch('/api/workspace/tool-attachments', { headers, cache: 'no-store' }).then((r) => r.ok ? r.json() : { toolAttachments: [] }),
    ])
      .then(([jobsData, taData]) => {
        setJobs(jobsData.jobs ?? []);
        setToolAttachments(taData.toolAttachments ?? []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, ctxLoading]);

  const isLoading = ctxLoading || loading;

  function attachmentsForJob(jobId: string) {
    return toolAttachments.filter((ta) => ta.job_id === jobId);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <section className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Current jobs</h2>
            <p className="mt-1 text-sm text-slate-600">
              Jobs synced from the Android app appear here.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-slate-400">
              Loading jobs&hellip;
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-slate-600">
              No jobs yet. Jobs synced from the Android app will appear here.
            </div>
          ) : (
            jobs.map((job) => {
              const jobTAs = attachmentsForJob(job.id);
              return (
                <article
                  key={job.id}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{job.title || 'Untitled job'}</p>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(job.status)}`}
                        >
                          {job.status}
                        </span>
                      </div>
                      {job.notes && (
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{job.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(job.value)}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(job.scheduled_date)}</p>
                    </div>
                  </div>

                  {jobTAs.length > 0 && (
                    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2">
                      <p className="text-xs font-semibold text-indigo-700">
                        Calculator attachments ({jobTAs.length})
                      </p>
                      <div className="mt-1 space-y-1">
                        {jobTAs.map((ta) => (
                          <p key={ta.id} className="text-xs text-indigo-600">
                            {ta.tool_name || ta.tool_type || 'Calculator result'}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        {!isLoading && jobs.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Showing {jobs.length} job{jobs.length !== 1 ? 's' : ''} synced from Android.
            {toolAttachments.length > 0 && ` ${toolAttachments.length} calculator attachment${toolAttachments.length !== 1 ? 's' : ''}.`}
          </p>
        )}
      </section>

      <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.22)]">
        <h3 className="text-base font-semibold text-amber-900">Planning</h3>
        <p className="mt-2 text-sm text-amber-900/80">
          Add milestones and due dates for each job so your diary and invoicing stay in sync.
        </p>
        <div className="mt-4 space-y-2">
          <div className="rounded-2xl border border-amber-200/60 bg-white px-4 py-3 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.18)]">
            <p className="text-sm font-semibold text-amber-900">Milestones</p>
            <p className="mt-1 text-xs text-amber-900/70">Plan phases like prep, install, and snagging.</p>
          </div>
          <div className="rounded-2xl border border-amber-200/60 bg-white px-4 py-3 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.18)]">
            <p className="text-sm font-semibold text-amber-900">Payment due dates</p>
            <p className="mt-1 text-xs text-amber-900/70">Keep cashflow predictable with reminders.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
"""

# ─── TASKS ────────────────────────────────────────────────────────────────────

TASKS = r"""// src/app/(member)/app/tasks/page.tsx v2.0
//
// PURPOSE:
// - Display real tasks from public.tasks via /api/workspace/tasks.
// - Scoped by workspace business_id (resolved server-side).
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v1.1 (2026-03-01): Light theme + improved readability.
// - v2.0 (2026-03-27): Wire to real /api/workspace/tasks data.

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type Task = {
  id: string;
  title: string | null;
  description: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  assigned_to: string | null;
  job_id: string | null;
  created_at: string;
  updated_at: string;
};

function priorityClasses(priority: string | null) {
  const raw = String(priority || '').toLowerCase().trim();
  if (raw === 'high' || raw === 'urgent') return 'border-red-200 bg-red-50 text-red-700';
  if (raw === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-gray-200 bg-gray-50 text-slate-700';
}

function statusClasses(status: string) {
  const raw = String(status || '').toLowerCase().trim();
  if (raw === 'completed' || raw === 'done') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (raw === 'in_progress' || raw === 'in progress') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-gray-200 bg-gray-50 text-slate-700';
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

export default function AppTasksPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;

    setLoading(true);
    fetch('/api/workspace/tasks', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load tasks');
        return res.json();
      })
      .then((data) => {
        setTasks(data.tasks ?? []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, ctxLoading]);

  const isLoading = ctxLoading || loading;

  const counts = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed' || t.status === 'done').length;
    return { pending, inProgress, completed };
  }, [tasks]);

  const taskGroups = [
    { title: 'Pending', count: counts.pending },
    { title: 'In progress', count: counts.inProgress },
    { title: 'Completed', count: counts.completed },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        {taskGroups.map((group) => (
          <article
            key={group.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.22)]"
          >
            <p className="text-sm text-slate-600">{group.title}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {isLoading ? '\u2014' : group.count}
            </p>
          </article>
        ))}
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.22)]">
        <h2 className="text-lg font-semibold text-slate-900">Task board</h2>

        {isLoading ? (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-slate-400">
            Loading tasks&hellip;
          </div>
        ) : tasks.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-slate-600">
            No tasks yet. Tasks synced from the Android app will appear here.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {tasks.map((task) => (
              <article
                key={task.id}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{task.title || 'Untitled task'}</p>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(task.status)}`}>
                        {task.status}
                      </span>
                      {task.priority && (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityClasses(task.priority)}`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="mt-1 text-sm text-slate-600 line-clamp-2">{task.description}</p>
                    )}
                  </div>
                  {task.due_date && (
                    <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Due {formatDate(task.due_date)}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {!isLoading && tasks.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Showing {tasks.length} task{tasks.length !== 1 ? 's' : ''} synced from Android.
          </p>
        )}
      </section>
    </div>
  );
}
"""

# ─── QUOTES ───────────────────────────────────────────────────────────────────

QUOTES = r"""// src/app/(member)/app/quotes/page.tsx v2.0
//
// PURPOSE:
// - Display quote documents from public.documents via /api/workspace/documents.
// - Android-created quotes are synced to public.documents (type = 'quote'),
//   NOT to public.quotes (which is the website-native quote table).
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v1.1 (2026-03-01): Light theme + improved readability.
// - v2.0 (2026-03-27): Wire to real /api/workspace/documents data.

'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type Document = {
  id: string;
  type: string | null;
  title: string | null;
  reference_id: string | null;
  file_url: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

function statusBadgeClasses(status: string | null) {
  const raw = String(status || '').toLowerCase().trim();
  if (raw === 'accepted' || raw === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (raw === 'sent') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (raw === 'rejected' || raw === 'declined') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-gray-200 bg-gray-50 text-slate-700';
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function AppQuotesPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;

    setLoading(true);
    fetch('/api/workspace/documents', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load documents');
        return res.json();
      })
      .then((data) => {
        const all = (data.documents ?? []) as Document[];
        const quotes = all.filter((d) => {
          const t = String(d.type || '').toLowerCase();
          return t.includes('quote') || t.includes('estimate');
        });
        setDocs(quotes);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, ctxLoading]);

  const isLoading = ctxLoading || loading;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Quote board</h2>
            <p className="mt-1 text-sm text-slate-600">
              Quotes generated from Android appear here as documents.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {isLoading ? (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-slate-400">
              Loading quotes&hellip;
            </div>
          ) : docs.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-slate-600">
              No quote documents yet. Quotes generated from the Android app will appear here.
            </div>
          ) : (
            docs.map((doc) => (
              <article
                key={doc.id}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-[0_16px_44px_-34px_rgba(0,0,0,0.22)]"
              >
                <p className="font-semibold text-slate-900">{doc.title || doc.reference_id || 'Untitled quote'}</p>
                <p className="mt-1 text-sm text-slate-600">{formatDate(doc.created_at)}</p>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(doc.status)}`}>
                    {doc.status || 'Draft'}
                  </span>
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      View PDF
                    </a>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        {!isLoading && docs.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Showing {docs.length} quote document{docs.length !== 1 ? 's' : ''} synced from Android.
          </p>
        )}
      </section>
    </div>
  );
}
"""

# ─── INVOICES ─────────────────────────────────────────────────────────────────

INVOICES = r"""// src/app/(member)/app/invoices/page.tsx v2.0
//
// PURPOSE:
// - Display invoice documents from public.documents via /api/workspace/documents.
// - Android-created invoices are synced to public.documents (type = 'invoice'),
//   NOT to public.invoices (which is the website-native invoice table).
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v1.1 (2026-03-01): Light theme + improved layout/UX.
// - v2.0 (2026-03-27): Wire to real /api/workspace/documents data.

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type Document = {
  id: string;
  type: string | null;
  title: string | null;
  reference_id: string | null;
  file_url: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

function statusBadgeClasses(status: string | null) {
  const raw = String(status || '').toLowerCase().trim();
  if (raw === 'paid') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (raw === 'overdue') return 'border-red-200 bg-red-50 text-red-700';
  if (raw === 'sent') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-gray-200 bg-gray-50 text-slate-700';
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function AppInvoicesPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;

    setLoading(true);
    fetch('/api/workspace/documents', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load documents');
        return res.json();
      })
      .then((data) => {
        const all = (data.documents ?? []) as Document[];
        const invoices = all.filter((d) => {
          const t = String(d.type || '').toLowerCase();
          return t.includes('invoice') || t.includes('receipt') || t.includes('payment');
        });
        setDocs(invoices);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, ctxLoading]);

  const isLoading = ctxLoading || loading;

  const counts = useMemo(() => {
    const total = docs.length;
    const paid = docs.filter((d) => String(d.status || '').toLowerCase() === 'paid').length;
    const sent = docs.filter((d) => String(d.status || '').toLowerCase() === 'sent').length;
    return { total, paid, sent };
  }, [docs]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Invoice tracker</h2>
            <p className="mt-1 text-sm text-slate-600">
              Invoice documents generated from Android appear here.
            </p>
          </div>
        </div>

        {/* Summary row */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
            <p className="text-sm text-slate-600">Total invoices</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {isLoading ? '\u2014' : counts.total}
            </p>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
            <p className="text-sm text-slate-600">Sent</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {isLoading ? '\u2014' : counts.sent}
            </p>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
            <p className="text-sm text-slate-600">Paid</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {isLoading ? '\u2014' : counts.paid}
            </p>
          </article>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-slate-400">
              Loading invoices&hellip;
            </div>
          ) : docs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-slate-600">
              No invoice documents yet. Invoices generated from the Android app will appear here.
            </div>
          ) : (
            docs.map((doc) => (
              <article
                key={doc.id}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{doc.title || doc.reference_id || 'Untitled invoice'}</p>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClasses(doc.status)}`}
                      >
                        {doc.status || 'Draft'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{formatDate(doc.created_at)}</p>
                  </div>
                  <div className="text-right">
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        View PDF
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {!isLoading && docs.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Showing {docs.length} invoice document{docs.length !== 1 ? 's' : ''} synced from Android.
          </p>
        )}
      </section>
    </div>
  );
}
"""

# ─── HISTORY ──────────────────────────────────────────────────────────────────

HISTORY = r"""// src/app/(member)/app/history/page.tsx v2.0
//
// PURPOSE:
// - Display real CRM history from public.crm_history via /api/workspace/history.
// - Scoped by workspace business_id (resolved server-side).
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v1.1 (2026-03-01): Light theme + improved layout/UX.
// - v2.0 (2026-03-27): Wire to real /api/workspace/history data.

'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type HistoryEntry = {
  id: string;
  entity_type: string | null;
  entity_id: string | null;
  action: string | null;
  details: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
};

function DotIcon() {
  return (
    <span className="relative flex h-6 w-6 items-center justify-center">
      <span className="absolute inline-flex h-6 w-6 rounded-full bg-slate-200/70" />
      <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-slate-700" />
    </span>
  );
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + `, ${time}`;
  } catch {
    return dateStr;
  }
}

function formatAction(entry: HistoryEntry) {
  const action = entry.action || 'Action';
  const entityType = entry.entity_type || '';
  return `${entityType ? entityType.charAt(0).toUpperCase() + entityType.slice(1) + ' ' : ''}${action}`;
}

function formatDetail(entry: HistoryEntry): string | null {
  if (entry.details && typeof entry.details === 'object') {
    const d = entry.details as Record<string, unknown>;
    if (d.description && typeof d.description === 'string') return d.description;
    if (d.name && typeof d.name === 'string') return d.name;
    if (d.title && typeof d.title === 'string') return d.title;
  }
  return entry.entity_id ? `ID: ${entry.entity_id.slice(0, 8)}\u2026` : null;
}

export default function AppHistoryPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;

    setLoading(true);
    fetch('/api/workspace/history', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load history');
        return res.json();
      })
      .then((data) => {
        setHistory(data.history ?? []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, ctxLoading]);

  const isLoading = ctxLoading || loading;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Activity history</h2>
          <p className="mt-1 text-sm text-slate-600">
            Recent actions across leads, jobs, quotes, invoices, and assets.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-slate-400">
            Loading history&hellip;
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-slate-600">
            No activity yet. CRM history synced from the Android app will appear here.
          </div>
        ) : (
          history.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <DotIcon />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{formatAction(entry)}</p>
                    {formatDetail(entry) && (
                      <p className="mt-1 text-sm text-slate-600">{formatDetail(entry)}</p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {formatTime(entry.created_at)}
                </span>
              </div>
            </article>
          ))
        )}
      </div>

      {!isLoading && history.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Showing {history.length} event{history.length !== 1 ? 's' : ''} (newest first).
        </p>
      )}
    </div>
  );
}
"""

# ─── ASSETS ───────────────────────────────────────────────────────────────────

ASSETS = r"""// src/app/(member)/app/assets/page.tsx v2.0
//
// PURPOSE:
// - Display real assets from public.assets via /api/workspace/assets.
// - Assets sync is still being finalised; show what is synced so far.
// - Scoped by workspace business_id (resolved server-side).
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI.
// - v1.1 (2026-03-01): Light theme + improved layout/UX.
// - v2.0 (2026-03-27): Wire to real /api/workspace/assets data.

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type Asset = {
  id: string;
  name: string | null;
  type: string | null;
  file_url: string | null;
  file_size: number | null;
  job_id: string | null;
  uploaded_by: string | null;
  created_at: string;
};

function formatBytes(bytes: number | null) {
  if (bytes == null || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export default function AppAssetsPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;

    setLoading(true);
    fetch('/api/workspace/assets', {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load assets');
        return res.json();
      })
      .then((data) => {
        setAssets(data.assets ?? []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken, ctxLoading]);

  const isLoading = ctxLoading || loading;

  const totalSize = useMemo(() => {
    return assets.reduce((sum, a) => sum + (a.file_size || 0), 0);
  }, [assets]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Asset library</h2>
            <p className="mt-1 text-sm text-slate-600">
              Site photos, documents, and certificates synced from Android.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-slate-400">
              Loading assets&hellip;
            </div>
          ) : assets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-slate-600">
              No assets yet. Files synced from the Android app will appear here.
            </div>
          ) : (
            assets.map((asset) => (
              <article
                key={asset.id}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-slate-700">
                      <FileIcon />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{asset.name || 'Unnamed file'}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {asset.type || 'File'} &middot; {formatBytes(asset.file_size)} &middot; {formatDate(asset.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {!isLoading && assets.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Showing {assets.length} asset{assets.length !== 1 ? 's' : ''} synced from Android.
          </p>
        )}
      </section>

      <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <h3 className="text-base font-semibold text-slate-900">Storage</h3>
        <p className="mt-2 text-sm text-slate-600">
          Used: <span className="font-semibold text-slate-900">{isLoading ? '\u2014' : formatBytes(totalSize)}</span>
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Files: <span className="font-semibold text-slate-900">{isLoading ? '\u2014' : assets.length}</span>
        </p>

        <div className="mt-5 rounded-2xl border border-amber-200/60 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Note</p>
          <p className="mt-1 text-sm text-slate-700">
            Asset sync from Android is still being finalised. Some files may not appear yet.
          </p>
        </div>
      </aside>
    </div>
  );
}
"""

# ── Write all files ───────────────────────────────────────────────────────────

pages = {
    "leads/page.tsx": LEADS,
    "jobs/page.tsx": JOBS,
    "tasks/page.tsx": TASKS,
    "quotes/page.tsx": QUOTES,
    "invoices/page.tsx": INVOICES,
    "history/page.tsx": HISTORY,
    "assets/page.tsx": ASSETS,
}

for rel, content in pages.items():
    write_file(rel, content)

print("\nAll 7 pages written successfully.")
