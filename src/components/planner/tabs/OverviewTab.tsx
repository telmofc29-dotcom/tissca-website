// src/components/planner/tabs/OverviewTab.tsx v1.0
//
// PURPOSE:
// Overview tab — project summary, room stats, component counts, status.

'use client';

import type { LayoutDocument } from '@/lib/planner/planner-types';
import { MODULE_CATEGORY_LABELS, formatMM } from '@/lib/planner/planner-types';
import { ASSET_CATEGORIES } from '@/lib/warehouse/warehouse-types';

type Props = {
  layout: LayoutDocument;
  layoutName: string;
  layoutType: string;
  lastSaved: string | null;
};

export default function OverviewTab({ layout, layoutName, layoutType, lastSaved }: Props) {
  const { room, openings, placedModules } = layout;

  // Compute stats
  const perimeter = 2 * (room.width + room.depth);
  const area = (room.width * room.depth) / 1_000_000; // m²
  const wallCount = room.walls.length;

  // Module counts by category
  const catCounts: Record<string, number> = {};
  for (const m of placedModules) {
    catCounts[m.category] = (catCounts[m.category] || 0) + 1;
  }

  // Total linear run
  const totalLinear = placedModules.reduce((sum, m) => sum + m.width, 0);

  // Estimated value from warehouse pricing (sum unitPrices if assetId exists)
  const moduleValue = placedModules.length; // placeholder count

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Project Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">{layoutName}</h2>
        <p className="text-sm text-slate-500 mt-0.5 capitalize">{layoutType} Layout</p>
        {lastSaved && (
          <p className="text-xs text-slate-400 mt-1">
            Last saved: {new Date(lastSaved).toLocaleString()}
          </p>
        )}
      </div>

      {/* Room Info Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>📐</span> Room Dimensions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Width" value={formatMM(room.width, 'm')} />
          <Stat label="Depth" value={formatMM(room.depth, 'm')} />
          <Stat label="Height" value={formatMM(room.height, 'm')} />
          <Stat label="Perimeter" value={formatMM(perimeter, 'm')} />
          <Stat label="Floor Area" value={`${area.toFixed(1)}m²`} />
          <Stat label="Walls" value={String(wallCount)} />
          <Stat label="Openings" value={String(openings.length)} />
          <Stat label="Shape" value={room.type === 'rectangular' ? 'Rectangle' : 'Polygon'} />
        </div>
      </div>

      {/* Component Summary */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>🏗️</span> Components
        </h3>
        {placedModules.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            No components placed yet. Open the Layout tab to start designing.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {Object.entries(catCounts).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-700">
                    {MODULE_CATEGORY_LABELS[cat as keyof typeof MODULE_CATEGORY_LABELS] || cat}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Total Units</span>
              <span className="text-sm font-bold text-amber-600">{moduleValue}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs font-semibold text-slate-600">Total Linear Run</span>
              <span className="text-sm font-bold text-amber-600">{formatMM(totalLinear, 'm')}</span>
            </div>
          </>
        )}
      </div>

      {/* Openings */}
      {openings.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span>🪟</span> Openings
          </h3>
          <div className="space-y-1.5">
            {openings.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{o.type === 'door' ? '🚪' : o.type === 'window' ? '🪟' : '⬛'}</span>
                  <span className="text-slate-700">{o.label}</span>
                </div>
                <span className="text-slate-400 text-xs">{formatMM(o.width)} on {o.wall_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warehouse Categories Available */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span>📦</span> Warehouse Categories
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ASSET_CATEGORIES.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-slate-50">
              <span className="text-sm">{cat.icon}</span>
              <div>
                <p className="text-xs font-medium text-slate-700">{cat.label}</p>
                <p className="text-[9px] text-slate-400">{cat.subtypes.length} subtypes</p>
              </div>
            </div>
          ))}
        </div>
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
