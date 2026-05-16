// src/components/planner/tabs/ScopeTab.tsx v2.0
//
// PURPOSE:
// Scope & Pricing tab — powered by the scope-generation engine.
// Shows real computed data from layout_data:
//   - project summary
//   - layout breakdown (openings, modules, wall usage)
//   - scope output with grouped sections
//   - estimation summary (kitchen/wardrobe rules)
//   - actions: save scope, attach to lead/job, generate quote draft

'use client';

import { useState, useMemo, useCallback } from 'react';
import type { LayoutDocument } from '@/lib/planner/planner-types';
import { formatMM } from '@/lib/planner/planner-types';
import { generateScope, generateQuoteDraft } from '@/lib/planner/scope-engine';
import { currencySymbol as _curSym, formatCurrency as _fmtCur } from '@/lib/currency';
import type { ScopeOutput, QuoteDraft } from '@/lib/planner/scope-engine';

type Props = {
  layout: LayoutDocument;
  layoutName: string;
  layoutType: string;
  layoutId: string;
  leadId: string | null;
  jobId: string | null;
  accessToken: string | null;
};

export default function ScopeTab({
  layout,
  layoutName,
  layoutType,
  layoutId,
  leadId,
  jobId,
  accessToken,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft | null>(null);

  // Generate scope from live layout data
  const scope: ScopeOutput = useMemo(
    () => generateScope(layout, layoutName, layoutType),
    [layout, layoutName, layoutType],
  );

  const { room, openings, modules, placement, sections } = scope;

  // ─── Save scope as tool attachment ──────────────────────────────────────

  const handleSaveScope = useCallback(async (target: 'lead' | 'job' | 'scope') => {
    if (!accessToken) return;
    setSaving(true);
    setSaved(null);

    try {
      const targetLeadId = target === 'lead' ? leadId : null;
      const targetJobId = target === 'job' ? jobId : null;

      await fetch('/api/workspace/tool-attachments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool_type: 'layout_scope',
          tool_name: `Scope — ${layoutName}`,
          lead_id: targetLeadId,
          job_id: targetJobId,
          result_data: {
            layoutId,
            layoutName,
            layoutType,
            generatedAt: scope.generatedAt,
            room: scope.room,
            openings: { total: scope.openings.totalCount, doors: scope.openings.doors, windows: scope.openings.windows, obstacles: scope.openings.obstacles },
            modules: { total: scope.modules.totalCount, linearRunMM: scope.modules.totalLinearMM, estimatedCost: scope.modules.totalEstimatedCost, byCategory: scope.modules.byCategory },
            kitchen: scope.kitchen,
            wardrobe: scope.wardrobe,
            sections: scope.sections,
          },
        }),
      });
      setSaved(target === 'lead' ? 'Attached to lead' : target === 'job' ? 'Attached to job' : 'Scope saved');
    } catch {
      setSaved('Save failed');
    } finally {
      setSaving(false);
    }
  }, [accessToken, layoutId, layoutName, layoutType, leadId, jobId, scope]);

  // ─── Generate quote draft ──────────────────────────────────────────────

  const handleGenerateQuoteDraft = useCallback(async () => {
    const draft = generateQuoteDraft(layoutId, leadId, jobId, scope);
    setQuoteDraft(draft);

    // Also save as a tool attachment
    if (accessToken) {
      await fetch('/api/workspace/tool-attachments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool_type: 'quote_draft',
          tool_name: draft.title,
          lead_id: leadId,
          job_id: jobId,
          result_data: draft,
        }),
      }).catch(() => {});
    }
  }, [layoutId, leadId, jobId, scope, accessToken]);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Scope &amp; Pricing</h2>
          <p className="text-sm text-slate-500 mt-0.5">{layoutName} — {layoutType}</p>
          {(leadId || jobId) && (
            <div className="flex items-center gap-2 mt-1">
              {leadId && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  Linked to Lead
                </span>
              )}
              {jobId && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Linked to Job
                </span>
              )}
            </div>
          )}
        </div>
        <div className="text-right">
          {modules.totalEstimatedCost > 0 ? (
            <>
              <p className="text-2xl font-bold text-amber-600">{_fmtCur(modules.totalEstimatedCost)}</p>
              <p className="text-xs text-slate-400">Estimated unit cost</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-slate-400">—</p>
              <p className="text-xs text-slate-400">No pricing data</p>
            </>
          )}
        </div>
      </div>

      {/* 1. Project Summary */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>📐</span> Room Specification
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Width" value={formatMM(room.widthMM, 'm')} />
          <Stat label="Depth" value={formatMM(room.depthMM, 'm')} />
          <Stat label="Height" value={formatMM(room.heightMM, 'm')} />
          <Stat label="Perimeter" value={formatMM(room.perimeterMM, 'm')} />
          <Stat label="Floor Area" value={`${room.floorAreaM2}m²`} />
          <Stat label="Walls" value={String(room.wallCount)} />
          <Stat label="Openings" value={String(openings.totalCount)} />
          <Stat label="Modules" value={String(modules.totalCount)} />
        </div>
      </div>

      {/* 2. Layout Breakdown — Placement */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>🧱</span> Wall Usage
        </h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Stat label="Wall-assigned" value={String(placement.wallAssigned)} />
          <Stat label="Free-placed" value={String(placement.freePlaced)} />
        </div>
        {placement.openingsByWall.some((w) => w.openings > 0 || w.modules > 0) && (
          <div className="space-y-1">
            {placement.openingsByWall.map((w) => (
              (w.openings > 0 || w.modules > 0) ? (
                <div key={w.wallId} className="flex items-center justify-between py-1 text-sm border-t border-gray-50 first:border-0">
                  <span className="text-slate-700 font-medium">{w.wallLabel}</span>
                  <div className="flex gap-3 text-xs text-slate-500">
                    {w.modules > 0 && <span>{w.modules} module{w.modules !== 1 ? 's' : ''}</span>}
                    {w.openings > 0 && <span>{w.openings} opening{w.openings !== 1 ? 's' : ''}</span>}
                  </div>
                </div>
              ) : null
            ))}
          </div>
        )}
      </div>

      {/* 3. Scope Output — Generated Sections */}
      {sections.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-gray-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>📋</span> Scope Breakdown
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {sections.map((section, si) => (
              <div key={si} className="px-4 py-3">
                <h4 className="text-xs font-semibold text-slate-800 mb-2">{section.title}</h4>
                <div className="space-y-1">
                  {section.items.map((item, ii) => (
                    <div key={ii} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{item.label}</span>
                      <div className="text-right">
                        <span className="font-medium text-slate-900">{item.value}</span>
                        {item.note && <span className="ml-1.5 text-[10px] text-slate-400">{item.note}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Itemised Unit Schedule */}
      {modules.totalCount > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-gray-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏗️</span> Itemised Unit Schedule
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-400 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Unit</th>
                <th className="px-2 py-2 text-right font-medium">Dimensions</th>
                <th className="px-2 py-2 text-right font-medium">Wall</th>
                <th className="px-4 py-2 text-right font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {modules.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-2 text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{modules.byCategory.find((c) => c.category === item.category)?.categoryLabel?.charAt(0) || '•'}</span>
                      {item.label}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-slate-400 text-xs text-right whitespace-nowrap">
                    {formatMM(item.widthMM)} × {formatMM(item.depthMM)} × {formatMM(item.heightMM)}
                  </td>
                  <td className="px-2 py-2 text-slate-400 text-xs text-right whitespace-nowrap">
                    {item.wallLabel || 'Free'}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-800 whitespace-nowrap">
                    {item.unitPrice > 0 ? _fmtCur(item.unitPrice) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {modules.totalEstimatedCost > 0 && (
              <tfoot className="border-t border-gray-200 bg-gray-50/50">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-slate-700">Estimated Total</td>
                  <td className="px-4 py-2 text-right font-bold text-amber-600">
                    {_fmtCur(modules.totalEstimatedCost)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* 5. Openings Schedule */}
      {openings.totalCount > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-gray-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>🪟</span> Openings Schedule
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-400 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-left font-medium">Label</th>
                <th className="px-4 py-2 text-left font-medium">Wall</th>
                <th className="px-4 py-2 text-right font-medium">Size</th>
              </tr>
            </thead>
            <tbody>
              {openings.openings.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-2 capitalize text-slate-700">
                    {o.type === 'door' ? '🚪' : o.type === 'window' ? '🪟' : '⬛'} {o.type}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{o.label}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{o.wallLabel}</td>
                  <td className="px-4 py-2 text-right text-slate-400 text-xs">
                    {formatMM(o.widthMM)} × {formatMM(o.heightMM)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {modules.totalCount === 0 && openings.totalCount === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm text-slate-500">No modules or openings placed yet.</p>
          <p className="text-xs text-slate-400 mt-1">Design your layout first, then return here for scope and pricing.</p>
        </div>
      )}

      {/* 6. Actions */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <span>⚡</span> Actions
        </h3>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSaveScope('scope')}
            disabled={saving || modules.totalCount === 0}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Scope'}
          </button>

          {leadId && (
            <button
              onClick={() => handleSaveScope('lead')}
              disabled={saving || modules.totalCount === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Attach to Lead
            </button>
          )}

          {jobId && (
            <button
              onClick={() => handleSaveScope('job')}
              disabled={saving || modules.totalCount === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              Attach to Job
            </button>
          )}

          <button
            onClick={handleGenerateQuoteDraft}
            disabled={modules.totalCount === 0}
            className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            Generate Quote Draft
          </button>
        </div>

        {saved && (
          <p className="text-xs text-emerald-600 font-medium">{saved}</p>
        )}

        {!leadId && !jobId && (
          <p className="text-[10px] text-slate-400">
            Link this layout to a lead or job to enable CRM attachment.
          </p>
        )}
      </div>

      {/* Quote Draft Output */}
      {quoteDraft && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 shadow-sm p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-amber-900">{quoteDraft.title}</h3>
              <p className="text-[10px] text-amber-700 mt-0.5">
                Generated {new Date(quoteDraft.createdAt).toLocaleString()}
              </p>
            </div>
            {quoteDraft.estimatedTotal > 0 && (
              <p className="text-lg font-bold text-amber-800">{_fmtCur(quoteDraft.estimatedTotal)}</p>
            )}
          </div>

          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-amber-800 hover:underline">
              View full breakdown
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-[11px] text-amber-900/80 bg-white/60 rounded-lg p-3 border border-amber-200 max-h-64 overflow-y-auto font-mono">
              {quoteDraft.breakdownText}
            </pre>
          </details>

          <div className="flex items-center gap-2">
            {quoteDraft.leadId && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                Linked to Lead
              </span>
            )}
            {quoteDraft.jobId && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Linked to Job
              </span>
            )}
            <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              Saved as attachment
            </span>
          </div>

          <p className="text-[10px] text-amber-700">
            This is a structured quote draft. Full quote editing, client-facing output, and
            invoice generation will be available in the next phase.
          </p>
        </div>
      )}

      {/* Scope data note */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-center">
        <p className="text-[10px] text-slate-400">
          All scope data is computed from your live layout. Unit pricing sourced from the TISSCA Warehouse catalogue.
          Installation, worktops, and finishing costs are additional.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}
