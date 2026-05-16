// src/app/(member)/app/leads/create/page.tsx v1.0
//
// PURPOSE:
// Dedicated Create Lead page with client/contact form fields.
// Receives estimate data from sessionStorage when navigating from tools.
// Mirrors the Android Create Lead screen with full client fields.

'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/i18n/LanguageProvider';
import { trackEvent } from '@/utils/analytics';

// ─── Types ───────────────────────────────────────────────────────────────────

type EstimateCarryData = {
  projectName: string;
  totalBeforeDeposit: number;
  breakdownText: string;
  resultData: Record<string, unknown>;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const SESSION_KEY = 'tissca_create_lead_estimate';

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateLeadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="mt-2 text-sm text-slate-500">Loading...</p>
          </div>
        </div>
      }
    >
      <CreateLeadContent />
    </Suspense>
  );
}

function CreateLeadContent() {
  const router = useRouter();
  const { accessToken, isLoading: ctxLoading } = useWorkspace();
  const { t } = useLanguage();
  const lt = t.member.leads;

  // ─── Form state ──────────────────────────────────────────────────────

  const [name, setName] = useState('');
  const [status, setStatus] = useState('NEW');
  const [source, setSource] = useState('');
  const [valueEstimate, setValueEstimate] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  // ── CRM date fields ──
  const [startDate, setStartDate] = useState('');
  const [materialsDeliveryDate, setMaterialsDeliveryDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Client fields
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // Estimate data from tools
  const [estimateData, setEstimateData] = useState<EstimateCarryData | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Status options (localised) ────────────────────────────────────────

  const statusOptions = [
    { value: 'NEW', label: lt.statusNew },
    { value: 'CONTACTED', label: lt.statusContacted },
    { value: 'QUOTED', label: lt.statusQuoted },
    { value: 'WON', label: lt.statusWon },
    { value: 'LOST', label: lt.statusLost },
  ];

  const sourceOptions = [
    'Referral',
    'Website',
    'Phone call',
    'Social media',
    'Checkatrade',
    'MyBuilder',
    'Repeat customer',
    'Other',
  ];

  // ─── Restore estimate carry-forward data ──────────────────────────────

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const data: EstimateCarryData = JSON.parse(raw);
      setEstimateData(data);

      // Pre-fill form from estimate
      if (data.projectName) {
        setName(data.projectName);
      }
      if (data.totalBeforeDeposit != null) {
        setValueEstimate(String(data.totalBeforeDeposit));
      }
      if (data.breakdownText) {
        setNotes(data.breakdownText);
      }
      setSource('General Tool');
    } catch {
      // Invalid or missing data — user can still fill form manually
    }
  }, []);

  // ─── Auth headers ────────────────────────────────────────────────────

  const authHeaders = useCallback(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }),
    [accessToken],
  );

  // ─── Resolve or create client ─────────────────────────────────────────

  async function resolveClientId(): Promise<string | null> {
    const hasClient = clientName.trim() || clientEmail.trim();
    if (!hasClient) return null;

    const res = await fetch('/api/workspace/clients', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        name: clientName.trim() || clientEmail.trim(),
        email: clientEmail.trim() || undefined,
        phone: clientPhone.trim() || undefined,
        address_line_1: clientAddress.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create client');
    return data.client?.id ?? null;
  }

  // ─── Submit ──────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!accessToken) {
      setError('Not authenticated. Please sign in again.');
      return;
    }
    if (!name.trim()) {
      setError(lt.leadName + ' is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Create client if fields provided
      const clientId = await resolveClientId();

      // Helper: convert date string to millis or null
      const dateToMillis = (d: string) => d ? new Date(d).getTime() : null;

      // 2. Create the lead
      const leadRes = await fetch('/api/workspace/leads', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          client_name: name.trim(),
          status,
          source: source || null,
          estimated_value: valueEstimate ? parseFloat(valueEstimate) : null,
          follow_up_at_millis: dateToMillis(followUpDate),
          notes: notes || null,
          client_id: clientId,
          // ── CRM date columns (millis) ──
          start_date_millis: dateToMillis(startDate),
          materials_delivery_date_millis: dateToMillis(materialsDeliveryDate),
          due_date_millis: dateToMillis(dueDate),
        }),
      });

      if (!leadRes.ok) {
        const data = await leadRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create lead.');
      }

      const leadData = await leadRes.json();
      const leadId = leadData.lead?.id ?? null;

      // 3. Attach tool estimate if we have carry-forward data
      if (leadId && estimateData?.resultData) {
        await fetch('/api/workspace/tool-attachments', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            parent_id: leadId,
            parent_type: 'LEAD',
            tool_key: 'calculator',
            tool_title: 'General Estimate',
            raw_payload: JSON.stringify(estimateData.resultData),
            total: estimateData.totalBeforeDeposit ?? null,
            values_text: estimateData.breakdownText ?? null,
          }),
        }).catch(() => {
          // Non-fatal — lead was still created
        });
      }

      // 4. Clean up session data
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // SSR guard
      }

      trackEvent('feature_view', '/app/leads/create', {
        eventLabel: 'lead_create',
        metadata: {
          source,
          hasClient: !!(clientName.trim() || clientEmail.trim()),
          hasEstimate: !!estimateData,
          value: valueEstimate ? parseFloat(valueEstimate) : null,
        },
      });

      // Navigate to leads list
      router.push('/app/leads');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead.');
    } finally {
      setSaving(false);
    }
  }

  // ─── Loading state ───────────────────────────────────────────────────

  if (ctxLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="mt-2 text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-2xl">📋</span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">{lt.createTitle}</h2>
            <p className="text-xs text-slate-500">{lt.createSubtitle}</p>
          </div>
          {estimateData && (
            <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">
              {lt.estimateAttached}
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Lead details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)] space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{lt.leadName}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={lt.leadNamePlaceholder}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
          />
        </div>

        {/* Status + Source row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{lt.leadStatus}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{lt.leadSource}</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
            >
              <option value="">—</option>
              {sourceOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Value + Follow-up date row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{lt.estimateValue}</label>
            <input
              type="number"
              value={valueEstimate}
              onChange={(e) => setValueEstimate(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{lt.followUpDate}</label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none resize-none"
          />
        </div>

        {/* CRM Dates */}
        <div className="border-t border-gray-100 pt-3">
          <h4 className="text-xs font-semibold text-slate-700 mb-2">Project Dates</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Materials Delivery</label>
              <input
                type="date"
                value={materialsDeliveryDate}
                onChange={(e) => setMaterialsDeliveryDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Client details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)] space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{lt.clientDetails}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{lt.clientDetailsHint}</p>
        </div>

        {/* Client name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{lt.clientName}</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder={lt.clientNamePlaceholder}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
          />
        </div>

        {/* Email + Phone row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{lt.clientEmail}</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder={lt.clientEmailPlaceholder}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{lt.clientPhone}</label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder={lt.clientPhonePlaceholder}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{lt.clientAddress}</label>
          <input
            type="text"
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            placeholder={lt.clientAddressPlaceholder}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (estimateData) {
              router.push('/app/tools/general');
            } else {
              router.push('/app/leads');
            }
          }}
          className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-gray-50 transition-colors"
        >
          {estimateData ? lt.backToEstimate : '← ' + lt.title}
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? lt.creating : lt.createLead}
        </button>
      </div>
    </div>
  );
}
