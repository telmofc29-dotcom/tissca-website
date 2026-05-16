// src/components/planner/PlannerToolbar.tsx v1.0
//
// PURPOSE:
// Top toolbar for the planner — layout name, type, save/autosave status,
// undo placeholder, zoom controls, and canvas toggles.
//
// FUTURE:
// - Undo/redo stack
// - Export as PDF / image
// - Share layout link
// - Print layout
// - 3D preview toggle

'use client';

import type { LayoutDocument } from '@/lib/planner/planner-types';
import { LAYOUT_TYPE_LABELS } from '@/lib/planner/planner-types';

type PlannerToolbarProps = {
  layoutName: string;
  layoutType: string;
  saving: boolean;
  lastSaved: string | null;
  onSave: () => void;
  layout: LayoutDocument;
  onZoom: (delta: number) => void;
  onToggleGrid: () => void;
  onToggleDimensions: () => void;
  onBack: () => void;
};

export default function PlannerToolbar({
  layoutName,
  layoutType,
  saving,
  lastSaved,
  onSave,
  layout,
  onZoom,
  onToggleGrid,
  onToggleDimensions,
  onBack,
}: PlannerToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
      {/* Left: back + name */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 truncate">{layoutName}</h2>
          <p className="text-[10px] text-slate-500">{LAYOUT_TYPE_LABELS[layoutType] || layoutType} layout</p>
        </div>
      </div>

      {/* Center: canvas controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onZoom(-0.1)}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-slate-700 hover:bg-gray-50"
          title="Zoom out"
        >
          −
        </button>
        <span className="text-xs text-slate-600 w-10 text-center">
          {Math.round(layout.viewSettings.zoom * 100)}%
        </span>
        <button
          onClick={() => onZoom(0.1)}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-slate-700 hover:bg-gray-50"
          title="Zoom in"
        >
          +
        </button>
        <div className="mx-1 h-4 border-l border-gray-200" />
        <button
          onClick={onToggleGrid}
          className={`rounded-lg border px-2 py-1 text-xs transition-colors ${
            layout.viewSettings.showGrid
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-gray-200 text-slate-600 hover:bg-gray-50'
          }`}
          title="Toggle grid"
        >
          Grid
        </button>
        <button
          onClick={onToggleDimensions}
          className={`rounded-lg border px-2 py-1 text-xs transition-colors ${
            layout.viewSettings.showDimensions
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-gray-200 text-slate-600 hover:bg-gray-50'
          }`}
          title="Toggle dimensions"
        >
          Dims
        </button>
      </div>

      {/* Right: save */}
      <div className="flex items-center gap-2">
        {lastSaved && (
          <span className="text-[10px] text-slate-400">
            Saved {new Date(lastSaved).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
