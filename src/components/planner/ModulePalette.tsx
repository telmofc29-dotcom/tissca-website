// src/components/planner/ModulePalette.tsx v1.0
//
// PURPOSE:
// Left sidebar library panel showing available modules to drag into the canvas.
// Grouped by category. Also includes room setup controls (dimensions, openings).
//
// ARCHITECTURE:
// - Drag source: each template starts a drag with its template ID
// - Room controls: width/depth/height inputs update the room shape
// - Openings section: add door/window/obstacle to a selected wall
//
// FUTURE:
// - Custom module creation (user-defined widths/depths)
// - Favourites / recently used
// - Search/filter modules
// - Import module from material catalogue
// - LiDAR scan import button (clearly separated future action)

'use client';

import { useState } from 'react';
import type {
  LayoutDocument,
  Opening,
  OpeningType,
  ModuleCategory,
} from '@/lib/planner/planner-types';
import {
  MODULE_TEMPLATES,
  MODULE_CATEGORY_LABELS,
  generateId,
} from '@/lib/planner/planner-types';

type ModulePaletteProps = {
  layout: LayoutDocument;
  onUpdateRoom: (width: number, depth: number, height: number) => void;
  onAddOpening: (opening: Opening) => void;
  onSetDragTemplate: (templateId: string | null) => void;
  onResetCanvas: () => void;
};

const OPENING_TYPES: { value: OpeningType; label: string }[] = [
  { value: 'door', label: 'Door' },
  { value: 'window', label: 'Window' },
  { value: 'obstacle', label: 'Fixed Obstacle' },
];

