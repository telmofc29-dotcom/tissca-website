// src/components/planner/LiveCostBar.tsx
//
// Floating live cost display for the TISSCA layout editor.
// Shows total cost + selected item cost in real time.

'use client';

import { useMemo } from 'react';
import type { PlacedModule } from '@/lib/planner/planner-types';
import { computeTotalCost, getModulePrice, formatPrice } from '@/lib/planner/pricing';

type LiveCostBarProps = {
  modules: PlacedModule[];
  selectedModule: PlacedModule | null;
};

export default function LiveCostBar({ modules, selectedModule }: LiveCostBarProps) {
  const totalCost = useMemo(() => computeTotalCost(modules), [modules]);
  const selectedCost = selectedModule ? getModulePrice(selectedModule) : null;

  if (modules.length === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 backdrop-blur-sm px-3 py-1.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-emerald-600">💰</span>
        <span className="text-xs font-medium text-emerald-800">Total</span>
        <span className="text-sm font-bold text-emerald-700">{formatPrice(totalCost)}</span>
      </div>
      {selectedCost !== null && (
        <>
          <div className="w-px h-4 bg-emerald-200" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-emerald-600">▸</span>
            <span className="text-xs text-emerald-700 truncate max-w-[100px]">{selectedModule!.label}</span>
            <span className="text-xs font-semibold text-emerald-700">{formatPrice(selectedCost)}</span>
          </div>
        </>
      )}
      <div className="text-[9px] text-emerald-500 ml-auto">{modules.length} items</div>
    </div>
  );
}
