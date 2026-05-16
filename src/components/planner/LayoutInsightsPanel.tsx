// src/components/planner/LayoutInsightsPanel.tsx
//
// Lightweight "Layout Insights" panel for the scan-to-layout editor.
// Shows gap warnings, filler suggestions, alignment issues, and a quality score.
// Actionable: provides "Fix gap" and "Auto-fill wall" buttons with ghost preview.

'use client';

import { useMemo, useState } from 'react';
import type { LayoutDocument, PlacedModule } from '@/lib/planner/planner-types';
import { generateId } from '@/lib/planner/planner-types';
import { analyzeLayout } from '@/spatial/layoutIntelligence';
import type { LayoutInsight, InsightSeverity } from '@/spatial/layoutIntelligence';
import { analyzeGapsForWall, autoFillWall } from '@/spatial/gapAutoFill';
import type { FillOption } from '@/spatial/gapAutoFill';
import { suggestOptimisations, formatPrice } from '@/lib/planner/pricing';

type Props = {
  layout: LayoutDocument;
  /** Apply a list of new modules to the layout */
  onApplyModules?: (modules: PlacedModule[]) => void;
  /** Apply a category change to an existing module for cost optimisation */
  onOptimiseModule?: (moduleId: string, newCategory: import('@/lib/planner/planner-types').ModuleCategory) => void;
};

/** Module preview awaiting user confirmation */
type GhostPreview = {
  type: 'gap' | 'wall';
  wallId: string;
  modules: PlacedModule[];
};

const SEVERITY_ICON: Record<InsightSeverity, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '🔴',
};

const SEVERITY_BG: Record<InsightSeverity, string> = {
  info: 'bg-slate-50 border-slate-200',
  warning: 'bg-amber-50 border-amber-200',
  error: 'bg-red-50 border-red-200',
};

const SEVERITY_TEXT: Record<InsightSeverity, string> = {
  info: 'text-slate-700',
  warning: 'text-amber-800',
  error: 'text-red-800',
};

