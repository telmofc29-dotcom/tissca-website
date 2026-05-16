// src/app/(member)/app/leads/page.tsx v3.0
//
// PURPOSE:
// - Full CRUD leads pipeline — create, view, edit, status change, delete.
// - Real data from /api/workspace/leads (Supabase-native, business_id scoped).
// - Website is a first-class app — no "synced from Android" language.
//
// VERSION HISTORY:
// - v1.0: Initial placeholder UI (dark/glass).
// - v2.0 (2026-03-27): Wire to real /api/workspace/leads data (read-only).
// - v3.0 (2026-03-30): Full CRUD — create modal, edit panel, status changes,
//                        filters, proper empty states, analytics tracking.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { trackEvent } from '@/utils/analytics';
import { formatCurrency as _fmtCur, currencySymbol as _curSym } from '@/lib/currency';
import {
  type ToolCardSummary,
  type ToolAttachment,
  attachmentToCard,
  fmtToolCurrency,
  toolKeyToRoute,
} from '@/lib/tools/tool-types';

// ─── Types ───────────────────────────────────────────────────────────────────

type Lead = {
  id: string;
  name: string | null;
  status: string;
  source: string | null;
  value_estimate: number | null;
  follow_up_date: string | null;
  notes: string | null;
  client_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Client record from the Supabase-native clients table. */
type ClientInfo = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_line_1: string | null;
};

type LeadFormData = {
  name: string;
  status: string;
  source: string;
  value_estimate: string;
  follow_up_date: string;
  notes: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
};

const EMPTY_FORM: LeadFormData = {
  name: '',
  status: 'new',
  source: '',
  value_estimate: '',
  follow_up_date: '',
  notes: '',
  client_name: '',
  client_email: '',
  client_phone: '',
  client_address: '',
};

// ─── Constants ───────────────────────────────────────────────────────────────

