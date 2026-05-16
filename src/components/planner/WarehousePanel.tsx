// src/components/planner/WarehousePanel.tsx v1.0
//
// PURPOSE:
// Enhanced left sidebar for the Layout editor.
// Replaces ModulePalette when Warehouse system is active.
// Features: search, category filters, expandable sections, drag-to-place.

'use client';

import { useState, useMemo } from 'react';
import type { AssetCategory } from '@/lib/warehouse/warehouse-types';
import { ASSET_CATEGORIES, searchAssets, filterByCategory } from '@/lib/warehouse/warehouse-types';
import type { WarehouseAsset } from '@/lib/warehouse/warehouse-types';
import { WAREHOUSE_ASSETS } from '@/lib/warehouse/warehouse-registry';
import { currencySymbol as _curSym } from '@/lib/currency';

type Props = {
  onDragAsset: (assetId: string) => void;
  onTapPlace: (assetId: string) => void;
  /** If provided, use these assets instead of static registry (hybrid mode) */
  assets?: WarehouseAsset[];
  /** Set of asset IDs that have user overrides */
  overriddenIds?: Set<string>;
};

export default function WarehousePanel({ onDragAsset, onTapPlace, assets, overriddenIds }: Props) {
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<AssetCategory | null>('kitchen');
  const [activeFilter, setActiveFilter] = useState<AssetCategory | null>(null);

  const allAssets = useMemo(() => assets ?? [...WAREHOUSE_ASSETS], [assets]);

  const filteredAssets = useMemo(() => {
    let result = search ? searchAssets(allAssets, search) : allAssets.filter((a) => a.enabled);
    if (activeFilter) {
      result = filterByCategory(result, activeFilter);
    }
    return result;
  }, [allAssets, search, activeFilter]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<AssetCategory, WarehouseAsset[]>();
    for (const asset of filteredAssets) {
      const list = map.get(asset.category) || [];
      list.push(asset);
      map.set(asset.category, list);
    }
    return map;
  }, [filteredAssets]);

  function toggleCategory(cat: AssetCategory) {
    setExpandedCategory((prev) => (prev === cat ? null : cat));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-gray-100">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <span>🏗️</span> Warehouse
        </h3>
        <p className="text-[10px] text-slate-400 mt-0.5">Drag or tap to place</p>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search units..."
          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-200 bg-gray-50 text-slate-800
                     placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
        />
      </div>

      {/* Quick Filters */}
      <div className="px-3 py-1.5 border-b border-gray-100 flex flex-wrap gap-1">
        <button
          onClick={() => setActiveFilter(null)}
          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
            !activeFilter
              ? 'bg-amber-100 text-amber-800'
              : 'bg-gray-100 text-slate-500 hover:bg-gray-200'
          }`}
        >
          All ({allAssets.filter((a) => a.enabled).length})
        </button>
        {ASSET_CATEGORIES.map((cat) => {
          const count = grouped.get(cat.id)?.length ?? 0;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveFilter((prev) => (prev === cat.id ? null : cat.id))}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                activeFilter === cat.id
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-gray-100 text-slate-500 hover:bg-gray-200'
              }`}
            >
              {cat.icon} {count}
            </button>
          );
        })}
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto">
        {ASSET_CATEGORIES.map((cat) => {
          const assets = grouped.get(cat.id);
          if (!assets || assets.length === 0) return null;
          const isExpanded = expandedCategory === cat.id || !!search;

          return (
            <div key={cat.id} className="border-b border-gray-50 last:border-0">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{cat.icon}</span>
                  <span className="text-xs font-semibold text-slate-800">{cat.label}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    {assets.length}
                  </span>
                </div>
                <svg
                  className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded Assets */}
              {isExpanded && (
                <div className="px-2 pb-2 space-y-1">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      draggable
                      onDragStart={() => onDragAsset(asset.id)}
                      onClick={() => onTapPlace(asset.id)}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded-md
                                 bg-white border border-gray-100 hover:border-amber-300
                                 hover:shadow-sm cursor-grab active:cursor-grabbing
                                 transition-all duration-100"
                    >
                      {/* Colour swatch */}
                      <div
                        className="w-5 h-5 rounded shrink-0 border border-gray-200"
                        style={{ backgroundColor: asset.material.color }}
                      />
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-slate-800 truncate">
                          {asset.name}
                          {overriddenIds?.has(asset.id) && (
                            <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-400" title="User customised" />
                          )}
                        </p>
                        <p className="text-[9px] text-slate-400">
                          {asset.dimensions.width}×{asset.dimensions.depth}mm
                          {asset.metadata.unitPrice && (
                            <> · {_curSym(null)}{asset.metadata.unitPrice}</>
                          )}
                        </p>
                      </div>
                      {/* Placement indicator */}
                      <span className="text-[9px] text-slate-300 group-hover:text-amber-500 transition-colors">
                        {asset.placement === 'wall_only' ? '▮' :
                         asset.placement === 'floor' ? '▬' :
                         asset.placement === 'wall_mounted' ? '▯' : '◇'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredAssets.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-slate-400">No assets match your search.</p>
          </div>
        )}

        {/* Custom Assets */}
        <div className="border-t border-gray-100 px-3 py-3">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-sm">📷</span>
            <div>
              <p className="text-[11px] font-medium">Custom Assets</p>
              {allAssets.some((a) => a.source !== 'systemPreset') ? (
                <p className="text-[9px] text-emerald-500">
                  {allAssets.filter((a) => a.source !== 'systemPreset').length} custom items loaded
                </p>
              ) : (
                <p className="text-[9px]">Scan real items to add here — coming soon</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
