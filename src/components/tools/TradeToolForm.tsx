// src/components/tools/TradeToolForm.tsx
//
// ANDROID PARITY: Reusable section-based trade tool form.
// Renders any Android-parity tool using its ToolDefinition sections.
// Supports: repeatable rows, notes, summary, financials, all actions.
//
// Maps to Android contract:
// - notes UI → userNotes
// - structured editable fields → rawPayload
// - summary text → valuesText

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { trackEvent } from '@/utils/analytics';
import type { ToolDefinition } from '@/lib/tools/tool-definitions';
import type {
  ToolKey,
  TradeToolPayload,
  TradeToolSection,
  CostBucket,
} from '@/lib/tools/tool-types';
import {
  COST_BUCKET_LABELS,
  buildResultData,
  buildValuesText,
  buildRawPayload,
  fmtToolCurrency,
  saveDraft,
  loadDraft,
  clearDraft,
} from '@/lib/tools/tool-types';

// ─── Local Types ─────────────────────────────────────────────────────────────

type FormRow = {
  id: string;
  sectionKey: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  costBucket: CostBucket;
};

type FormState = {
  rows: FormRow[];
  notes: string;
  discountPercent: number;
  vatPercent: number;
  depositAmount: number;
};

type PickerLead = { id: string; client_name: string | null; status: string; estimated_value: number | null; client_record_id: string | null };
type PickerJob = { id: string; client_name: string | null; status: string; job_value: number | null; client_record_id: string | null };