const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const LEAD_SOURCES = [
  'Referral',
  'Website',
  'Phone call',
  'Social media',
  'Checkatrade',
  'MyBuilder',
  'Repeat customer',
  'Other',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusPillClasses(status: string) {
  const raw = String(status || '').toLowerCase().trim();
  if (raw === 'new') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (raw === 'contacted') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (raw === 'quoted') return 'border-purple-200 bg-purple-50 text-purple-700';
  if (raw === 'won') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (raw === 'lost') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-gray-200 bg-gray-50 text-slate-700';
}

function formatCurrency(value: number | null) {
  if (value == null) return '\u2014';
  return _fmtCur(value);
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppLeadsPage() {
  const router = useRouter();
  const { accessToken, isLoading: ctxLoading } = useWorkspace();

  // Data state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [toolAttachments, setToolAttachments] = useState<ToolCardSummary[]>([]);
  const [clientsMap, setClientsMap] = useState<Map<string, ClientInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<LeadFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [converting, setConverting] = useState(false);

  // ─── API helpers ─────────────────────────────────────────────────────────

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }),
    [accessToken],
  );

  const fetchLeads = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [leadsRes, attachRes, clientsRes] = await Promise.all([
        fetch('/api/workspace/leads', { headers: authHeaders(), cache: 'no-store' }),
        fetch('/api/workspace/tool-attachments', { headers: authHeaders(), cache: 'no-store' }),
        fetch('/api/workspace/clients', { headers: authHeaders(), cache: 'no-store' }),
      ]);
      if (!leadsRes.ok) {
        if (leadsRes.status === 401) throw new Error('Session expired. Please refresh the page.');
        throw new Error('Failed to load leads');
      }
      const leadsData = await leadsRes.json();
      setLeads(leadsData.leads ?? []);

      if (attachRes.ok) {
        const attachData = await attachRes.json();
        const cards = (attachData.toolAttachments ?? []).map((a: ToolAttachment) => attachmentToCard(a));
        setToolAttachments(cards);
      }

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        const map = new Map<string, ClientInfo>();
        for (const c of (clientsData.clients ?? [])) {
          map.set(c.id, { id: c.id, name: c.name, email: c.email, phone: c.phone, address_line_1: c.address_line_1 });
        }
        setClientsMap(map);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeaders]);

  useEffect(() => {
    if (ctxLoading || !accessToken) return;
    fetchLeads();
    trackEvent('feature_view', '/app/leads', { eventLabel: 'leads_loaded', metadata: { feature: 'leads', action: 'view', sourcePage: '/app/leads' } });
  }, [accessToken, ctxLoading, fetchLeads]);

  // ─── Create ──────────────────────────────────────────────────────────────

  function openCreateModal() {
    setFormData(EMPTY_FORM);
    setFormError(null);
    setEditingLead(null);
    setShowCreateModal(true);
  }

  /** Create or find a client record if client fields are filled. Returns client_id or null. */
  async function resolveClientId(): Promise<string | null> {
    const hasClient = formData.client_name.trim() || formData.client_email.trim();
    if (!hasClient) return null;

    const clientRes = await fetch('/api/workspace/clients', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        name: formData.client_name.trim() || formData.client_email.trim(),
        email: formData.client_email.trim() || undefined,
        phone: formData.client_phone.trim() || undefined,
        address_line_1: formData.client_address.trim() || undefined,
      }),
    });
    const clientData = await clientRes.json();
    if (!clientRes.ok) throw new Error(clientData.error || 'Failed to create client');
    return clientData.client?.id ?? null;
  }

  async function handleCreate() {
    if (!accessToken) {
      setFormError('Session expired. Please refresh the page or sign in again.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Lead name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const clientId = await resolveClientId();

      const res = await fetch('/api/workspace/leads', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: formData.name.trim(),
          status: formData.status,
          source: formData.source || null,
          value_estimate: formData.value_estimate ? parseFloat(formData.value_estimate) : null,
          follow_up_date: formData.follow_up_date || null,
          notes: formData.notes || null,
          client_id: clientId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create lead');
      setShowCreateModal(false);
      await fetchLeads();
      trackEvent('feature_view', '/app/leads', { eventLabel: 'lead_create', metadata: { action: 'create', source: formData.source } });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  }

  // ─── Edit ────────────────────────────────────────────────────────────────

  function openEditPanel(lead: Lead) {
    setEditingLead(lead);
    const client = lead.client_id ? clientsMap.get(lead.client_id) : null;
    setFormData({
      name: lead.name || '',
      status: lead.status,
      source: lead.source || '',
      value_estimate: lead.value_estimate != null ? String(lead.value_estimate) : '',
      follow_up_date: formatDateInput(lead.follow_up_date),
      notes: lead.notes || '',
      client_name: client?.name || '',
      client_email: client?.email || '',
      client_phone: client?.phone || '',
      client_address: client?.address_line_1 || '',
    });
    setFormError(null);
    setShowCreateModal(false);
  }

  async function handleUpdate() {
    if (!editingLead) return;
    if (!formData.name.trim()) {
      setFormError('Lead name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const clientId = await resolveClientId();

      const res = await fetch('/api/workspace/leads', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          id: editingLead.id,
          name: formData.name.trim(),
          status: formData.status,
          source: formData.source || null,
          value_estimate: formData.value_estimate ? parseFloat(formData.value_estimate) : null,
          follow_up_date: formData.follow_up_date || null,
          notes: formData.notes || null,
          client_id: clientId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update lead');
      setEditingLead(null);
      await fetchLeads();
      trackEvent('feature_view', '/app/leads', { eventLabel: 'lead_update', metadata: { action: 'update', status: formData.status } });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update lead');
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  async function handleDelete(lead: Lead) {
    if (!confirm(`Delete "${lead.name || 'this lead'}"? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/workspace/leads', {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ id: lead.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete lead');
      }
      if (editingLead?.id === lead.id) setEditingLead(null);
      await fetchLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lead');
    }
  }

  // ─── Convert to Job ────────────────────────────────────────────────────────

  async function handleConvertToJob(lead: Lead) {
    if (!confirm(`Convert "${lead.name || 'this lead'}" to a job? The lead will be marked as Won.`)) return;
    setConverting(true);
    try {
      // Phase G1: Use dedicated conversion endpoint that handles:
      //   - financial field transfer (VAT from settings, deposit as requested)
      //   - tool attachment reassignment (lead → job)
      //   - history logging
      const res = await fetch(`/api/workspace/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to convert lead');

      trackEvent('quick_action_click', '/app/leads', {
        eventLabel: 'lead_convert_to_job',
        metadata: {
          lead_id: lead.id,
          job_id: data.job?.id,
          tools_reassigned: data.conversion?.tools_reassigned ?? 0,
        },
      });

      setEditingLead(null);
      await fetchLeads();

      // Navigate to jobs page
      router.push('/app/jobs');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to convert lead');
    } finally {
      setConverting(false);
    }
  }

  // ─── Filter ──────────────────────────────────────────────────────────────

  const filteredLeads = statusFilter === 'all'
    ? leads
    : leads.filter((l) => l.status.toLowerCase() === statusFilter);

  const statusCounts = leads.reduce<Record<string, number>>((acc, l) => {
    const s = l.status.toLowerCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const isLoading = ctxLoading || loading;

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
          <label className="block text-sm font-medium text-slate-700 mb-1">Lead name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Kitchen refit — Mrs Johnson"
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
              {LEAD_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">Select source</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Est. value ({_curSym(null)})</label>
            <input
              type="number"
              value={formData.value_estimate}
              onChange={(e) => setFormData({ ...formData, value_estimate: e.target.value })}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up date</label>
            <input
              type="date"
              value={formData.follow_up_date}
              onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Client contact details */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Client contact</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client name</label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="Mrs Johnson"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                placeholder="client@example.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                placeholder="07123 456 789"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <textarea
                value={formData.client_address}
                onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                placeholder="Site or postal address"
                rows={2}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-y"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any details about this lead..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-y"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setShowCreateModal(false); setEditingLead(null); }}
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
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create lead'}
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
              <h2 className="text-lg font-semibold text-slate-900">Lead pipeline</h2>
              <p className="mt-1 text-sm text-slate-600">
                Track enquiries from first contact through to won jobs.
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors"
            >
              + New lead
            </button>
          </div>

          {/* Status filter tabs */}
          {!isLoading && leads.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${statusFilter === 'all' ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-200 bg-white text-slate-600 hover:bg-gray-50'}`}
              >
                All ({leads.length})
              </button>
              {LEAD_STATUSES.map((s) => {
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

        {/* Leads list */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
          {isLoading ? (
            <div className="px-4 py-12 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="mt-3 text-sm text-slate-500">Loading leads...</p>
            </div>
          ) : filteredLeads.length === 0 && leads.length === 0 ? (
            /* True empty state — no leads at all */
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900">No leads yet</h3>
              <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto">
                Create your first lead to start tracking enquiries and building your pipeline. Every job starts here.
              </p>
              <button
                onClick={openCreateModal}
                className="mt-4 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                + Create your first lead
              </button>
            </div>
          ) : filteredLeads.length === 0 ? (
            /* Filtered empty state */
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No leads with status &ldquo;{statusFilter}&rdquo;.{' '}
              <button onClick={() => setStatusFilter('all')} className="font-medium text-amber-600 underline">Show all</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => openEditPanel(lead)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{lead.name || 'Untitled lead'}</p>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusPillClasses(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {lead.source && <span>Source: {lead.source}</span>}
                      {lead.follow_up_date && <span>Follow-up: {formatDate(lead.follow_up_date)}</span>}
                      <span>Updated {formatDate(lead.updated_at)}</span>
                    </div>
                    {lead.notes && (
                      <p className="mt-1 text-sm text-slate-600 line-clamp-1">{lead.notes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(lead.value_estimate)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/app/leads/${lead.id}`); }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                    >
                      View details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {!isLoading && leads.length > 0 && (
          <p className="text-xs text-slate-500 pl-1">
            {filteredLeads.length} of {leads.length} lead{leads.length !== 1 ? 's' : ''}
            {statusFilter !== 'all' && ` (filtered by ${statusFilter})`}
          </p>
        )}
      </section>

      {/* Right panel: create modal or edit panel */}
      <aside className="space-y-4">
        {/* Create modal */}
        {showCreateModal && (
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
            <h3 className="text-base font-semibold text-slate-900 mb-4">New lead</h3>
            {renderForm(false)}
          </div>
        )}

        {/* Edit panel */}
        {editingLead && !showCreateModal && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Edit lead</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleConvertToJob(editingLead)}
                  disabled={converting || editingLead.status === 'lost'}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition-colors"
                >
                  {converting ? 'Converting...' : '→ Convert to Job'}
                </button>
                <button
                  onClick={() => handleDelete(editingLead)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Tool attachments linked to this lead */}
            {(() => {
              const leadAttachments = toolAttachments.filter((a) => a.parent_id === editingLead.id);
              if (leadAttachments.length === 0) return null;
              return (
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">Tool Attachments ({leadAttachments.length})</h4>
                  <div className="space-y-2">
                    {leadAttachments.map((card) => {
                      const route = toolKeyToRoute(card.tool_key);
                      return (
                        <div
                          key={card.id}
                          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 flex items-start gap-2.5"
                        >
                          <span className="text-lg shrink-0">{card.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">{card.tool_title}</p>
                            <p className="text-xs text-slate-500 truncate">{card.preview_text}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs font-semibold text-amber-700">{fmtToolCurrency(card.total_value)}</span>
                              <span className="text-[10px] text-slate-400">{new Date(card.created_at_millis).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                              {route && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); router.push(`${route}?attachmentId=${card.id}`); }}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                                >
                                  Open tool
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {renderForm(true)}
          </div>
        )}

        {/* Quick actions — shown when no modal/panel is open */}
        {!showCreateModal && !editingLead && (
          <>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
              <h3 className="text-base font-semibold text-slate-900">Quick status change</h3>
              <p className="mt-1 text-sm text-slate-600">
                Click any lead to edit it, or use the buttons below to move leads through your pipeline quickly.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
              <h3 className="text-base font-semibold text-amber-900">Pipeline tips</h3>
              <div className="mt-3 space-y-2 text-sm text-amber-900/80">
                <p>→ <strong>New</strong> — Fresh enquiry. Follow up within 24 hours.</p>
                <p>→ <strong>Contacted</strong> — You&apos;ve spoken with the client.</p>
                <p>→ <strong>Quoted</strong> — Quote sent, waiting for a decision.</p>
                <p>→ <strong>Won</strong> — Job confirmed. Convert to a job record.</p>
                <p>→ <strong>Lost</strong> — Didn&apos;t proceed. Review and learn.</p>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
