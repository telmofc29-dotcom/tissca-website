// src/components/planner/QuoteSummary.tsx v4.0
//
// Professional quoting panel: summary, client form, profit/labour,
// generate quote, download PDF, save, and share.

'use client';

import { useState } from 'react';
import type { LayoutDocument, ModuleCategory } from '@/lib/planner/planner-types';
import { MODULE_CATEGORY_LABELS, formatMM } from '@/lib/planner/planner-types';
import {
  getModulePrice,
  formatPrice,
  generateQuote,
  type GeneratedQuote,
  type QuoteClient,
  type QuoteMargins,
} from '@/lib/planner/pricing';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { currencySymbol as _curSym } from '@/lib/currency';
import { isPro, type PlanTier } from '@/lib/plans';

type QuoteSummaryProps = {
  layout: LayoutDocument;
  layoutId?: string;
  layoutName?: string;
  accessToken?: string | null;
  leadId?: string | null;
  jobId?: string | null;
  /** Called after a quote is saved to the system (receives quote_id) */
  onQuoteSaved?: (quoteId: string) => void;
};

type CategorySummary = {
  category: ModuleCategory;
  label: string;
  count: number;
  totalWidthMM: number;
  costPence: number;
};

type QuoteView = 'summary' | 'client-form' | 'quote-detail';