export default function ModulePalette({
  layout,
  onUpdateRoom,
  onAddOpening,
  onSetDragTemplate,
  onResetCanvas,
}: ModulePaletteProps) {
  const [expandedCategory, setExpandedCategory] = useState<ModuleCategory | null>('base_cabinet');
  const [showRoomSetup, setShowRoomSetup] = useState(false);
  const [showOpeningForm, setShowOpeningForm] = useState(false);

  // Room dimension inputs
  const [roomWidth, setRoomWidth] = useState(String(layout.room.width));
  const [roomDepth, setRoomDepth] = useState(String(layout.room.depth));
  const [roomHeight, setRoomHeight] = useState(String(layout.room.height));

  // Opening form
  const [openingType, setOpeningType] = useState<OpeningType>('door');
  const [openingWall, setOpeningWall] = useState(layout.room.walls[0]?.id || '');
  const [openingLabel, setOpeningLabel] = useState('');
  const [openingOffset, setOpeningOffset] = useState('500');
  const [openingWidth, setOpeningWidth] = useState('900');

  // ─── Room update ──────────────────────────────────────────────────────

  function handleRoomUpdate() {
    const w = Math.max(500, Math.min(20000, parseInt(roomWidth) || 3600));
    const d = Math.max(500, Math.min(20000, parseInt(roomDepth) || 3000));
    const h = Math.max(2000, Math.min(4000, parseInt(roomHeight) || 2400));
    setRoomWidth(String(w));
    setRoomDepth(String(d));
    setRoomHeight(String(h));
    onUpdateRoom(w, d, h);
  }

  // ─── Opening add ─────────────────────────────────────────────────────

  function handleAddOpening() {
    const opening: Opening = {
      id: generateId('opening'),
      type: openingType,
      wall_id: openingWall || layout.room.walls[0]?.id || '',
      label: openingLabel.trim() || `${openingType.charAt(0).toUpperCase() + openingType.slice(1)}`,
      offset: parseInt(openingOffset) || 500,
      width: parseInt(openingWidth) || 900,
      height: openingType === 'door' ? 2040 : openingType === 'window' ? 1200 : 600,
      elevation: openingType === 'window' ? 900 : 0,
    };
    onAddOpening(opening);
    setOpeningLabel('');
    setShowOpeningForm(false);
  }

  // ─── Drag handlers ───────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, templateId: string) {
    e.dataTransfer.setData('text/plain', templateId);
    e.dataTransfer.effectAllowed = 'copy';
    onSetDragTemplate(templateId);
  }

  function handleDragEnd() {
    onSetDragTemplate(null);
  }

  // ─── Group templates by category ──────────────────────────────────────

  const grouped = MODULE_TEMPLATES.reduce<Record<string, typeof MODULE_TEMPLATES>>((acc, t) => {
    const key = t.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500';

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Library</h3>
        <p className="text-xs text-slate-500 mt-0.5">Drag modules into the canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* ─── Room Setup ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setShowRoomSetup(!showRoomSetup)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-900 hover:bg-gray-50 transition-colors"
          >
            <span>🏠 Room Setup</span>
            <span className="text-xs text-slate-400">{showRoomSetup ? '−' : '+'}</span>
          </button>
          {showRoomSetup && (
            <div className="border-t border-gray-100 px-3 py-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-600 mb-0.5">Width (mm)</label>
                  <input type="number" value={roomWidth} onChange={(e) => setRoomWidth(e.target.value)} className={inputClass} min={500} max={20000} step={100} />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-0.5">Depth (mm)</label>
                  <input type="number" value={roomDepth} onChange={(e) => setRoomDepth(e.target.value)} className={inputClass} min={500} max={20000} step={100} />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-0.5">Height (mm)</label>
                  <input type="number" value={roomHeight} onChange={(e) => setRoomHeight(e.target.value)} className={inputClass} min={2000} max={4000} step={100} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRoomUpdate}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
                >
                  Apply dimensions
                </button>
                <button
                  onClick={onResetCanvas}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-gray-50 transition-colors"
                >
                  Reset canvas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Openings ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setShowOpeningForm(!showOpeningForm)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-900 hover:bg-gray-50 transition-colors"
          >
            <span>🚪 Openings &amp; Fixed</span>
            <span className="text-xs text-slate-400">{showOpeningForm ? '−' : '+'}</span>
          </button>
          {showOpeningForm && (
            <div className="border-t border-gray-100 px-3 py-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-600 mb-0.5">Type</label>
                  <select value={openingType} onChange={(e) => setOpeningType(e.target.value as OpeningType)} className={inputClass}>
                    {OPENING_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-0.5">Wall</label>
                  <select value={openingWall} onChange={(e) => setOpeningWall(e.target.value)} className={inputClass}>
                    {layout.room.walls.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-0.5">Label (optional)</label>
                <input type="text" value={openingLabel} onChange={(e) => setOpeningLabel(e.target.value)} placeholder="e.g. Main door" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-600 mb-0.5">Offset (mm)</label>
                  <input type="number" value={openingOffset} onChange={(e) => setOpeningOffset(e.target.value)} className={inputClass} min={0} step={50} />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-0.5">Width (mm)</label>
                  <input type="number" value={openingWidth} onChange={(e) => setOpeningWidth(e.target.value)} className={inputClass} min={100} step={50} />
                </div>
              </div>
              <button
                onClick={handleAddOpening}
                className="w-full rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
              >
                Add {openingType}
              </button>
            </div>
          )}
          {layout.openings.length > 0 && (
            <div className="border-t border-gray-100 px-3 py-2 space-y-1">
              {layout.openings.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-xs text-slate-600">
                  <span>{o.label} ({o.type})</span>
                  <span className="text-slate-400">{o.width}mm</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Module Categories ───────────────────────────────────────── */}
        {Object.entries(grouped).map(([category, templates]) => (
          <div key={category} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => setExpandedCategory(expandedCategory === category as ModuleCategory ? null : category as ModuleCategory)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-900 hover:bg-gray-50 transition-colors"
            >
              <span>{MODULE_CATEGORY_LABELS[category as ModuleCategory] || category}</span>
              <span className="flex items-center gap-1.5">
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-slate-500">{templates.length}</span>
                <span className="text-xs text-slate-400">{expandedCategory === category ? '−' : '+'}</span>
              </span>
            </button>
            {expandedCategory === category && (
              <div className="border-t border-gray-100 px-2 py-2 space-y-1">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, tpl.id)}
                    onDragEnd={handleDragEnd}
                    className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-sm cursor-grab hover:border-amber-300 hover:bg-amber-50/50 active:cursor-grabbing transition-colors"
                  >
                    <div
                      className="h-5 w-5 rounded border border-gray-300 shrink-0"
                      style={{ backgroundColor: tpl.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{tpl.label}</p>
                      <p className="text-[10px] text-slate-500">{tpl.defaultWidth}×{tpl.defaultDepth}mm</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* ─── Scan Import Placeholder ─────────────────────────────────── */}
        {/*
          FUTURE: LiDAR scan import from iPhone/iPad
          When implemented, this section will provide:
          - "Import from scan" button → opens native file picker or deep-link to mobile app
          - Parses scan geometry → populates room.walls + openings
          - Stores scan provenance in LayoutDocument.scanImport
          DO NOT FAKE — this is clearly a future capability.
        */}
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 px-3 py-3">
          <p className="text-xs font-medium text-slate-500">📱 Scan Import</p>
          <p className="text-[10px] text-slate-400 mt-1">
            iPhone/iPad LiDAR room scanning will be available in a future update. Scanned room geometry will auto-populate this planner.
          </p>
        </div>
      </div>
    </div>
  );
}
