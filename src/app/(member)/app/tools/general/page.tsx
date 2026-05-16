// src/app/(member)/app/tools/general/page.tsx v2.1
//
// PURPOSE:
// General estimate / quick-quote tool — the canonical "vertical slice"
// proving the full Tool → Lead → Job lifecycle.
//
// CORE FLOW:
// 1. Line items (description + amount, add/remove)
// 2. Adjustments (deposit paid, discount, VAT)
// 3. Notes section
// 4. Summary with subtotal, adjustments, total
// 5. Generated breakdown text
// 6. Actions: Generate Lead / Add to Lead / Add to Job / Clear
// 7. Draft persistence via localStorage (survives refresh/navigation)
//
// v2.0 changes over v1.0:
// - Shared ToolPayload types (tool-types.ts) for structured result_data
// - "Add to existing Lead" — picker with search
// - "Add to existing Job" — picker with search
// - "Clear" button — resets form + clears draft
// - Draft persistence (localStorage) — auto-saves, auto-restores
// - toolKey='general_estimate' in all attachments
// - preview_text + total_value in result_data (new ToolAttachmentResultData)

'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { currencySymbol as _curSym } from '@/lib/currency';
import { useLanguage } from '@/i18n/LanguageProvider';
import { trackEvent } from '@/utils/analytics';
import {
  type GeneralEstimatePayload,
  type ToolLineItem,
  type ToolAttachment,
  type CostBucket,
  COST_BUCKET_LABELS,
  detectCostBucket,
  normalizeLineItem,
  buildResultData,
  fmtToolCurrency,
  saveDraft,
  loadDraft,
  clearDraft,
} from '@/lib/tools/tool-types';

// ─── Local Types ─────────────────────────────────────────────────────────────

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  costBucket: CostBucket;
};

type Adjustments = {
  depositPaid: number;
  discountPercent: number;
  vatPercent: number;
};

/** Shape stored in localStorage as the draft. */
type GeneralToolDraft = {
  projectName: string;
  lineItems: LineItem[];
  adjustments: Adjustments;
  notes: string;
};

/** Minimal lead/job shape from API (for picker). */
type PickerLead = { id: string; client_name: string | null; status: string; estimated_value: number | null };
type PickerJob = { id: string; client_name: string | null; status: string; job_value: number | null };

type SuccessInfo = {
  type: 'new_lead' | 'add_to_lead' | 'add_to_job' | 'update';
  entityId: string;
  entityName: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _idCounter = 0;
function genId() {
  _idCounter += 1;
  return `item-${Date.now()}-${_idCounter}`;
}

function fmtCurrency(v: number): string {
  return fmtToolCurrency(v);
}

const TOOL_KEY = 'general_estimate' as const;

// ─── Component ──────────────────────────────────────────────────────────────

export default function GeneralToolPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="mt-2 text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    }>
      <GeneralToolContent />
    </Suspense>
  );
}

function GeneralToolContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, isLoading: ctxLoading, workspace } = useWorkspace();
  const { t } = useLanguage();
  const tt = t.member.tools;

  // ─── Edit Mode ─────────────────────────────────────────────────────────

  const attachmentIdParam = searchParams.get('attachmentId');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editAttachmentId, setEditAttachmentId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const editHydrated = useRef(false);

  // ─── Form State ────────────────────────────────────────────────────────

  const [projectName, setProjectName] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: genId(), description: '', quantity: 1, unitPrice: 0, costBucket: 'unknown' },
  ]);
  const [adjustments, setAdjustments] = useState<Adjustments>({
    depositPaid: 0,
    discountPercent: 0,
    vatPercent: 20,
  });
  const [notes, setNotes] = useState('');

  // ─── UI State ──────────────────────────────────────────────────────────

  const [generating, setGenerating] = useState(false);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const descRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // ─── Picker State (Add to Lead / Add to Job) ──────────────────────────

  const [pickerMode, setPickerMode] = useState<'none' | 'lead' | 'job'>('none');
  const [pickerLeads, setPickerLeads] = useState<PickerLead[]>([]);
  const [pickerJobs, setPickerJobs] = useState<PickerJob[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);

  // ─── Draft Persistence ─────────────────────────────────────────────────

  // Restore draft on mount — skip if in edit mode (attachment data takes priority)
  useEffect(() => {
    if (attachmentIdParam) return; // edit mode — skip draft restore
    const draft = loadDraft<GeneralToolDraft>(TOOL_KEY);
    if (draft) {
      setProjectName(draft.projectName || '');
      setLineItems(
        draft.lineItems?.length
          ? draft.lineItems.map((li: Record<string, unknown>) => ({
              id: (li.id as string) || genId(),
              description: (li.description as string) || '',
              quantity: typeof li.quantity === 'number' ? li.quantity : 1,
              unitPrice: typeof li.unitPrice === 'number' ? li.unitPrice : (typeof li.amount === 'number' ? li.amount : 0),
              costBucket: (typeof li.costBucket === 'string' ? li.costBucket : 'unknown') as CostBucket,
            }))
          : [{ id: genId(), description: '', quantity: 1, unitPrice: 0, costBucket: 'unknown' as CostBucket }],
      );
      setAdjustments(draft.adjustments || { depositPaid: 0, discountPercent: 0, vatPercent: 20 });
      setNotes(draft.notes || '');
      setDraftRestored(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft on changes (debounced) — disabled in edit mode
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isEditMode) return; // don't overwrite draft with edit-mode data
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const hasContent =
        projectName.trim() ||
        lineItems.some((li) => li.description.trim() || li.unitPrice > 0) ||
        notes.trim();
      if (hasContent) {
        saveDraft<GeneralToolDraft>(TOOL_KEY, { projectName, lineItems, adjustments, notes });
      }
    }, 800);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [projectName, lineItems, adjustments, notes, isEditMode]);

  // ─── Edit mode: fetch attachment and hydrate form ──────────────────────

  useEffect(() => {
    if (!attachmentIdParam || !accessToken || editHydrated.current) return;
    editHydrated.current = true;
    setEditLoading(true);

    (async () => {
      try {
        const res = await fetch('/api/workspace/tool-attachments', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error('Failed to load attachment');
        const data = await res.json();
        const attachments: ToolAttachment[] = data.toolAttachments ?? [];
        const att = attachments.find((a) => a.id === attachmentIdParam);
        if (!att || !att.raw_payload) throw new Error('Attachment not found');

        let payload: GeneralEstimatePayload;
        try {
          const parsed = JSON.parse(att.raw_payload);
          // raw_payload may wrap payload in a structure or be the payload itself
          payload = (parsed.payload ?? parsed) as GeneralEstimatePayload;
        } catch {
          throw new Error('Failed to parse attachment payload');
        }
        if (!payload || payload.tool_key !== 'general_estimate') throw new Error('Incompatible attachment');

        // Hydrate form from payload
        setProjectName(payload.project_name || '');
        setLineItems(
          payload.line_items.length > 0
            ? (payload.line_items as unknown as Record<string, unknown>[]).map((li) => {
                const norm = normalizeLineItem(li);
                return {
                  id: genId(),
                  description: norm.description,
                  quantity: norm.quantity,
                  unitPrice: norm.unit_price,
                  costBucket: norm.cost_bucket,
                };
              })
            : [{ id: genId(), description: '', quantity: 1, unitPrice: 0, costBucket: 'unknown' as CostBucket }],
        );
        setAdjustments({
          depositPaid: payload.deposit_paid || 0,
          discountPercent: payload.discount_percent || 0,
          vatPercent: payload.vat_percent ?? 20,
        });
        setNotes(payload.notes || '');

        setEditAttachmentId(attachmentIdParam);
        setIsEditMode(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load attachment for editing.');
      } finally {
        setEditLoading(false);
      }
    })();
  }, [attachmentIdParam, accessToken]);

  // Track page view
  useEffect(() => {
    trackEvent('feature_view', '/app/tools/general', {
      eventLabel: 'general_tool',
      metadata: { feature: 'tools', action: 'general_opened' },
    });
  }, []);

  // ─── Line item operations ─────────────────────────────────────────────

  function addLineItem() {
    const newItem: LineItem = { id: genId(), description: '', quantity: 1, unitPrice: 0, costBucket: 'unknown' };
    setLineItems((prev) => [...prev, newItem]);
    setTimeout(() => {
      const el = descRefs.current.get(newItem.id);
      if (el) el.focus();
    }, 50);
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // Auto-detect cost bucket when description changes (only if still 'unknown')
        if (field === 'description' && item.costBucket === 'unknown' && typeof value === 'string' && value.trim()) {
          const detected = detectCostBucket(value);
          if (detected !== 'unknown') updated.costBucket = detected;
        }
        return updated;
      }),
    );
  }

  // ─── Calculations ─────────────────────────────────────────────────────

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity || 1) * (item.unitPrice || 0), 0);
  const discountAmount = subtotal * (adjustments.discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = afterDiscount * (adjustments.vatPercent / 100);
  const totalBeforeDeposit = afterDiscount + vatAmount;
  const balanceDue = totalBeforeDeposit - adjustments.depositPaid;

  // ─── Build typed payload ──────────────────────────────────────────────

  const buildPayload = useCallback((): GeneralEstimatePayload => {
    const filledItems = lineItems.filter((it) => it.description.trim() || it.unitPrice > 0);
    const payloadItems: ToolLineItem[] = filledItems.map((it, i) => ({
      index: i + 1,
      description: it.description.trim() || `Item ${i + 1}`,
      quantity: it.quantity || 1,
      unit_price: it.unitPrice,
      amount: (it.quantity || 1) * it.unitPrice,
      cost_bucket: it.costBucket,
    }));

    return {
      tool_key: TOOL_KEY,
      project_name: projectName.trim() || null,
      line_items: payloadItems,
      subtotal,
      discount_percent: adjustments.discountPercent,
      discount_amount: discountAmount,
      after_discount: afterDiscount,
      vat_percent: adjustments.vatPercent,
      vat_amount: vatAmount,
      total: totalBeforeDeposit,
      deposit_paid: adjustments.depositPaid,
      balance_due: Math.max(0, balanceDue),
      notes: notes.trim() || null,
      generated_at: new Date().toISOString(),
    };
  }, [lineItems, projectName, subtotal, discountAmount, afterDiscount, vatAmount, totalBeforeDeposit, adjustments, balanceDue, notes]);

  // ─── Breakdown text ───────────────────────────────────────────────────

  const generateBreakdownText = useCallback(() => {
    const filledItems = lineItems.filter((it) => it.description.trim() || it.unitPrice > 0);
    if (filledItems.length === 0) return 'No items added yet.';

    let text = `ESTIMATE BREAKDOWN\n`;
    text += `${'─'.repeat(40)}\n`;

    if (projectName.trim()) {
      text += `Project: ${projectName.trim()}\n`;
      text += `${'─'.repeat(40)}\n`;
    }

    text += `\nLine Items:\n`;
    filledItems.forEach((item, i) => {
      const desc = item.description.trim() || `Item ${i + 1}`;
      const qty = item.quantity || 1;
      const lineTotal = qty * (item.unitPrice || 0);
      if (qty !== 1) {
        text += `  ${i + 1}. ${desc} — ${qty} × ${fmtCurrency(item.unitPrice)} = ${fmtCurrency(lineTotal)}\n`;
      } else {
        text += `  ${i + 1}. ${desc} — ${fmtCurrency(lineTotal)}\n`;
      }
    });

    text += `\nSubtotal: ${fmtCurrency(subtotal)}\n`;

    if (adjustments.discountPercent > 0) {
      text += `Discount (${adjustments.discountPercent}%): -${fmtCurrency(discountAmount)}\n`;
      text += `After discount: ${fmtCurrency(afterDiscount)}\n`;
    }

    if (adjustments.vatPercent > 0) {
      text += `VAT (${adjustments.vatPercent}%): ${fmtCurrency(vatAmount)}\n`;
    }

    text += `\nTotal: ${fmtCurrency(totalBeforeDeposit)}\n`;

    if (adjustments.depositPaid > 0) {
      text += `Deposit paid: -${fmtCurrency(adjustments.depositPaid)}\n`;
      text += `Balance due: ${fmtCurrency(Math.max(0, balanceDue))}\n`;
    }

    if (notes.trim()) {
      text += `\nNotes:\n${notes.trim()}\n`;
    }

    text += `\n${'─'.repeat(40)}\n`;
    text += `Generated by TISSCA · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    return text;
  }, [lineItems, projectName, subtotal, discountAmount, afterDiscount, vatAmount, totalBeforeDeposit, adjustments, balanceDue, notes]);

  // ─── Create tool attachment (shared by all actions) ────────────────────

  async function createAttachment(opts: { parent_id?: string; parent_type?: 'LEAD' | 'JOB' }): Promise<boolean> {
    const payload = buildPayload();
    const rawPayload = JSON.stringify(payload);
    const valuesText = `General Estimate – ${fmtCurrency(payload.total)}`;

    const res = await fetch('/api/workspace/tool-attachments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent_id: opts.parent_id || null,
        parent_type: opts.parent_type || null,
        tool_key: 'general_estimate',
        tool_title: 'General Estimate',
        values_text: valuesText,
        total: payload.total,
        user_notes: notes.trim() || null,
        raw_payload: rawPayload,
      }),
    });

    return res.ok;
  }

  // ─── Reset form ────────────────────────────────────────────────────────

  function resetForm() {
    setProjectName('');
    setLineItems([{ id: genId(), description: '', quantity: 1, unitPrice: 0, costBucket: 'unknown' as CostBucket }]);
    setAdjustments({ depositPaid: 0, discountPercent: 0, vatPercent: 20 });
    setNotes('');
    setShowBreakdown(false);
    setDraftRestored(false);
    clearDraft(TOOL_KEY);
    // Exit edit mode
    if (isEditMode) {
      setIsEditMode(false);
      setEditAttachmentId(null);
      editHydrated.current = false;
    }
  }

  // ─── Action: Update Attachment (edit mode) ────────────────────────────

  async function handleUpdateAttachment() {
    if (!accessToken || !editAttachmentId) {
      setError('Not authenticated or no attachment to update.');
      return;
    }

    const filledItems = lineItems.filter((it) => it.description.trim() || it.unitPrice > 0);
    if (filledItems.length === 0) {
      setError('Add at least one line item before saving.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const payload = buildPayload();
      const rawPayload = JSON.stringify(payload);
      const valuesText = `General Estimate – ${fmtCurrency(payload.total)}`;

      const res = await fetch('/api/workspace/tool-attachments', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editAttachmentId,
          tool_key: 'general_estimate',
          tool_title: 'General Estimate',
          values_text: valuesText,
          total: payload.total,
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
        entityName: projectName.trim() || 'Estimate',
      });

      trackEvent('quick_action_click', '/app/tools/general', {
        eventLabel: 'general_tool_update',
        metadata: { attachmentId: editAttachmentId, value: totalBeforeDeposit },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update attachment.');
    } finally {
      setGenerating(false);
    }
  }

  // ─── Action: Generate Lead ────────────────────────────────────────────

  const handleGenerateLead = useCallback(() => {
    if (!accessToken) {
      setError('Not authenticated. Please sign in again.');
      return;
    }

    if (!workspace?.id) {
      setError('Workspace is still loading. Please wait a moment and try again.');
      return;
    }

    const filledItems = lineItems.filter((it) => it.description.trim() || it.unitPrice > 0);
    if (filledItems.length === 0) {
      setError('Add at least one line item before generating a lead.');
      return;
    }

    setError(null);

    try {
      const breakdownText = generateBreakdownText();
      const payload = buildPayload();
      const resultData = buildResultData(payload);
      const leadName = projectName.trim() || `General Estimate — ${fmtCurrency(totalBeforeDeposit)}`;

      // Store estimate data in sessionStorage for the Create Lead page
      sessionStorage.setItem(
        'tissca_create_lead_estimate',
        JSON.stringify({
          projectName: leadName,
          totalBeforeDeposit,
          breakdownText,
          resultData,
        }),
      );

      trackEvent('quick_action_click', '/app/tools/general', {
        eventLabel: 'general_tool_lead_navigate',
        metadata: {
          value: totalBeforeDeposit,
          itemCount: filledItems.length,
          hasDiscount: adjustments.discountPercent > 0,
          hasVat: adjustments.vatPercent > 0,
          hasDeposit: adjustments.depositPaid > 0,
        },
      });

      // Navigate to the Create Lead screen (matching Android flow)
      router.push('/app/leads/create');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare lead data.');
    }
  }, [accessToken, workspace?.id, lineItems, projectName, totalBeforeDeposit, adjustments, generateBreakdownText, buildPayload, router]);

  // ─── Action: Add to existing Lead ─────────────────────────────────────

  async function openLeadPicker() {
    if (!accessToken) {
      setError('Not authenticated.');
      return;
    }
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
          id: l.id,
          client_name: l.client_name as string | null,
          status: l.status as string,
          estimated_value: l.estimated_value as number | null,
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
      const ok = await createAttachment({ parent_id: lead.id, parent_type: 'LEAD' });
      if (!ok) throw new Error('Failed to attach estimate to lead.');
      clearDraft(TOOL_KEY);
      setPickerMode('none');
      setSuccessInfo({
        type: 'add_to_lead',
        entityId: lead.id,
        entityName: lead.client_name || 'Lead',
      });
      trackEvent('quick_action_click', '/app/tools/general', {
        eventLabel: 'general_tool_add_to_lead',
        metadata: { leadId: lead.id, value: totalBeforeDeposit },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to attach.');
    } finally {
      setGenerating(false);
    }
  }

  // ─── Action: Add to existing Job ──────────────────────────────────────

  async function openJobPicker() {
    if (!accessToken) {
      setError('Not authenticated.');
      return;
    }
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
          id: j.id,
          client_name: j.client_name as string | null,
          status: j.status as string,
          job_value: j.job_value as number | null,
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
      const ok = await createAttachment({ parent_id: job.id, parent_type: 'JOB' });
      if (!ok) throw new Error('Failed to attach estimate to job.');
      clearDraft(TOOL_KEY);
      setPickerMode('none');
      setSuccessInfo({
        type: 'add_to_job',
        entityId: job.id,
        entityName: job.client_name || 'Job',
      });
      trackEvent('quick_action_click', '/app/tools/general', {
        eventLabel: 'general_tool_add_to_job',
        metadata: { jobId: job.id, value: totalBeforeDeposit },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to attach.');
    } finally {
      setGenerating(false);
    }
  }

  // ─── Action: Clear ────────────────────────────────────────────────────

  function handleClear() {
    resetForm();
    setError(null);
    setSuccessInfo(null);
    // If in edit mode, clean the URL param
    if (attachmentIdParam) {
      router.replace('/app/tools/general');
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────

  if (ctxLoading || editLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="mt-2 text-sm text-slate-500">{editLoading ? tt.saving : t.member.common.loading}</p>
        </div>
      </div>
    );
  }

  // ─── Success state ────────────────────────────────────────────────────

  if (successInfo) {
    const successMessages: Record<SuccessInfo['type'], { title: string; desc: string; viewLabel: string; viewPath: string }> = {
      new_lead: {
        title: tt.successLeadTitle,
        desc: tt.successLeadDesc,
        viewLabel: tt.viewInLeads,
        viewPath: '/app/leads',
      },
      add_to_lead: {
        title: tt.successAttachLead,
        desc: `${tt.successAttachLead} — "${successInfo.entityName}".`,
        viewLabel: tt.viewInLeads,
        viewPath: '/app/leads',
      },
      add_to_job: {
        title: tt.successAttachJob,
        desc: `${tt.successAttachJob} — "${successInfo.entityName}".`,
        viewLabel: tt.viewInJobs,
        viewPath: '/app/jobs',
      },
      update: {
        title: tt.successUpdate,
        desc: `${tt.successUpdate} — "${successInfo.entityName}".`,
        viewLabel: tt.viewInLeads,
        viewPath: '/app/leads',
      },
    };
    const msg = successMessages[successInfo.type];

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
          <span className="text-4xl">✅</span>
          <h2 className="mt-3 text-lg font-semibold text-emerald-900">{msg.title}</h2>
          <p className="mt-1 text-sm text-emerald-800">{msg.desc}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => router.push(msg.viewPath)}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              {msg.viewLabel}
            </button>
            <button
              onClick={() => {
                setSuccessInfo(null);
                resetForm();
              }}
              className="rounded-lg border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              {tt.newEstimate}
            </button>
            <button
              onClick={() => router.push('/app/tools')}
              className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-gray-50 transition-colors"
            >
              {tt.backToTools}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">{tt.generatedBreakdown}</h3>
          <pre className="whitespace-pre-wrap text-xs text-slate-600 bg-gray-50 rounded-lg p-4 font-mono leading-relaxed">
            {generateBreakdownText()}
          </pre>
        </div>
      </div>
    );
  }

  // ─── Filtered picker lists ────────────────────────────────────────────

  const searchLower = pickerSearch.toLowerCase();
  const filteredLeads = pickerLeads.filter(
    (l) =>
      !pickerSearch ||
      (l.client_name || '').toLowerCase().includes(searchLower) ||
      l.status.toLowerCase().includes(searchLower),
  );
  const filteredJobs = pickerJobs.filter(
    (j) =>
      !pickerSearch ||
      (j.client_name || '').toLowerCase().includes(searchLower) ||
      j.status.toLowerCase().includes(searchLower),
  );

  // ─── Main form ────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-2xl">📝</span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">
              {isEditMode ? tt.editTitle : tt.title}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditMode
                ? tt.editSubtitle
                : tt.subtitle}
            </p>
          </div>
          {/* Edit mode indicator */}
          {isEditMode && (
            <span className="rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[10px] font-medium text-purple-700">
              {tt.editing}
            </span>
          )}
          {/* Draft indicator */}
          {!isEditMode && draftRestored && (
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-medium text-blue-700">
              {tt.draftRestored}
            </span>
          )}
        </div>
      </div>

      {/* Project name */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">{tt.projectName}</label>
        <input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="e.g. Kitchen renovation — Mr. Smith"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
        />
      </div>

      {/* Line items */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">{tt.lineItems}</h3>
          <button
            onClick={addLineItem}
            className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <span className="text-base leading-none">+</span> {tt.addItem}
          </button>
        </div>

        <div className="space-y-3">
          {lineItems.map((item, index) => {
            const lineTotal = (item.quantity || 1) * (item.unitPrice || 0);
            return (
              <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-2">
                {/* Row 1: index + description + remove */}
                <div className="flex items-start gap-2">
                  <span className="mt-2 text-xs text-slate-400 w-5 text-right shrink-0">{index + 1}.</span>
                  <input
                    ref={(el) => {
                      if (el) descRefs.current.set(item.id, el);
                      else descRefs.current.delete(item.id);
                    }}
                    value={item.description}
                    onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                    placeholder={tt.description}
                    className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                  />
                  <button
                    onClick={() => removeLineItem(item.id)}
                    disabled={lineItems.length <= 1}
                    className="mt-1 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={tt.removeItem}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                {/* Row 2: qty × unit price = line total + cost bucket */}
                <div className="flex items-center gap-2 pl-7">
                  <div className="w-16 shrink-0">
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Qty</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity || ''}
                      onChange={(e) => updateLineItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                      placeholder="1"
                      className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-slate-900 text-center placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                    />
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">×</span>
                  <div className="relative w-28 shrink-0">
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Unit Price</label>
                    <span className="absolute left-2.5 bottom-[7px] text-xs text-slate-400">{_curSym(null)}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice || ''}
                      onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-gray-200 bg-white pl-6 pr-2 py-1.5 text-sm text-slate-900 text-right placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                    />
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">=</span>
                  <span className="text-sm font-semibold text-slate-900 w-24 text-right shrink-0">{fmtCurrency(lineTotal)}</span>
                  <select
                    value={item.costBucket}
                    onChange={(e) => updateLineItem(item.id, 'costBucket', e.target.value)}
                    className="ml-auto rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                  >
                    {(Object.keys(COST_BUCKET_LABELS) as CostBucket[]).map((b) => (
                      <option key={b} value={b}>{COST_BUCKET_LABELS[b]}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
          <span className="text-slate-600">{tt.subtotal}</span>
          <span className="font-semibold text-slate-900">{fmtCurrency(subtotal)}</span>
        </div>
      </div>

      {/* Adjustments */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">{tt.adjustments}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{tt.discount} (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={adjustments.discountPercent || ''}
              onChange={(e) => setAdjustments((prev) => ({ ...prev, discountPercent: parseFloat(e.target.value) || 0 }))}
              placeholder="0"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{tt.vat} (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={adjustments.vatPercent || ''}
              onChange={(e) => setAdjustments((prev) => ({ ...prev, vatPercent: parseFloat(e.target.value) || 0 }))}
              placeholder="20"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{tt.depositPaid} ({_curSym(null)})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={adjustments.depositPaid || ''}
              onChange={(e) => setAdjustments((prev) => ({ ...prev, depositPaid: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">{tt.notes}</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={tt.notesPlaceholder}
          rows={3}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 resize-none"
        />
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">{tt.summary}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>{tt.subtotal}</span>
            <span>{fmtCurrency(subtotal)}</span>
          </div>
          {adjustments.discountPercent > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>{tt.discount} ({adjustments.discountPercent}%)</span>
              <span className="text-red-600">-{fmtCurrency(discountAmount)}</span>
            </div>
          )}
          {adjustments.vatPercent > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>{tt.vat} ({adjustments.vatPercent}%)</span>
              <span>{fmtCurrency(vatAmount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold text-slate-900">
            <span>{tt.total}</span>
            <span className="text-lg">{fmtCurrency(totalBeforeDeposit)}</span>
          </div>
          {adjustments.depositPaid > 0 && (
            <>
              <div className="flex justify-between text-slate-600">
                <span>{tt.depositPaid}</span>
                <span className="text-emerald-600">-{fmtCurrency(adjustments.depositPaid)}</span>
              </div>
              <div className="flex justify-between font-semibold text-amber-700">
                <span>{tt.balanceDue}</span>
                <span>{fmtCurrency(Math.max(0, balanceDue))}</span>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="mt-3 text-xs font-medium text-amber-600 hover:text-amber-700 underline underline-offset-2"
        >
          {showBreakdown ? tt.hideBreakdown : tt.viewBreakdown}
        </button>

        {showBreakdown && (
          <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600 bg-gray-50 rounded-lg p-4 font-mono leading-relaxed">
            {generateBreakdownText()}
          </pre>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ─── Picker Modal (Add to Lead / Add to Job) ──────────────────── */}
      {pickerMode !== 'none' && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {pickerMode === 'lead' ? tt.selectLead : tt.selectJob}
            </h3>
            <button
              onClick={() => setPickerMode('none')}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              {tt.cancel}
            </button>
          </div>

          {/* Search */}
          <input
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder={pickerMode === 'lead' ? tt.searchLeads : tt.searchJobs}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 mb-3"
            autoFocus
          />

          {pickerLoading ? (
            <div className="text-center py-4">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : pickerMode === 'lead' ? (
            filteredLeads.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">{tt.noLeadsFound}</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => handleAttachToLead(lead)}
                    disabled={generating}
                    className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left hover:border-blue-300 hover:bg-blue-50/50 transition-colors disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{lead.client_name || t.member.leads.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {lead.status}{lead.estimated_value ? ` · ${fmtCurrency(lead.estimated_value)}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-blue-600 font-medium shrink-0 ml-2">{tt.attach}</span>
                  </button>
                ))}
              </div>
            )
          ) : (
            filteredJobs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">{tt.noJobsFound}</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {filteredJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => handleAttachToJob(job)}
                    disabled={generating}
                    className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left hover:border-blue-300 hover:bg-blue-50/50 transition-colors disabled:opacity-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{job.client_name || t.member.jobs.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {job.status}{job.job_value ? ` · ${fmtCurrency(job.job_value)}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-blue-600 font-medium shrink-0 ml-2">{tt.attach}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Actions */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
        <div className="flex flex-wrap gap-3">
          {isEditMode ? (
            <>
              {/* Edit mode: Update Estimate */}
              <button
                onClick={handleUpdateAttachment}
                disabled={generating || subtotal === 0}
                className="flex-1 sm:flex-none rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {tt.saving}
                  </span>
                ) : (
                  tt.updateEstimate
                )}
              </button>

              {/* Clear (exits edit mode) */}
              <button
                onClick={handleClear}
                disabled={generating}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
              >
                {tt.discardNew}
              </button>

              {/* Back */}
              <button
                onClick={() => router.back()}
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-gray-50 transition-colors"
              >
                {tt.back}
              </button>
            </>
          ) : (
            <>
              {/* Primary: Generate Lead */}
              <button
                onClick={handleGenerateLead}
                disabled={generating || subtotal === 0 || !workspace?.id}
                className="flex-1 sm:flex-none rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {tt.working}
                  </span>
                ) : (
                  tt.generateLead
                )}
              </button>

              {/* Add to Lead */}
              <button
                onClick={openLeadPicker}
                disabled={generating || subtotal === 0 || !workspace?.id}
                className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {tt.addToLead}
              </button>

              {/* Add to Job */}
              <button
                onClick={openJobPicker}
                disabled={generating || subtotal === 0 || !workspace?.id}
                className="rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {tt.addToJob}
              </button>

              {/* Clear */}
              <button
                onClick={handleClear}
                disabled={generating}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
              >
                {tt.clear}
              </button>

              {/* Back */}
              <button
                onClick={() => router.push('/app/tools')}
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-gray-50 transition-colors"
              >
                {tt.backToTools}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Workspace info */}
      {!workspace && !ctxLoading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800">
            {tt.workspaceNote}
          </p>
        </div>
      )}
    </div>
  );
}