type SuccessInfo = {
  type: 'new_lead' | 'add_to_lead' | 'add_to_job' | 'update';
  entityId: string;
  entityName: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _idCounter = 0;
function genId() {
  _idCounter += 1;
  return `row-${Date.now()}-${_idCounter}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface TradeToolFormProps {
  definition: ToolDefinition;
  attachmentId?: string | null;
}

export default function TradeToolForm({ definition, attachmentId: attachmentIdProp }: TradeToolFormProps) {
  const router = useRouter();
  const { accessToken, workspace } = useWorkspace();
  const toolKey = definition.toolKey;

  // ─── Edit Mode ─────────────────────────────────────────────────────────

  const [isEditMode, setIsEditMode] = useState(false);
  const [editAttachmentId, setEditAttachmentId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const editHydrated = useRef(false);

  // ─── Form State ────────────────────────────────────────────────────────

  const [rows, setRows] = useState<FormRow[]>([]);
  const [notes, setNotes] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [vatPercent, setVatPercent] = useState(20);
  const [depositAmount, setDepositAmount] = useState(0);

  // ─── UI State ──────────────────────────────────────────────────────────

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(definition.sections.map(s => s.key)));
  const [showBreakdown, setShowBreakdown] = useState(false);

  // ─── Picker State ──────────────────────────────────────────────────────

  const [pickerMode, setPickerMode] = useState<'none' | 'lead' | 'job'>('none');
  const [pickerLeads, setPickerLeads] = useState<PickerLead[]>([]);
  const [pickerJobs, setPickerJobs] = useState<PickerJob[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);

  // ─── Draft Persistence ─────────────────────────────────────────────────

  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (attachmentIdProp) return; // edit mode — skip draft restore
    const draft = loadDraft<FormState>(toolKey);
    if (draft) {
      setRows(draft.rows?.length ? draft.rows : []);
      setNotes(draft.notes || '');
      setDiscountPercent(draft.discountPercent || 0);
      setVatPercent(draft.vatPercent ?? 20);
      setDepositAmount(draft.depositAmount || 0);
    }
  }, [toolKey, attachmentIdProp]);

  useEffect(() => {
    if (isEditMode) return; // don't overwrite draft with edit-mode data
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const hasContent = rows.some(r => r.description.trim() || r.unitPrice > 0) || notes.trim();
      if (hasContent) {
        saveDraft<FormState>(toolKey, { rows, notes, discountPercent, vatPercent, depositAmount });
      }
    }, 800);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [rows, notes, discountPercent, vatPercent, depositAmount, toolKey, isEditMode]);

  // ─── Edit mode: fetch attachment and hydrate form ──────────────────────

  useEffect(() => {
    if (!attachmentIdProp || !accessToken || editHydrated.current) return;
    editHydrated.current = true;
    setEditLoading(true);

    (async () => {
      try {
        const res = await fetch('/api/workspace/tool-attachments', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error('Failed to load attachment');
        const data = await res.json();
        type AttRow = { id: string; result_data: Record<string, unknown> | null; raw_payload: string | null; user_notes: string | null };
        const attachments: AttRow[] = data.toolAttachments ?? [];
        const att = attachments.find((a) => a.id === attachmentIdProp);
        if (!att) throw new Error('Attachment not found');

        // Prefer top-level raw_payload; fall back to result_data.payload
        let payloadObj: TradeToolPayload | null = null;
        const rawStr = att.raw_payload ?? (att.result_data?.raw_payload as string | null);
        if (rawStr) {
          try { payloadObj = JSON.parse(rawStr) as TradeToolPayload; } catch { /* skip */ }
        }
        if (!payloadObj && att.result_data?.payload) {
          payloadObj = att.result_data.payload as TradeToolPayload;
        }
        if (!payloadObj) throw new Error('Incompatible attachment — no payload found');

        // Hydrate rows from sections
        const hydratedRows: FormRow[] = [];
        for (const section of payloadObj.sections ?? []) {
          for (const row of section.rows ?? []) {
            hydratedRows.push({
              id: genId(),
              sectionKey: section.key,
              description: row.description || '',
              quantity: row.quantity ?? 1,
              unit: row.unit || 'unit',
              unitPrice: row.unit_price ?? 0,
              costBucket: (row.cost_bucket || 'unknown') as CostBucket,
            });
          }
        }
        setRows(hydratedRows.length > 0 ? hydratedRows : []);

        // Hydrate financials
        setDiscountPercent(payloadObj.discount_percent ?? 0);
        setVatPercent(payloadObj.vat_percent ?? 20);
        setDepositAmount(payloadObj.deposit_amount ?? 0);

        // Hydrate notes: prefer top-level user_notes
        const notesStr = att.user_notes ?? (att.result_data?.user_notes as string | null) ?? payloadObj.notes ?? '';
        setNotes(notesStr);

        setEditAttachmentId(attachmentIdProp);
        setIsEditMode(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load attachment for editing.');
      } finally {
        setEditLoading(false);
      }
    })();
  }, [attachmentIdProp, accessToken]);

  // Track page view
  useEffect(() => {
    trackEvent('feature_view', `/app/tools/${toolKey}`, {
      eventLabel: `trade_tool_${toolKey}`,
      metadata: { feature: 'tools', action: 'opened', toolKey },
    });
  }, [toolKey]);

  // ─── Row Operations ────────────────────────────────────────────────────

  function addRow(sectionKey: string, defaultDescription: string, defaultUnit: string, defaultBucket: CostBucket) {
    setRows(prev => [...prev, {
      id: genId(),
      sectionKey,
      description: defaultDescription,
      quantity: 1,
      unit: defaultUnit,
      unitPrice: 0,
      costBucket: defaultBucket,
    }]);
  }

  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id));
  }

  function updateRow(id: string, field: keyof FormRow, value: string | number) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  // ─── Calculations ─────────────────────────────────────────────────────

  const subtotal = rows.reduce((sum, r) => sum + (r.quantity || 1) * (r.unitPrice || 0), 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = afterDiscount * (vatPercent / 100);
  const total = afterDiscount + vatAmount;
  const balanceDue = total - depositAmount;

  // ─── Build Payload ────────────────────────────────────────────────────

  const buildPayload = useCallback((): TradeToolPayload => {
    const sections: TradeToolSection[] = definition.sections.map(secDef => ({
      key: secDef.key,
      title: secDef.title,
      rows: rows
        .filter(r => r.sectionKey === secDef.key && (r.description.trim() || r.unitPrice > 0))
        .map(r => ({
          id: r.id,
          description: r.description.trim() || 'Item',
          quantity: r.quantity || 1,
          unit: r.unit,
          unit_price: r.unitPrice,
          amount: (r.quantity || 1) * r.unitPrice,
          cost_bucket: r.costBucket,
        })),
    }));

    return {
      tool_key: toolKey as Exclude<ToolKey, 'general_estimate'>,
      tool_title: definition.toolTitle,
      sections,
      subtotal,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      after_discount: afterDiscount,
      vat_percent: vatPercent,
      vat_amount: vatAmount,
      total,
      deposit_amount: depositAmount,
      balance_due: Math.max(0, balanceDue),
      notes: notes.trim() || null,
      generated_at: new Date().toISOString(),
    };
  }, [definition, toolKey, rows, notes, subtotal, discountPercent, discountAmount, afterDiscount, vatPercent, vatAmount, total, depositAmount, balanceDue]);

  // ─── Create Attachment (Android-compatible Supabase row) ──────────────

  async function createAttachment(opts: { parent_id?: string; parent_type?: 'LEAD' | 'JOB' }): Promise<boolean> {
    const payload = buildPayload();
    const valuesText = buildValuesText(payload);
    const rawPayload = buildRawPayload(payload);

    const res = await fetch('/api/workspace/tool-attachments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent_id: opts.parent_id || null,
        parent_type: opts.parent_type || null,
        tool_key: toolKey,
        tool_title: definition.toolTitle,
        values_text: valuesText,
        total,
        user_notes: notes.trim() || null,
        raw_payload: rawPayload,
      }),
    });

    return res.ok;
  }

  // ─── Action: Update Attachment (edit mode) ────────────────────────────

  async function handleUpdateAttachment() {
    if (!accessToken || !editAttachmentId) {
      setError('Not authenticated or no attachment to update.');
      return;
    }

    const filledRows = rows.filter(r => r.description.trim() || r.unitPrice > 0);
    if (filledRows.length === 0) {
      setError('Add at least one item before saving.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const payload = buildPayload();
      const valuesText = buildValuesText(payload);
      const rawPayload = buildRawPayload(payload);

      const res = await fetch('/api/workspace/tool-attachments', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editAttachmentId,
          tool_key: toolKey,
          tool_title: definition.toolTitle,
          values_text: valuesText,
          total,
          user_notes: notes.trim() || null,
          raw_payload: rawPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update attachment.');
      }

      setSuccessInfo({
        type: 'update',
        entityId: editAttachmentId,
        entityName: definition.toolTitle,
      });

      trackEvent('quick_action_click', `/app/tools/${toolKey}`, {
        eventLabel: `${toolKey}_update`,
        metadata: { attachmentId: editAttachmentId, value: total },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update attachment.');
    } finally {
      setGenerating(false);
    }
  }

  // ─── Reset Form ────────────────────────────────────────────────────────

  function resetForm() {
    setRows([]);
    setNotes('');
    setDiscountPercent(0);
    setVatPercent(20);
    setDepositAmount(0);
    setShowBreakdown(false);
    setSuccessInfo(null);
    clearDraft(toolKey);
    // Exit edit mode
    if (isEditMode) {
      setIsEditMode(false);
      setEditAttachmentId(null);
      editHydrated.current = false;
    }
  }

  // ─── Action: Generate Lead ────────────────────────────────────────────

  const handleGenerateLead = useCallback(() => {
    if (!accessToken || !workspace?.id) {
      setError('Not authenticated or workspace not loaded.');
      return;
    }
    const filledRows = rows.filter(r => r.description.trim() || r.unitPrice > 0);
    if (filledRows.length === 0) {
      setError('Add at least one item before generating a lead.');
      return;
    }
    setError(null);
    try {
      const payload = buildPayload();
      const resultData = buildResultData(payload);
      const valuesText = buildValuesText(payload);
      const leadName = `${definition.toolTitle} — ${fmtToolCurrency(total)}`;

      sessionStorage.setItem(
        'tissca_create_lead_estimate',
        JSON.stringify({
          projectName: leadName,
          totalBeforeDeposit: total,
          breakdownText: valuesText,
          resultData: {
            ...resultData,
            values_text: valuesText,
            user_notes: notes.trim() || null,
            raw_payload: buildRawPayload(payload),
          },
        }),
      );

      trackEvent('quick_action_click', `/app/tools/${toolKey}`, {
        eventLabel: `${toolKey}_lead_navigate`,
        metadata: { value: total, itemCount: filledRows.length },
      });

      router.push('/app/leads/create');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare lead data.');
    }
  }, [accessToken, workspace?.id, rows, buildPayload, definition.toolTitle, total, notes, toolKey, router]);

  // ─── Action: Add to Lead ──────────────────────────────────────────────

  async function openLeadPicker() {
    if (!accessToken) { setError('Not authenticated.'); return; }
    setPickerLoading(true);
    setPickerSearch('');
    setError(null);
    try {
      const res = await fetch('/api/workspace/leads', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load leads.');
      const data = await res.json();
      setPickerLeads(
        (data.leads || []).map((l: Record<string, unknown>) => ({
          id: l.id, client_name: l.client_name as string | null, status: l.status as string, estimated_value: l.estimated_value as number | null,
          client_record_id: l.client_record_id as string | null,
        })),
      );
      setPickerMode('lead');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads.');
    } finally {
      setPickerLoading(false);
    }
  }

  async function handleAttachToLead(lead: PickerLead) {
    setGenerating(true);
    setError(null);
    try {
      // Use client_record_id as parent_id — tool_attachments.parent_id stores client_record_id,
      // NOT leads.id. Supabase proof: parent_matches_uuid_pk=0, parent_matches_client_record_id=3.
      const ok = await createAttachment({ parent_id: lead.client_record_id ?? lead.id, parent_type: 'LEAD' });
      if (!ok) throw new Error('Failed to attach to lead.');
      clearDraft(toolKey);
      setPickerMode('none');
      setSuccessInfo({ type: 'add_to_lead', entityId: lead.id, entityName: lead.client_name || 'Lead' });
      trackEvent('quick_action_click', `/app/tools/${toolKey}`, {
        eventLabel: `${toolKey}_add_to_lead`,
        metadata: { leadId: lead.id, value: total },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to attach.');
    } finally {
      setGenerating(false);
    }
  }

  // ─── Action: Add to Job ───────────────────────────────────────────────

  async function openJobPicker() {
    if (!accessToken) { setError('Not authenticated.'); return; }
    setPickerLoading(true);
    setPickerSearch('');
    setError(null);
    try {
      const res = await fetch('/api/workspace/jobs', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load jobs.');
      const data = await res.json();
      setPickerJobs(
        (data.jobs || []).map((j: Record<string, unknown>) => ({
          id: j.id, client_name: j.client_name as string | null, status: j.status as string, job_value: j.job_value as number | null,
          client_record_id: j.client_record_id as string | null,
        })),
      );
      setPickerMode('job');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs.');
    } finally {
      setPickerLoading(false);
    }
  }

  async function handleAttachToJob(job: PickerJob) {
    setGenerating(true);
    setError(null);
    try {
      // Use client_record_id as parent_id — tool_attachments.parent_id stores client_record_id,
      // NOT jobs.id. Supabase proof: parent_matches_uuid_pk=0, parent_matches_client_record_id=3.
      const ok = await createAttachment({ parent_id: job.client_record_id ?? job.id, parent_type: 'JOB' });
      if (!ok) throw new Error('Failed to attach to job.');
      clearDraft(toolKey);
      setPickerMode('none');
      setSuccessInfo({ type: 'add_to_job', entityId: job.id, entityName: job.client_name || 'Job' });
      trackEvent('quick_action_click', `/app/tools/${toolKey}`, {
        eventLabel: `${toolKey}_add_to_job`,
        metadata: { jobId: job.id, value: total },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to attach.');
    } finally {
      setGenerating(false);
    }
  }

  // ─── Section Toggle ───────────────────────────────────────────────────

  function toggleSection(key: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  // ─── Rows for a given section ──────────────────────────────────────────

  function sectionRows(sectionKey: string) {
    return rows.filter(r => r.sectionKey === sectionKey);
  }

  function sectionTotal(sectionKey: string) {
    return sectionRows(sectionKey).reduce((s, r) => s + (r.quantity || 1) * (r.unitPrice || 0), 0);
  }

  // ─── Filtered picker data ─────────────────────────────────────────────

  const filteredLeads = pickerLeads.filter(l =>
    !pickerSearch || (l.client_name || '').toLowerCase().includes(pickerSearch.toLowerCase()),
  );
  const filteredJobs = pickerJobs.filter(j =>
    !pickerSearch || (j.client_name || '').toLowerCase().includes(pickerSearch.toLowerCase()),
  );

  // ─── Render ────────────────────────────────────────────────────────────

  if (successInfo) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <div className="mb-2 text-3xl">✅</div>
          <h3 className="text-lg font-semibold text-green-900">
            {successInfo.type === 'update' ? 'Estimate Updated' : successInfo.type === 'new_lead' ? 'Lead Created' : successInfo.type === 'add_to_lead' ? 'Added to Lead' : 'Added to Job'}
          </h3>
          <p className="mt-1 text-sm text-green-800">
            {definition.toolTitle} estimate {successInfo.type === 'update' ? 'updated' : 'attached to'} <strong>{successInfo.entityName}</strong>
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {successInfo.type !== 'update' && (
              <button
                onClick={() => router.push(successInfo.type === 'add_to_job' ? `/app/jobs/${successInfo.entityId}` : `/app/leads/${successInfo.entityId}`)}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                View {successInfo.type === 'add_to_job' ? 'Job' : 'Lead'}
              </button>
            )}
            {successInfo.type === 'update' && (
              <button
                onClick={() => router.back()}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Back
              </button>
            )}
            <button onClick={resetForm} className="rounded-lg border border-green-300 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100">
              New Estimate
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (editLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <div className="mb-2 text-2xl animate-pulse">📝</div>
          <p className="text-sm text-slate-600">Loading estimate for editing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-2xl">{definition.icon}</span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {definition.toolTitle}
              {isEditMode && <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Editing</span>}
            </h2>
            {definition.subtitle && <p className="text-sm text-slate-500">{definition.subtitle}</p>}
          </div>
        </div>
        {/* Android toolKey reference */}
        <p className="text-[10px] text-slate-400 font-mono mt-1">toolKey: {toolKey}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-semibold underline">Dismiss</button>
        </div>
      )}

      {/* Sections */}
      {definition.sections.map((secDef) => {
        const isExpanded = expandedSections.has(secDef.key);
        const secRows = sectionRows(secDef.key);
        const secTotal = sectionTotal(secDef.key);

        return (
          <div key={secDef.key} className="rounded-2xl border border-gray-200 bg-white shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(secDef.key)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{secDef.title}</h3>
                {secRows.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                    {secRows.length} item{secRows.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {secTotal > 0 && (
                  <span className="text-sm font-medium text-slate-700">{fmtToolCurrency(secTotal)}</span>
                )}
                <svg className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 px-4 pb-4 pt-2 space-y-3">
                {/* Existing rows */}
                {secRows.map((row) => (
                  <div key={row.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        onClick={() => removeRow(row.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        title="Remove"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase">Qty</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.quantity || ''}
                          onChange={(e) => updateRow(row.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase">Unit</label>
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase">Unit Price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.unitPrice || ''}
                          onChange={(e) => updateRow(row.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase">Total</label>
                        <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-700">
                          {fmtToolCurrency((row.quantity || 1) * (row.unitPrice || 0))}
                        </div>
                      </div>
                    </div>
                    {/* Cost Bucket */}
                    <select
                      value={row.costBucket}
                      onChange={(e) => updateRow(row.id, 'costBucket', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs text-slate-600 focus:border-amber-400 focus:outline-none"
                    >
                      {Object.entries(COST_BUCKET_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                ))}

                {/* Quick-add buttons from section field definitions */}
                <div className="flex flex-wrap gap-1.5">
                  {secDef.fields.map((field) => (
                    <button
                      key={field.key}
                      onClick={() => addRow(secDef.key, field.label, field.unit, field.defaultBucket)}
                      className="rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs text-slate-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                    >
                      + {field.label}
                    </button>
                  ))}
                  <button
                    onClick={() => addRow(secDef.key, '', 'each', 'unknown')}
                    className="rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs text-slate-500 hover:border-slate-400 hover:bg-slate-50"
                  >
                    + Custom Item
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Adjustments */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Adjustments</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Discount %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={discountPercent || ''}
              onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">VAT %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={vatPercent || ''}
              onChange={(e) => setVatPercent(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Deposit (£)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={depositAmount || ''}
              onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-slate-900 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Notes — CRITICAL: saved in userNotes, NOT in rawPayload */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Notes</h3>
        <p className="text-[10px] text-slate-400 mb-2">Saved in userNotes (not in rawPayload) per Android contract</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes for this estimate..."
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-slate-900 focus:border-amber-400 focus:outline-none resize-none"
        />
      </div>

      {/* Summary / Total */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
        <h3 className="text-sm font-semibold text-amber-900 mb-3">Summary</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-slate-700">
            <span>Subtotal</span>
            <span>{fmtToolCurrency(subtotal)}</span>
          </div>
          {discountPercent > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Discount ({discountPercent}%)</span>
              <span>-{fmtToolCurrency(discountAmount)}</span>
            </div>
          )}
          {vatPercent > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>VAT ({vatPercent}%)</span>
              <span>{fmtToolCurrency(vatAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-amber-200 pt-2 text-base font-bold text-amber-900">
            <span>Total</span>
            <span>{fmtToolCurrency(total)}</span>
          </div>
          {depositAmount > 0 && (
            <>
              <div className="flex justify-between text-slate-600">
                <span>Deposit</span>
                <span>-{fmtToolCurrency(depositAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-amber-800">
                <span>Balance Due</span>
                <span>{fmtToolCurrency(Math.max(0, balanceDue))}</span>
              </div>
            </>
          )}
        </div>

        {/* Toggle breakdown text */}
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="mt-3 text-xs text-amber-700 underline"
        >
          {showBreakdown ? 'Hide breakdown text' : 'Show breakdown text (valuesText)'}
        </button>
        {showBreakdown && (
          <pre className="mt-2 rounded-lg bg-white/50 p-3 text-xs text-slate-700 whitespace-pre-wrap font-mono max-h-60 overflow-auto">
            {buildValuesText(buildPayload())}
          </pre>
        )}
      </div>

      {/* Actions — matching Android: Generate Lead, Add to Lead, Add to Job, Clear */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
        {isEditMode ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleUpdateAttachment}
              disabled={generating || rows.length === 0}
              className="col-span-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {generating ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => router.back()}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={resetForm}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleGenerateLead}
            disabled={generating || rows.length === 0}
            className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            Generate Lead
          </button>
          <button
            onClick={openLeadPicker}
            disabled={generating || rows.length === 0}
            className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
          >
            Add to Lead
          </button>
          <button
            onClick={openJobPicker}
            disabled={generating || rows.length === 0}
            className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
          >
            Add to Job
          </button>
          <button
            onClick={resetForm}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-gray-50 transition-colors"
          >
            Clear Tool Data
          </button>
        </div>
        )}
      </div>

      {/* Picker Modal */}
      {pickerMode !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">
                {pickerMode === 'lead' ? 'Select Lead' : 'Select Job'}
              </h3>
              <button onClick={() => setPickerMode('none')} className="text-slate-400 hover:text-slate-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <input
              type="text"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder={`Search ${pickerMode === 'lead' ? 'leads' : 'jobs'}...`}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-3 focus:border-amber-400 focus:outline-none"
            />

            {pickerLoading ? (
              <div className="py-8 text-center text-sm text-slate-500">Loading...</div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1">
                {pickerMode === 'lead' && filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => handleAttachToLead(lead)}
                    disabled={generating}
                    className="w-full rounded-lg border border-gray-100 p-3 text-left hover:bg-amber-50 transition-colors"
                  >
                    <div className="text-sm font-medium text-slate-900">{lead.client_name || 'Unnamed Lead'}</div>
                    <div className="text-xs text-slate-500">{lead.status} · {lead.estimated_value ? fmtToolCurrency(lead.estimated_value) : 'No value'}</div>
                  </button>
                ))}
                {pickerMode === 'job' && filteredJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => handleAttachToJob(job)}
                    disabled={generating}
                    className="w-full rounded-lg border border-gray-100 p-3 text-left hover:bg-amber-50 transition-colors"
                  >
                    <div className="text-sm font-medium text-slate-900">{job.client_name || 'Unnamed Job'}</div>
                    <div className="text-xs text-slate-500">{job.status} · {job.job_value ? fmtToolCurrency(job.job_value) : 'No value'}</div>
                  </button>
                ))}
                {((pickerMode === 'lead' && filteredLeads.length === 0) || (pickerMode === 'job' && filteredJobs.length === 0)) && (
                  <div className="py-6 text-center text-sm text-slate-500">
                    No {pickerMode === 'lead' ? 'leads' : 'jobs'} found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
