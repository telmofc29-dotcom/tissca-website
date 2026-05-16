// src/components/planner/InspectorPanel.tsx v1.0
//
// PURPOSE:
// Right-side properties inspector — shows editable properties for the selected
// placed module or opening. When nothing is selected, shows a hint.

'use client';

import type { PlacedModule, Opening, ModuleRelationship, Point2D } from '@/lib/planner/planner-types';
import { MODULE_CATEGORY_LABELS } from '@/lib/planner/planner-types';
import { alignModules, distributeModules } from '@/spatial/alignmentTools';
import { ALL_MATERIALS, MATERIAL_LABELS, getModulePrice, formatPrice } from '@/lib/planner/pricing';
import type { AlignAction, DistributeAction } from '@/spatial/alignmentTools';
import type { WarehouseItemOverride } from '@/lib/warehouse/warehouse-overrides';

const REL_TYPE_LABELS: Record<string, string> = {
  attached_to: 'Attached to',
  hosted_by: 'Hosted by',
  spans_over: 'Spans over',
  grouped_with: 'Grouped with',
};

const REL_TYPE_COLORS: Record<string, string> = {
  attached_to: 'text-amber-600 bg-amber-50 border-amber-200',
  hosted_by: 'text-purple-600 bg-purple-50 border-purple-200',
  spans_over: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  grouped_with: 'text-gray-600 bg-gray-50 border-gray-200',
};

type InspectorPanelProps = {
  selectedModule: PlacedModule | null;
  selectedOpening: Opening | null;
  onUpdateModule: (id: string, updates: Partial<PlacedModule>) => void;
  onDeleteModule: (id: string) => void;
  onDuplicateModule: (id: string) => void;
  onUpdateOpening: (id: string, updates: Partial<Opening>) => void;
  onDeleteOpening: (id: string) => void;
  walls: { id: string; label: string }[];
  relationships?: ModuleRelationship[];
  allModules?: PlacedModule[];
  onDetachRelationship?: (relationshipId: string) => void;
  /** Reassign an appliance to a different host module */
  onReassignHost?: (applianceId: string, newHostId: string) => void;
  selectedModules?: PlacedModule[];
  /** Callback to apply bulk position changes from alignment tools */
  onBulkMoveModules?: (positions: Map<string, Point2D>) => void;
  /** Save current item's values as the user's warehouse default */
  onSaveWarehouseDefault?: (assetId: string, override: WarehouseItemOverride) => void;
  /** Reset warehouse item back to system default */
  onResetWarehouseDefault?: (assetId: string) => void;
  /** Whether the selected module's warehouse asset has user overrides */
  hasWarehouseOverride?: boolean;
};

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500';

/** Surface appliance labels (hob, sink, etc.) */
const SURFACE_LABELS = ['hob', 'sink', 'cooktop', 'induction'];
/** Housed appliance labels (oven, dishwasher, etc.) */
const HOUSED_LABELS = ['oven', 'microwave', 'dishwasher', 'washing', 'fridge', 'freezer'];

function isApplianceModule(mod: PlacedModule): boolean {
  const lbl = mod.label.toLowerCase();
  return SURFACE_LABELS.some((k) => lbl.includes(k)) || HOUSED_LABELS.some((k) => lbl.includes(k));
}