export default function LayoutInsightsPanel({ layout, onApplyModules, onOptimiseModule }: Props) {
  const [ghostPreview, setGhostPreview] = useState<GhostPreview | null>(null);
  const [showOptimisations, setShowOptimisations] = useState(false);

  const analysis = useMemo(() => {
    if (layout.placedModules.length === 0) return null;
    return analyzeLayout(layout);
  }, [layout]);

  // Compute per-wall gap suggestions for actionable buttons
  const wallSuggestions = useMemo(() => {
    if (!analysis) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const wa of analysis.walls) {
      const gapCount = wa.gaps.filter((g) => g.classification !== 'ignore').length;
      if (gapCount > 0) counts.set(wa.wall_id, gapCount);
    }
    return counts;
  }, [analysis]);

  // Cost optimisation suggestions
  const optimisations = useMemo(
    () => suggestOptimisations(layout.placedModules),
    [layout.placedModules],
  );
  const totalSaving = optimisations.reduce((s, o) => s + o.savingPence, 0);

  const handleFixGap = (wallId: string) => {
    const wall = layout.room.walls.find((w) => w.id === wallId);
    if (!wall) return;
    const suggestions = analyzeGapsForWall(layout.placedModules, wall);
    if (suggestions.length === 0) return;
    // Take top suggestion per gap, build preview modules
    const previewModules: PlacedModule[] = [];
    for (const s of suggestions) {
      const best = s.options[0];
      if (!best) continue;
      previewModules.push(fillOptionToModule(best, wallId));
    }
    setGhostPreview({ type: 'gap', wallId, modules: previewModules });
  };

  const handleAutoFillWall = (wallId: string) => {
    const wall = layout.room.walls.find((w) => w.id === wallId);
    if (!wall) return;
    const filled = autoFillWall(layout.placedModules, wall);
    if (filled.length === 0) return;
    setGhostPreview({ type: 'wall', wallId, modules: filled });
  };

  const confirmPreview = () => {
    if (!ghostPreview || !onApplyModules) return;
    onApplyModules(ghostPreview.modules);
    setGhostPreview(null);
  };

  const cancelPreview = () => setGhostPreview(null);

  if (!analysis) {
    return (
      <div className="px-3 py-4 text-center text-xs text-slate-400">
        Place modules to see layout insights.
      </div>
    );
  }

  const { insights, score, summary } = analysis;
  const warnings = insights.filter((i) => i.severity === 'warning' || i.severity === 'error');
  const infos = insights.filter((i) => i.severity === 'info');

  return (
    <div className="flex flex-col gap-3 text-sm">
      {/* Score + summary */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <div>
          <span className="text-xs font-medium text-slate-500">Layout Score</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-bold ${
              score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {score}
            </span>
            <span className="text-xs text-slate-400">/100</span>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500 space-y-0.5">
          <p>{summary.totalModules} module{summary.totalModules !== 1 ? 's' : ''}</p>
          <p>{Math.round(summary.avgUtilisation * 100)}% wall use</p>
        </div>
      </div>

      {/* Gap summary bar */}
      {summary.totalGaps > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="font-medium">{summary.totalGaps} gap{summary.totalGaps !== 1 ? 's' : ''}:</span>
          {summary.warningGaps > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-red-700 font-medium">
              {summary.warningGaps} bad
            </span>
          )}
          {summary.fillerGaps > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700 font-medium">
              {summary.fillerGaps} filler
            </span>
          )}
          {summary.availableGaps > 0 && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-600 font-medium">
              {summary.availableGaps} open
            </span>
          )}
        </div>
      )}

      {/* Ghost preview confirmation */}
      {ghostPreview && (
        <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">👻</span>
            <span className="text-xs font-semibold text-emerald-800">
              Preview: {ghostPreview.modules.length} module{ghostPreview.modules.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1 mb-2.5">
            {ghostPreview.modules.map((mod) => (
              <div key={mod.id} className="flex items-center justify-between text-[11px] text-emerald-700">
                <span className="truncate">{mod.label}</span>
                <span className="shrink-0 ml-1">{mod.width}mm</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmPreview}
              className="flex-1 rounded-md bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              ✓ Apply
            </button>
            <button
              onClick={cancelPreview}
              className="flex-1 rounded-md border border-emerald-300 py-1.5 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Per-wall actions */}
      {onApplyModules && wallSuggestions.size > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Wall Actions</span>
          {layout.room.walls
            .filter((w) => wallSuggestions.has(w.id))
            .map((wall) => (
              <div key={wall.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2.5 py-1.5">
                <span className="text-xs text-slate-700 font-medium">{wall.label}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleFixGap(wall.id)}
                    className="rounded px-2 py-1 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    Fix gaps
                  </button>
                  <button
                    onClick={() => handleAutoFillWall(wall.id)}
                    className="rounded px-2 py-1 text-[10px] font-medium text-purple-600 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
                  >
                    Auto-fill
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Warnings first */}
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Issues</span>
          {warnings.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onFix={onApplyModules && insight.wall_id ? () => handleFixGap(insight.wall_id!) : undefined}
            />
          ))}
        </div>
      )}

      {/* Info items */}
      {infos.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Suggestions</span>
          {infos.slice(0, 6).map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onFix={onApplyModules && insight.wall_id ? () => handleFixGap(insight.wall_id!) : undefined}
            />
          ))}
          {infos.length > 6 && (
            <p className="text-[10px] text-slate-400 pl-1">+{infos.length - 6} more</p>
          )}
        </div>
      )}

      {/* Cost optimisation suggestions */}
      {optimisations.length > 0 && (
        <div className="space-y-1.5">
          <button
            onClick={() => setShowOptimisations(!showOptimisations)}
            className="flex items-center justify-between w-full"
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Cost Optimisation
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">
              Save {formatPrice(totalSaving)} {showOptimisations ? '▴' : '▾'}
            </span>
          </button>
          {showOptimisations && (
            <div className="space-y-1">
              {optimisations.map((opt) => (
                <div key={`${opt.moduleId}-${opt.suggestedCategory}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                  <div className="flex items-start gap-1.5">
                    <span className="text-xs mt-0.5 shrink-0">💡</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium text-emerald-800 truncate">{opt.moduleLabel}</p>
                      <p className="text-[9px] text-emerald-600 mt-0.5">{opt.reason}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        {formatPrice(opt.currentPricePence)} → {formatPrice(opt.suggestedPricePence)}
                        <span className="text-emerald-700 font-medium ml-1">
                          (save {formatPrice(opt.savingPence)})
                        </span>
                      </p>
                    </div>
                    {onOptimiseModule && (
                      <button
                        onClick={() => onOptimiseModule(opt.moduleId, opt.suggestedCategory)}
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 bg-emerald-100 border border-emerald-300 hover:bg-emerald-200 mt-0.5 transition-colors"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All clear */}
      {insights.length === 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 text-center">
          ✓ No issues detected. Layout looks good.
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight, onFix }: { insight: LayoutInsight; onFix?: () => void }) {
  return (
    <div className={`rounded-lg border px-2.5 py-2 ${SEVERITY_BG[insight.severity]}`}>
      <div className="flex items-start gap-1.5">
        <span className="text-xs mt-0.5 shrink-0">{SEVERITY_ICON[insight.severity]}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium ${SEVERITY_TEXT[insight.severity]}`}>{insight.title}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{insight.description}</p>
          {insight.suggestion && (
            <p className="text-[10px] text-slate-600 mt-1 italic">💡 {insight.suggestion}</p>
          )}
        </div>
        {onFix && (
          <button
            onClick={onFix}
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 mt-0.5 transition-colors"
          >
            Fix
          </button>
        )}
      </div>
    </div>
  );
}

/** Convert a FillOption into a PlacedModule stub for preview/placement */
function fillOptionToModule(option: FillOption, wallId: string): PlacedModule {
  return {
    id: generateId('mod'),
    category: option.category,
    label: option.label,
    position: option.position,
    width: option.width,
    depth: option.depth,
    height: option.height,
    rotation: option.rotation,
    wall_id: wallId,
    color: option.color,
    notes: 'Auto-filled',
  };
}