export default function QuoteSummary({
  layout,
  layoutId,
  layoutName,
  accessToken,
  leadId,
  jobId,
  onQuoteSaved,
}: QuoteSummaryProps) {
  const { placedModules, room, openings } = layout;
  const { workspace } = useWorkspace();
  const userIsPro = isPro(workspace?.plan_tier as PlanTier | null);

  // ─── State ─────────────────────────────────────────────────────────────
  const [view, setView] = useState<QuoteView>('summary');
  const [quote, setQuote] = useState<GeneratedQuote | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Client form
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [projectName, setProjectName] = useState(layoutName || '');

  // Margins
  const [markupPercent, setMarkupPercent] = useState(20);
  const [labourPounds, setLabourPounds] = useState(0);

  // ─── Category breakdown ────────────────────────────────────────────────

  const categoryMap = new Map<ModuleCategory, CategorySummary>();
  placedModules.forEach((mod) => {
    const price = getModulePrice(mod);
    const existing = categoryMap.get(mod.category);
    if (existing) {
      existing.count++;
      existing.totalWidthMM += mod.width;
      existing.costPence += price;
    } else {
      categoryMap.set(mod.category, {
        category: mod.category,
        label: MODULE_CATEGORY_LABELS[mod.category] || mod.category,
        count: 1,
        totalWidthMM: mod.width,
        costPence: price,
      });
    }
  });

  const categories = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);
  const totalUnits = placedModules.length;
  const totalLinearMM = categories.reduce((sum, c) => sum + c.totalWidthMM, 0);
  const totalCostPence = categories.reduce((sum, c) => sum + c.costPence, 0);
  const maxCategoryCost = Math.max(...categories.map((c) => c.costPence), 1);

  // Per-wall
  const wallCostMap = new Map<string, { label: string; costPence: number; count: number }>();
  placedModules.forEach((mod) => {
    const wallId = mod.wall_id ?? '__free';
    const wall = room.walls.find((w) => w.id === wallId);
    const label = wall?.label ?? 'Free-standing';
    const existing = wallCostMap.get(wallId);
    const price = getModulePrice(mod);
    if (existing) { existing.costPence += price; existing.count++; }
    else { wallCostMap.set(wallId, { label, costPence: price, count: 1 }); }
  });
  const wallCosts = Array.from(wallCostMap.values()).sort((a, b) => b.costPence - a.costPence);
  const maxWallCost = Math.max(...wallCosts.map((w) => w.costPence), 1);

  // Live profit preview
  const markupPence = Math.round(totalCostPence * (markupPercent / 100));
  const labourPence = labourPounds * 100;
  const liveSellPrice = totalCostPence + markupPence + labourPence;
  const liveProfit = markupPence;

  const roomPerimeterMM = 2 * (room.width + room.depth);

  // ─── Handlers ──────────────────────────────────────────────────────────

  function handleGenerateQuote() {
    const client: QuoteClient | undefined = clientName.trim()
      ? { name: clientName.trim(), address: clientAddress.trim(), projectName: projectName.trim() }
      : undefined;
    const margins: QuoteMargins = { markupPercent, labourPence };
    const q = generateQuote(layout, { client, margins, layoutId, layoutName });
    setQuote(q);
    setView('quote-detail');
  }

  async function handleDownloadPdf() {
    if (!quote) return;
    setDownloadingPdf(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      const res = await fetch('/api/workspace/layout-quote-pdf', {
        method: 'POST',
        headers,
        body: JSON.stringify(quote),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'PDF generation failed' }));
        alert(err.error || 'PDF generation failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Layout-Quote-${new Date(quote.generatedAt).toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleSaveQuote() {
    if (!quote || !accessToken) return;
    setSavingQuote(true);
    setSaveStatus(null);
    try {
      // Save as tool attachment linked to lead/job
      const res = await fetch('/api/workspace/tool-attachments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool_type: 'layout_quote',
          tool_name: `Quote — ${quote.client?.projectName || layoutName || 'Layout'}`,
          lead_id: leadId || null,
          job_id: jobId || null,
          result_data: quote,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      setSaveStatus('Quote saved');
      if (onQuoteSaved && data.id) onQuoteSaved(data.id);
    } catch {
      setSaveStatus('Save failed');
    } finally {
      setSavingQuote(false);
    }
  }

  function handleShareWhatsApp() {
    if (!quote) return;
    const text = [
      `📋 Layout Quote — ${quote.client?.projectName || layoutName || 'Project'}`,
      quote.client?.name ? `Client: ${quote.client.name}` : '',
      `${quote.totalUnits} items | ${formatMM(quote.totalLinearMM, 'm')} linear`,
      `Materials: ${formatPrice(quote.totalPence)}`,
      quote.labourPence > 0 ? `Labour: ${formatPrice(quote.labourPence)}` : '',
      `Total: ${formatPrice(quote.sellPricePence)}`,
      `Generated: ${new Date(quote.generatedAt).toLocaleDateString('en-GB')}`,
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  const inputClass = 'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500';

  // ═══════════════════════════════════════════════════════════════════════
  // CLIENT FORM VIEW
  // ═══════════════════════════════════════════════════════════════════════

  if (view === 'client-form') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">Quote Details</h4>
          <button onClick={() => setView('summary')} className="text-[10px] text-slate-500 hover:text-slate-700">← Back</button>
        </div>

        {/* Client fields */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Client</p>
          <div>
            <label className="block text-[10px] text-slate-600 mb-0.5">Name</label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] text-slate-600 mb-0.5">Address</label>
            <textarea value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="Address" rows={2} className={inputClass + ' resize-y'} />
          </div>
          <div>
            <label className="block text-[10px] text-slate-600 mb-0.5">Project name</label>
            <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Kitchen Renovation" className={inputClass} />
          </div>
        </div>

        {/* Margins */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Pricing</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-slate-600 mb-0.5">Markup %</label>
              <input type="number" value={markupPercent} onChange={(e) => setMarkupPercent(Math.max(0, Number(e.target.value)))} min={0} max={200} className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 mb-0.5">Labour ({_curSym(null)})</label>
              <input type="number" value={labourPounds} onChange={(e) => setLabourPounds(Math.max(0, Number(e.target.value)))} min={0} step={50} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 space-y-1 text-xs">
          <div className="flex justify-between"><span className="text-slate-600">Materials</span><span className="font-medium">{formatPrice(totalCostPence)}</span></div>
          {labourPence > 0 && <div className="flex justify-between"><span className="text-slate-600">Labour</span><span className="font-medium">{formatPrice(labourPence)}</span></div>}
          {markupPence > 0 && <div className="flex justify-between"><span className="text-slate-600">Markup ({markupPercent}%)</span><span className="font-medium">{formatPrice(markupPence)}</span></div>}
          <div className="border-t border-slate-200 pt-1 flex justify-between font-semibold">
            <span className="text-slate-800">Sell price</span>
            <span className="text-emerald-700">{formatPrice(liveSellPrice)}</span>
          </div>
          {liveProfit > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Profit</span><span className="font-medium">{formatPrice(liveProfit)}</span>
            </div>
          )}
        </div>

        <button
          onClick={handleGenerateQuote}
          className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          📋 Generate Quote
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // QUOTE DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════════

  if (view === 'quote-detail' && quote) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">Generated Quote</h4>
          <button onClick={() => setView('summary')} className="text-[10px] text-slate-500 hover:text-slate-700">← Back</button>
        </div>
        <p className="text-[10px] text-slate-400">{new Date(quote.generatedAt).toLocaleString('en-GB')}</p>

        {/* Client info */}
        {quote.client && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
            <p className="font-medium text-slate-800">{quote.client.name}</p>
            {quote.client.address && <p className="text-slate-500 mt-0.5">{quote.client.address}</p>}
            {quote.client.projectName && <p className="text-slate-500 mt-0.5">Project: {quote.client.projectName}</p>}
          </div>
        )}

        {/* Line items table */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-700">Line Items</p>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-gray-50 text-slate-500">
                  <th className="text-left px-2 py-1.5 font-medium">Item</th>
                  <th className="text-right px-2 py-1.5 font-medium">Width</th>
                  <th className="text-right px-2 py-1.5 font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((item, i) => (
                  <tr key={item.moduleId} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-2 py-1 text-slate-700">
                      <div className="truncate max-w-[110px]">{item.label}</div>
                      <div className="text-[9px] text-slate-400">{item.material}</div>
                    </td>
                    <td className="text-right px-2 py-1 text-slate-500">{item.widthMM}mm</td>
                    <td className="text-right px-2 py-1 font-medium text-emerald-700">{formatPrice(item.lineTotalPence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category totals */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-700">By Category</p>
          {quote.categories.map((cat) => (
            <div key={cat.category} className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-600">{cat.categoryLabel} <span className="text-slate-400">×{cat.count}</span></span>
              <span className="font-medium text-emerald-700">{formatPrice(cat.totalPence)}</span>
            </div>
          ))}
        </div>

        {/* Totals + profit */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-800">Materials</span>
            <span className="font-medium text-emerald-800">{formatPrice(quote.totalPence)}</span>
          </div>
          {quote.labourPence > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-800">Labour</span>
              <span className="font-medium text-emerald-800">{formatPrice(quote.labourPence)}</span>
            </div>
          )}
          {quote.markupPence > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-800">Markup ({quote.margins?.markupPercent}%)</span>
              <span className="font-medium text-emerald-800">{formatPrice(quote.markupPence)}</span>
            </div>
          )}
          <div className="border-t border-emerald-200 mt-1 pt-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900">Sell Price</span>
            <span className="text-base font-bold text-emerald-700">{formatPrice(quote.sellPricePence)}</span>
          </div>
          {quote.profitPence > 0 && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-emerald-600">Profit</span>
              <span className="font-semibold text-emerald-600">{formatPrice(quote.profitPence)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-[10px] text-emerald-600">
            <span>{quote.totalUnits} units</span>
            <span>{formatMM(quote.totalLinearMM, 'm')} linear</span>
          </div>
        </div>

        {/* Actions: Download / Save / Share */}
        <div className="space-y-1.5">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {downloadingPdf ? 'Generating PDF…' : '📄 Download PDF'}
          </button>

          {accessToken && (
            <button
              onClick={handleSaveQuote}
              disabled={savingQuote}
              className="w-full rounded-lg bg-amber-500 py-2 text-xs font-semibold text-white hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50"
            >
              {savingQuote ? 'Saving…' : '💾 Save Quote'}
            </button>
          )}

          <div className="flex gap-1.5">
            <button
              onClick={() => {
                if (!userIsPro) { alert('Sharing requires a Pro or Team plan.'); return; }
                handleShareWhatsApp();
              }}
              className="flex-1 rounded-lg border border-green-300 bg-green-50 py-1.5 text-[10px] font-medium text-green-700 hover:bg-green-100 transition-colors"
            >
              WhatsApp
            </button>
            <button
              onClick={() => {
                if (!userIsPro) { alert('Sharing requires a Pro or Team plan.'); return; }
                if (!quote) return;
                const subject = encodeURIComponent(`Quote — ${quote.client?.projectName || layoutName || 'Layout'}`);
                const body = encodeURIComponent([
                  `Hi ${quote.client?.name || ''},`,
                  '',
                  `Please find your layout quote below:`,
                  `${quote.totalUnits} items | ${formatMM(quote.totalLinearMM, 'm')} linear`,
                  `Total: ${formatPrice(quote.sellPricePence)}`,
                  '',
                  'Full PDF available on request.',
                  '',
                  'Kind regards,',
                  'TISSCA',
                ].join('\n'));
                window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
              }}
              className="flex-1 rounded-lg border border-blue-300 bg-blue-50 py-1.5 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Email
            </button>
          </div>

          {saveStatus && (
            <p className={`text-[10px] text-center ${saveStatus.includes('fail') ? 'text-red-500' : 'text-emerald-600'}`}>{saveStatus}</p>
          )}
        </div>

        <p className="text-[9px] text-slate-400 text-center">
          Estimated pricing. Subject to site survey and final specification.
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN SUMMARY VIEW
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Layout Summary</h4>
        <p className="text-xs text-slate-500 mt-0.5">Quote-ready overview of placed items</p>
      </div>

      {/* Room info */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 space-y-1">
        <p className="text-xs font-medium text-slate-700">Room</p>
        <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
          <span>Dimensions:</span>
          <span className="text-right font-medium">{formatMM(room.width)} × {formatMM(room.depth)}</span>
          <span>Height:</span>
          <span className="text-right font-medium">{formatMM(room.height)}</span>
          <span>Perimeter:</span>
          <span className="text-right font-medium">{formatMM(roomPerimeterMM)}</span>
          <span>Openings:</span>
          <span className="text-right font-medium">{openings.length}</span>
        </div>
      </div>

      {totalUnits === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center">
          <p className="text-xs text-slate-500">No modules placed yet.</p>
          <p className="text-[10px] text-slate-400 mt-1">Drag items from the library to get started.</p>
        </div>
      ) : (
        <>
          {/* Category breakdown with cost bars */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-700">Placed Items</p>
            {categories.map((cat) => (
              <div key={cat.category} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-800">{cat.label}</span>
                  <span className="text-xs font-semibold text-slate-900">×{cat.count}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Linear: {formatMM(cat.totalWidthMM)}</span>
                  <span className="font-medium text-emerald-700">{formatPrice(cat.costPence)}</span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.round((cat.costPence / maxCategoryCost) * 100)}%`,
                      backgroundColor: cat.costPence === maxCategoryCost ? '#dc2626' : '#10b981',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Wall costs */}
          {wallCosts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-700">Cost by Wall</p>
              {wallCosts.map((wc) => (
                <div key={wc.label} className="rounded px-2 py-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">{wc.label} <span className="text-slate-400">(×{wc.count})</span></span>
                    <span className="font-medium text-emerald-700">{formatPrice(wc.costPence)}</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400 transition-all duration-300" style={{ width: `${Math.round((wc.costPence / maxWallCost) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-900">Total units</span>
              <span className="text-sm font-bold text-amber-900">{totalUnits}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-900">Total linear</span>
              <span className="text-sm font-bold text-amber-900">{formatMM(totalLinearMM, 'm')}</span>
            </div>
            <div className="border-t border-amber-200 mt-1 pt-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900">Materials cost</span>
              <span className="text-sm font-bold text-emerald-700">{formatPrice(totalCostPence)}</span>
            </div>
            <p className="text-[9px] text-amber-700/70">Based on default catalogue prices. Actual costs may vary.</p>
          </div>

          {/* Generate Quote button */}
          <button
            onClick={() => setView('client-form')}
            className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
          >
            📋 Generate Quote
          </button>

          {/* Quick item list */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-700">All Items</p>
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {placedModules.map((mod, i) => (
                <div key={mod.id} className="flex items-center justify-between rounded px-2 py-1 text-xs odd:bg-gray-50">
                  <span className="text-slate-700 truncate max-w-[120px]">{i + 1}. {mod.label}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-slate-400">{mod.width}mm</span>
                    <span className="text-emerald-700 font-medium">{formatPrice(getModulePrice(mod))}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