export default function InspectorPanel({
  selectedModule,
  selectedOpening,
  onUpdateModule,
  onDeleteModule,
  onDuplicateModule,
  onUpdateOpening,
  onDeleteOpening,
  walls,
  relationships,
  allModules,
  onDetachRelationship,
  onReassignHost,
  selectedModules,
  onBulkMoveModules,
  onSaveWarehouseDefault,
  onResetWarehouseDefault,
  hasWarehouseOverride,
}: InspectorPanelProps) {
  // ─── Multi-select summary ──────────────────────────────────────────────

  if (selectedModules && selectedModules.length > 1) {
    const handleAlign = (action: AlignAction) => {
      if (!onBulkMoveModules) return;
      const result = alignModules(selectedModules, action);
      onBulkMoveModules(result.positions);
    };

    const handleDistribute = (action: DistributeAction) => {
      if (!onBulkMoveModules) return;
      const result = distributeModules(selectedModules, action);
      onBulkMoveModules(result.positions);
    };

    // Compute grouped properties
    const categories = [...new Set(selectedModules.map((m) => m.category))];
    const walls = [...new Set(selectedModules.map((m) => m.wall_id).filter(Boolean))];
    const totalWidth = selectedModules.reduce((s, m) => s + m.width, 0);

    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">
            {selectedModules.length} items selected
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Shift+click to add/remove items
          </p>
        </div>

        {/* Grouped properties summary */}
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Categories</span>
            <span className="text-slate-700 font-medium">{categories.length === 1 ? (MODULE_CATEGORY_LABELS[categories[0]] || categories[0]) : `${categories.length} types`}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Total width</span>
            <span className="text-slate-700 font-medium">{totalWidth}mm</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Walls</span>
            <span className="text-slate-700 font-medium">{walls.length === 0 ? 'Free' : walls.length === 1 ? '1 wall' : `${walls.length} walls`}</span>
          </div>
        </div>

        {/* Alignment tools */}
        {onBulkMoveModules && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Align</label>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={() => handleAlign('left')} className="rounded-md border border-gray-200 py-1.5 text-[11px] text-slate-600 hover:bg-gray-50" title="Align left">
                ◧ Left
              </button>
              <button onClick={() => handleAlign('center')} className="rounded-md border border-gray-200 py-1.5 text-[11px] text-slate-600 hover:bg-gray-50" title="Align centre">
                ⊞ Centre
              </button>
              <button onClick={() => handleAlign('right')} className="rounded-md border border-gray-200 py-1.5 text-[11px] text-slate-600 hover:bg-gray-50" title="Align right">
                ◨ Right
              </button>
              <button onClick={() => handleAlign('top')} className="rounded-md border border-gray-200 py-1.5 text-[11px] text-slate-600 hover:bg-gray-50" title="Align top">
                ⊤ Top
              </button>
              <button onClick={() => handleAlign('middle')} className="rounded-md border border-gray-200 py-1.5 text-[11px] text-slate-600 hover:bg-gray-50" title="Align middle">
                ⊟ Middle
              </button>
              <button onClick={() => handleAlign('bottom')} className="rounded-md border border-gray-200 py-1.5 text-[11px] text-slate-600 hover:bg-gray-50" title="Align bottom">
                ⊥ Bottom
              </button>
            </div>
            {selectedModules.length >= 3 && (
              <>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 mt-3">Distribute</label>
                <div className="grid grid-cols-2 gap-1">
                  <button onClick={() => handleDistribute('horizontal')} className="rounded-md border border-gray-200 py-1.5 text-[11px] text-slate-600 hover:bg-gray-50">
                    ⇔ Horizontal
                  </button>
                  <button onClick={() => handleDistribute('vertical')} className="rounded-md border border-gray-200 py-1.5 text-[11px] text-slate-600 hover:bg-gray-50">
                    ⇕ Vertical
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Module list */}
        <div className="space-y-1">
          {selectedModules.map((mod) => (
            <div
              key={mod.id}
              className="flex items-center justify-between rounded-md border border-gray-200 px-2 py-1.5 text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ background: mod.color || '#a3c4f3' }}
                />
                <span className="truncate text-slate-800">{mod.label}</span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">
                {mod.width}×{mod.depth}
              </span>
            </div>
          ))}
        </div>

        {/* Bulk actions */}
        <div className="flex gap-2">
          <button
            onClick={() => selectedModules.forEach((m) => onDuplicateModule(m.id))}
            className="flex-1 rounded-md border border-gray-200 py-1.5 text-xs text-slate-600 hover:bg-gray-50"
          >
            Duplicate all
          </button>
          <button
            onClick={() => selectedModules.forEach((m) => onDeleteModule(m.id))}
            className="flex-1 rounded-md border border-red-200 py-1.5 text-xs text-red-500 hover:bg-red-50"
          >
            Delete all
          </button>
        </div>
      </div>
    );
  }

  // ─── Module Inspector ──────────────────────────────────────────────────

  if (selectedModule) {
    const mod = selectedModule;
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Module Properties</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {MODULE_CATEGORY_LABELS[mod.category] || mod.category}
            </p>
          </div>
          {mod.notes?.includes('Auto-generated') && (
            <span className="rounded-full bg-cyan-50 border border-cyan-200 px-2 py-0.5 text-[9px] font-medium text-cyan-700 shrink-0">
              🔧 Auto-generated
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDuplicateModule(mod.id)}
              className="rounded-md border border-gray-200 p-1 text-xs text-slate-600 hover:bg-gray-50"
              title="Duplicate"
            >
              ⧉
            </button>
            <button
              onClick={() => onDeleteModule(mod.id)}
              className="rounded-md border border-red-200 p-1 text-xs text-red-500 hover:bg-red-50"
              title="Delete"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Label */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
          <input
            type="text"
            value={mod.label}
            onChange={(e) => onUpdateModule(mod.id, { label: e.target.value })}
            className={inputClass}
          />
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Width (mm)</label>
            <input
              type="number"
              value={mod.width}
              onChange={(e) => onUpdateModule(mod.id, { width: parseInt(e.target.value) || mod.width })}
              className={inputClass}
              min={50}
              step={10}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Depth (mm)</label>
            <input
              type="number"
              value={mod.depth}
              onChange={(e) => onUpdateModule(mod.id, { depth: parseInt(e.target.value) || mod.depth })}
              className={inputClass}
              min={50}
              step={10}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Height (mm)</label>
            <input
              type="number"
              value={mod.height}
              onChange={(e) => onUpdateModule(mod.id, { height: parseInt(e.target.value) || mod.height })}
              className={inputClass}
              min={50}
              step={10}
            />
          </div>
        </div>

        {/* Position */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">X (mm)</label>
            <input
              type="number"
              value={Math.round(mod.position.x)}
              onChange={(e) => onUpdateModule(mod.id, { position: { ...mod.position, x: parseInt(e.target.value) || 0 } })}
              className={inputClass}
              step={10}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Y (mm)</label>
            <input
              type="number"
              value={Math.round(mod.position.y)}
              onChange={(e) => onUpdateModule(mod.id, { position: { ...mod.position, y: parseInt(e.target.value) || 0 } })}
              className={inputClass}
              step={10}
            />
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Rotation</label>
          <select
            value={mod.rotation}
            onChange={(e) => onUpdateModule(mod.id, { rotation: parseInt(e.target.value) })}
            className={inputClass}
          >
            <option value={0}>0°</option>
            <option value={90}>90°</option>
            <option value={180}>180°</option>
            <option value={270}>270°</option>
          </select>
        </div>

        {/* Wall snap */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Snapped wall</label>
          <select
            value={mod.wall_id || ''}
            onChange={(e) => onUpdateModule(mod.id, { wall_id: e.target.value || null })}
            className={inputClass}
          >
            <option value="">Free-standing</option>
            {walls.map((w) => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>
        </div>

        {/* Material */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Material</label>
          <select
            value={mod.materialType || ''}
            onChange={(e) => onUpdateModule(mod.id, { materialType: e.target.value || undefined })}
            className={inputClass}
          >
            <option value="">Standard (default)</option>
            {ALL_MATERIALS.map((mat) => (
              <option key={mat} value={mat}>{MATERIAL_LABELS[mat]}</option>
            ))}
          </select>
        </div>

        {/* Unit price */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Unit price</label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-emerald-700">{formatPrice(getModulePrice(mod))}</span>
            <input
              type="number"
              value={mod.unitPrice ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                onUpdateModule(mod.id, { unitPrice: v ? parseInt(v) : undefined });
              }}
              placeholder="Override (pence)"
              min={0}
              step={100}
              className={inputClass + ' flex-1'}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea
            value={mod.notes}
            onChange={(e) => onUpdateModule(mod.id, { notes: e.target.value })}
            rows={2}
            placeholder="Materials, finish, client preferences..."
            className={inputClass + ' resize-y'}
          />
        </div>

        {/* Warehouse Default Controls */}
        {mod.assetId && onSaveWarehouseDefault && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">Warehouse Default</label>
              {hasWarehouseOverride && (
                <span className="rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">
                  Customised
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">Save this item&apos;s values as your default for all future placements.</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  onSaveWarehouseDefault(mod.assetId!, {
                    label: mod.label,
                    width: mod.width,
                    depth: mod.depth,
                    height: mod.height,
                    unitPrice: mod.unitPrice,
                    materialType: mod.materialType,
                  });
                }}
                className="flex-1 rounded-md border border-amber-300 bg-amber-50 py-1.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100 transition-colors"
              >
                Save as default
              </button>
              {hasWarehouseOverride && onResetWarehouseDefault && (
                <button
                  onClick={() => onResetWarehouseDefault(mod.assetId!)}
                  className="rounded-md border border-gray-200 bg-white py-1.5 px-2.5 text-[11px] text-slate-500 hover:bg-gray-50 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        {/* Hosting Status (appliances only) */}
        {isApplianceModule(mod) && (() => {
          const hostRel = relationships?.find(
            (r) => (r.sourceId === mod.id) && (r.type === 'attached_to' || r.type === 'hosted_by'),
          );
          const host = hostRel ? allModules?.find((m) => m.id === hostRel.targetId) : null;
          return (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hosting Status</label>
              {host ? (
                <div className="flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs text-green-700">
                  <span className="text-sm">🔗</span>
                  <span className="font-medium">{REL_TYPE_LABELS[hostRel!.type]}</span>
                  <span className="truncate">{host.label}</span>
                  {hostRel!.auto && (
                    <span className="shrink-0 rounded bg-green-100 px-1 text-[9px] font-medium">auto</span>
                  )}
                  {onDetachRelationship && (
                    <button
                      onClick={() => onDetachRelationship(hostRel!.id)}
                      className="ml-auto shrink-0 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-100 transition-colors"
                      title="Detach from host"
                    >
                      Detach
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs text-orange-700">
                  <span className="text-sm">⚠️</span>
                  <span>Not hosted — move closer to a compatible cabinet</span>
                </div>
              )}
              {/* Reassign host */}
              {onReassignHost && allModules && (
                <div className="mt-1.5">
                  <select
                    value={host?.id || ''}
                    onChange={(e) => {
                      if (e.target.value) onReassignHost(mod.id, e.target.value);
                    }}
                    className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                  >
                    <option value="">Reassign host…</option>
                    {allModules
                      .filter((m) => m.id !== mod.id && !isApplianceModule(m))
                      .map((m) => (
                        <option key={m.id} value={m.id}>{m.label} ({m.width}mm)</option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          );
        })()}

        {/* Relationships */}
        {relationships && relationships.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Relationships</label>
            <div className="space-y-1.5">
              {relationships.map((rel) => {
                const isSource = rel.sourceId === mod.id;
                const otherId = isSource ? rel.targetId : rel.sourceId;
                const other = allModules?.find((m) => m.id === otherId);
                const otherLabel = other?.label || 'Unknown';
                const direction = isSource ? '→' : '←';
                const colorClass = REL_TYPE_COLORS[rel.type] || REL_TYPE_COLORS.grouped_with;

                return (
                  <div
                    key={rel.id}
                    className={`flex items-center justify-between gap-1 rounded-md border px-2 py-1.5 text-[11px] ${colorClass}`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-medium shrink-0">
                        {REL_TYPE_LABELS[rel.type] || rel.type}
                      </span>
                      <span className="shrink-0">{direction}</span>
                      <span className="truncate">{otherLabel}</span>
                      {rel.auto && (
                        <span className="shrink-0 rounded bg-white/60 px-1 text-[9px] font-medium">auto</span>
                      )}
                    </div>
                    {onDetachRelationship && (
                      <button
                        onClick={() => onDetachRelationship(rel.id)}
                        className="shrink-0 rounded p-0.5 hover:bg-white/50 text-current opacity-60 hover:opacity-100"
                        title="Detach"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Opening Inspector ─────────────────────────────────────────────────

  if (selectedOpening) {
    const op = selectedOpening;
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Opening Properties</h4>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">{op.type}</p>
          </div>
          <button
            onClick={() => onDeleteOpening(op.id)}
            className="rounded-md border border-red-200 p-1 text-xs text-red-500 hover:bg-red-50"
            title="Delete"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
          <input
            type="text"
            value={op.label}
            onChange={(e) => onUpdateOpening(op.id, { label: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Wall</label>
          <select
            value={op.wall_id}
            onChange={(e) => onUpdateOpening(op.id, { wall_id: e.target.value })}
            className={inputClass}
          >
            {walls.map((w) => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Offset (mm)</label>
            <input
              type="number"
              value={op.offset}
              onChange={(e) => onUpdateOpening(op.id, { offset: parseInt(e.target.value) || 0 })}
              className={inputClass}
              min={0}
              step={50}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Width (mm)</label>
            <input
              type="number"
              value={op.width}
              onChange={(e) => onUpdateOpening(op.id, { width: parseInt(e.target.value) || 100 })}
              className={inputClass}
              min={100}
              step={50}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── Empty state ───────────────────────────────────────────────────────

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="text-center">
        <p className="text-sm text-slate-500">Select an item on the canvas to view its properties.</p>
        <p className="mt-1 text-xs text-slate-400">Click a placed module or opening to inspect and edit.</p>
      </div>
    </div>
  );
}
