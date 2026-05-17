// src/app/(member)/app/jobs/page.tsx v4.0
//
// PURPOSE:
// - Full CRUD jobs management — create, view, edit, status change, delete.
// - Real data from /api/workspace/jobs (Supabase-native, business_id scoped).
// - Shows tool attachments (calculator results) linked to each job.
// - Website is a first-class app — no "synced from Android" language.
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v2.0 (2026-03-27): Wire to real /api/workspace/jobs + tool-attachments data.
// - v3.0 (2026-03-30): Full CRUD — create panel, edit panel, status changes,
//                        filters, lead linking, proper empty states.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { formatCurrency as _fmtCur, currencySymbol as _curSym } from '@/lib/currency';
import { trackEvent } from '@/utils/analytics';

// ─── Types ───────────────────────────────────────────────────────────────────

type Job = {
  id: string;
  client_name: string | null; // Android primary name field
  title: string | null;       // legacy/website-created alias
  lead_id: string | null;
  client_id: string | null;
  status: string;
  scheduled_date: string | null;
  due_date: string | null;
  value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Phase G1 financial fields
  deposit_requested: number | null;
  deposit_paid: number | null;
  deposit_paid_at: string | null;
  vat_rate: number | null;
  discount_type: string | null;
  discount_value: number | null;
  header_notes: string | null;
  footer_notes: string | null;
};

type Lead = {
  id: string;
  client_name: string | null; // Android primary name field
  name: string | null;        // legacy/website-created alias
  status: string;
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

type JobFormData = {
  title: string;
  status: string;
  lead_id: string;
  scheduled_date: string;
  due_date: string;
  value: string;
  notes: string;
};

const EMPTY_FORM: JobFormData = {
  title: '',
  status: 'scheduled',
  lead_id: '',
  scheduled_date: '',
  due_date: '',
  value: '',
  notes: '',
};

// ─── Constants ───────────────────────────────────────────────────────────────

const JOB_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadgeClasses(status: string) {
  const raw = String(status || '').toLowerCase().trim();
  if (raw === 'in_progress') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (raw === 'scheduled') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (raw === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (raw === 'on_hold') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (raw === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-700';
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

function formatDateInput(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function formatCurrency(value: number | null) {
  if (value == null) return '\u2014';
  return _fmtCur(value);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppJobsPage() {
  const { accessToken, isLoading: ctxLoading } = useWorkspace();

  // Data state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [toolAttachments, setToolAttachments] = useState<ToolAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState<JobFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // ─── API helpers ─────────────────────────────────────────────────────────

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }),
    [accessToken],
  );

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const hdrs = authHeaders();
      const [jobsRes, leadsRes, taRes] = await Promise.all([
        fetch('/api/workspace/jobs', { headers: hdrs, cache: 'no-store' }),
        fetch('/api/workspace/leads', { headers: hdrs, cache: 'no-store' }),
        fetch('/api/workspace/tool-attachments', { headers: hdrs, cache: 'no-store' }),
      ]);
      const [jobsData, leadsData, taData] = await Promise.all([
        jobsRes.ok ? jobsRes.json() : { jobs: [] },
        leadsRes.ok ? leadsRes.json() : { leads: [] },
        taRes.ok ? taRes.json() : { toolAttachments: [] },
      ]);
      setJobs(jobsData.jobs ?? []);
      setLeads(leadsData.leads ?? []);
      setToolAttachments(taData.toolAttachments ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeaders]);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;
    fetchData();
    trackEvent('feature_view', '/app/jobs', { eventLabel: 'jobs_loaded', metadata: { feature: 'jobs', action: 'view', sourcePage: '/app/jobs' } });
  }, [accessToken, ctxLoading, fetchData]);

  // ─── Create ──────────────────────────────────────────────────────────────

  function openCreatePanel() {
    setFormData(EMPTY_FORM);
    setFormError(null);
    setEditingJob(null);
    setShowCreatePanel(true);
  }

  async function handleCreate() {
    if (!formData.title.trim()) {
      setFormError('Job title is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/workspace/jobs', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: formData.title.trim(),
          status: formData.status,
          lead_id: formData.lead_id || null,
          scheduled_date: formData.scheduled_date || null,
          due_date: formData.due_date || null,
          value: formData.value ? parseFloat(formData.value) : null,
          notes: formData.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create job');
      setShowCreatePanel(false);
      await fetchData();
      trackEvent('feature_view', '/app/jobs', { eventLabel: 'job_create', metadata: { action: 'create', status: formData.status } });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setSaving(false);
    }
  }

  // ─── Edit ────────────────────────────────────────────────────────────────

  function openEditPanel(job: Job) {
    setEditingJob(job);
    setFormData({
      title: job.client_name || job.title || '',
      status: job.status,
      lead_id: job.lead_id || '',
      scheduled_date: formatDateInput(job.scheduled_date),
      due_date: formatDateInput(job.due_date),
      value: job.value != null ? String(job.value) : '',
      notes: job.notes || '',
    });
    setFormError(null);
    setShowCreatePanel(false);
  }

  async function handleUpdate() {
    if (!editingJob) return;
    if (!formData.title.trim()) {
      setFormError('Job title is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/workspace/jobs', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          id: editingJob.id,
          title: formData.title.trim(),
          status: formData.status,
          lead_id: formData.lead_id || null,
          scheduled_date: formData.scheduled_date || null,
          due_date: formData.due_date || null,
          value: formData.value ? parseFloat(formData.value) : null,
          notes: formData.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update job');
      setEditingJob(null);
      await fetchData();
      trackEvent('feature_view', '/app/jobs', { eventLabel: 'job_update', metadata: { action: 'update', status: formData.status } });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update job');
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  async function handleDelete(job: Job) {
    if (!confirm(`Delete "${job.client_name || job.title || 'this job'}"? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/workspace/jobs', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ id: job.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete job');
      }
      if (editingJob?.id === job.id) setEditingJob(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
    }
  }

  // ─── Filter ──────────────────────────────────────────────────────────────

  // ─── Mark deposit paid ───────────────────────────────────────────────────

  async function handleMarkDepositPaid(job: Job) {
    if (!confirm(`Mark deposit of ${formatCurrency(job.deposit_requested)} as paid?`)) return;
    try {
      const res = await fetch(`/api/workspace/jobs/${job.id}/mark-deposit-paid`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark deposit paid');
      await fetchData();
      trackEvent('feature_view', '/app/jobs', { eventLabel: 'deposit_paid', metadata: { action: 'deposit_paid', jobId: job.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark deposit paid');
    }
  }

  const filteredJobs = statusFilter === 'all'
    ? jobs
    : jobs.filter((j) => j.status.toLowerCase() === statusFilter);

  const statusCounts = jobs.reduce<Record<string, number>>((acc, j) => {
    const s = j.status.toLowerCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const isLoading = ctxLoading || loading;

  function attachmentsForJob(jobId: string) {
    return toolAttachments.filter((ta) => ta.job_id === jobId);
  }

  function leadNameForId(leadId: string | null) {
    if (!leadId) return null;
    const lead = leads.find((l) => l.id === leadId);
    return lead?.client_name || lead?.name || null;
  }

  // Won leads that could be converted to jobs
  const wonLeads = leads.filter((l) => l.status.toLowerCase() === 'won' || l.status.toLowerCase() === 'quoted');

  // ─── Form fields (shared between create & edit) ──────────────────────────

  function renderForm(isEdit: boolean) {
    return (
      <div className="space-y-4">
        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Job title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Bathroom refit — 14 Oak Lane"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              {JOB_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Linked lead</label>
            <select
              value={formData.lead_id}
              onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">No linked lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.client_name || l.name || 'Unnamed lead'}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start date</label>
            <input
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Job value ({_curSym(null)})</label>
          <input
            type="number"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Site access details, materials needed, client requests..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-y"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setShowCreatePanel(false); setEditingJob(null); }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={isEdit ? handleUpdate : handleCreate}
            disabled={saving}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create job'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {/* Main content */}
      <section className="xl:col-span-2 space-y-4">
        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Jobs</h2>
              <p className="mt-1 text-sm text-slate-600">
                Manage active projects from scheduling through to completion.
              </p>
            </div>
            <button
              onClick={openCreatePanel}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors"
            >
              + New job
            </button>
          </div>

          {/* Status filter tabs */}
          {!isLoading && jobs.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === 'all' ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-200 bg-white text-slate-600 hover:bg-gray-50'}`}
              >
                All ({jobs.length})
              </button>
              {JOB_STATUSES.map((s) => {
                const count = statusCounts[s.value] || 0;
                if (count === 0) return null;
                return (
                  <button
                    key={s.value}
                    onClick={() => setStatusFilter(s.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-200 bg-white text-slate-600 hover:bg-gray-50'}`}
                  >
                    {s.label} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 font-semibold underline">Dismiss</button>
          </div>
        )}

        {/* Jobs list */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-500">Loading jobs...</p>
            </div>
          ) : filteredJobs.length === 0 && jobs.length === 0 ? (
            /* True empty state */
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                <span className="text-2xl">🔨</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">No jobs yet</h3>
              <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
                Create your first job to start managing projects. Link jobs to leads to track your full workflow from enquiry to completion.
              </p>
              <button
                onClick={openCreatePanel}
                className="mt-4 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                + Create your first job
              </button>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
              No jobs with status &ldquo;{statusFilter}&rdquo;.{' '}
              <button onClick={() => setStatusFilter('all')} className="font-medium text-amber-600 underline">Show all</button>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const jobTAs = attachmentsForJob(job.id);
              const linkedLeadName = leadNameForId(job.lead_id);
              return (
                <article
                  key={job.id}
                  className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)] hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => openEditPanel(job)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{job.client_name || job.title || 'Unnamed job'}</p>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClasses(job.status)}`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {linkedLeadName && <span>Lead: {linkedLeadName}</span>}
                        {job.scheduled_date && <span>Start: {formatDate(job.scheduled_date)}</span>}
                        {job.due_date && <span>Due: {formatDate(job.due_date)}</span>}
                        <span>Updated {formatDate(job.updated_at)}</span>
                      </div>
                      {job.notes && (
                        <p className="mt-1 text-sm text-slate-600 line-clamp-1">{job.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(job.value)}</p>
                      {/* Phase G1: financial summary badges */}
                      {(job.deposit_requested ?? 0) > 0 && (
                        <p className={`mt-0.5 text-xs font-medium ${
                          (job.deposit_paid ?? 0) > 0
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }`}>
                          {(job.deposit_paid ?? 0) > 0
                            ? `Deposit paid: ${formatCurrency(job.deposit_paid)}`
                            : `Deposit req: ${formatCurrency(job.deposit_requested)}`}
                        </p>
                      )}
                      {(job.vat_rate ?? 0) > 0 && (
                        <p className="mt-0.5 text-xs text-slate-500">VAT {job.vat_rate}%</p>
                      )}
                      {job.discount_type && job.discount_type !== 'none' && (job.discount_value ?? 0) > 0 && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          Discount: {job.discount_type === 'percentage'
                            ? `${job.discount_value}%`
                            : formatCurrency(job.discount_value)}
                        </p>
                      )}
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

        {/* Summary */}
        {!isLoading && jobs.length > 0 && (
          <p className="text-xs text-slate-500 pl-1">
            {filteredJobs.length} of {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            {statusFilter !== 'all' && ` (filtered by ${statusFilter.replace('_', ' ')})`}
            {toolAttachments.length > 0 && ` · ${toolAttachments.length} calculator attachment${toolAttachments.length !== 1 ? 's' : ''}`}
          </p>
        )}
      </section>

      {/* Right panel */}
      <aside className="space-y-4">
        {/* Create panel */}
        {showCreatePanel && (
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
            <h3 className="text-base font-semibold text-slate-900 mb-4">New job</h3>
            {renderForm(false)}
          </div>
        )}

        {/* Edit panel */}
        {editingJob && !showCreatePanel && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Edit job</h3>
              <button
                onClick={() => handleDelete(editingJob)}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Delete
              </button>
            </div>

            {/* Phase G1: Financial summary */}
            {((editingJob.deposit_requested ?? 0) > 0 || (editingJob.vat_rate ?? 0) > 0 || (editingJob.discount_type && editingJob.discount_type !== 'none')) && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 space-y-1.5">
                <p className="text-xs font-semibold text-slate-700">Financial summary</p>
                {(editingJob.vat_rate ?? 0) > 0 && (
                  <p className="text-xs text-slate-600">VAT: {editingJob.vat_rate}%</p>
                )}
                {editingJob.discount_type && editingJob.discount_type !== 'none' && (editingJob.discount_value ?? 0) > 0 && (
                  <p className="text-xs text-slate-600">
                    Discount: {editingJob.discount_type === 'percentage' ? `${editingJob.discount_value}%` : formatCurrency(editingJob.discount_value)}
                  </p>
                )}
                {(editingJob.deposit_requested ?? 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600">
                      Deposit: {formatCurrency(editingJob.deposit_requested)}
                      {(editingJob.deposit_paid ?? 0) > 0
                        ? <span className="ml-1 text-emerald-600 font-medium">✓ Paid</span>
                        : <span className="ml-1 text-amber-600 font-medium">Awaiting</span>}
                    </p>
                    {(editingJob.deposit_paid ?? 0) === 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkDepositPaid(editingJob); }}
                        className="rounded-md bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
                      >
                        Mark paid
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {renderForm(true)}
          </div>
        )}

        {/* Sidebar info — shown when no panel is open */}
        {!showCreatePanel && !editingJob && (
          <>
            {/* Won leads suggestion */}
            {wonLeads.length > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
                <h3 className="text-base font-semibold text-emerald-900">Ready to convert</h3>
                <p className="mt-1 text-sm text-emerald-900/70">
                  {wonLeads.length} lead{wonLeads.length !== 1 ? 's' : ''} ready to become {wonLeads.length !== 1 ? 'jobs' : 'a job'}.
                </p>
                <div className="mt-3 space-y-2">
                  {wonLeads.slice(0, 3).map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => {
                        setFormData({ ...EMPTY_FORM, title: lead.client_name || lead.name || '', lead_id: lead.id });
                        setFormError(null);
                        setEditingJob(null);
                        setShowCreatePanel(true);
                      }}
                      className="block w-full rounded-lg border border-emerald-200/60 bg-white px-3 py-2 text-left text-sm font-medium text-emerald-900 hover:bg-emerald-50 transition-colors"
                    >
                      {lead.client_name || lead.name || 'Unnamed lead'} →
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
              <h3 className="text-base font-semibold text-amber-900">Job workflow</h3>
              <div className="mt-3 space-y-2 text-sm text-amber-900/80">
                <p>→ <strong>Scheduled</strong> — Confirmed and planned in.</p>
                <p>→ <strong>In Progress</strong> — Work underway on site.</p>
                <p>→ <strong>On Hold</strong> — Paused, waiting for materials or client.</p>
                <p>→ <strong>Completed</strong> — Work done, ready to invoice.</p>
                <p>→ <strong>Cancelled</strong> — Job no longer proceeding.</p>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
