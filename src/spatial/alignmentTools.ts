// src/spatial/alignmentTools.ts
//
// Smart alignment tools for the TISSCA spatial planner.
// Provides align-left, align-right, align-centre, distribute-evenly,
// and snap-to-wall actions for multi-selected modules.

import type { PlacedModule, Wall, Point2D } from '@/lib/planner/planner-types';
import { effectiveDims } from './placementRules';
import { snapToWall } from './snapping';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AlignAction = 'left' | 'right' | 'center' | 'top' | 'bottom' | 'middle';
export type DistributeAction = 'horizontal' | 'vertical';

export type AlignmentResult = {
  /** Map of module ID → new position */
  positions: Map<string, Point2D>;
};

// ─── Alignment ───────────────────────────────────────────────────────────────

/**
 * Align a set of modules to a common edge or centre.
 */
export function alignModules(
  modules: PlacedModule[],
  action: AlignAction,
): AlignmentResult {
  if (modules.length < 2) return { positions: new Map() };

  const positions = new Map<string, Point2D>();

  // Compute bounding box of selection
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const mod of modules) {
    const { w, d } = effectiveDims(mod);
    minX = Math.min(minX, mod.position.x);
    maxX = Math.max(maxX, mod.position.x + w);
    minY = Math.min(minY, mod.position.y);
    maxY = Math.max(maxY, mod.position.y + d);
  }

  for (const mod of modules) {
    const { w, d } = effectiveDims(mod);
    let newX = mod.position.x;
    let newY = mod.position.y;

    switch (action) {
      case 'left':
        newX = minX;
        break;
      case 'right':
        newX = maxX - w;
        break;
      case 'center':
        newX = (minX + maxX) / 2 - w / 2;
        break;
      case 'top':
        newY = minY;
        break;
      case 'bottom':
        newY = maxY - d;
        break;
      case 'middle':
        newY = (minY + maxY) / 2 - d / 2;
        break;
    }

    positions.set(mod.id, { x: Math.round(newX), y: Math.round(newY) });
  }

  return { positions };
}

/**
 * Distribute modules evenly (equal spacing between them).
 */
export function distributeModules(
  modules: PlacedModule[],
  action: DistributeAction,
): AlignmentResult {
  if (modules.length < 3) return { positions: new Map() };

  const positions = new Map<string, Point2D>();

  if (action === 'horizontal') {
    // Sort by x position
    const sorted = [...modules].sort((a, b) => a.position.x - b.position.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const lastW = effectiveDims(last).w;
    const totalSpan = (last.position.x + lastW) - first.position.x;
    const totalModWidth = sorted.reduce((s, m) => s + effectiveDims(m).w, 0);
    const spacing = (totalSpan - totalModWidth) / (sorted.length - 1);

    let currentX = first.position.x;
    for (const mod of sorted) {
      const { w } = effectiveDims(mod);
      positions.set(mod.id, { x: Math.round(currentX), y: mod.position.y });
      currentX += w + spacing;
    }
  } else {
    // Sort by y position
    const sorted = [...modules].sort((a, b) => a.position.y - b.position.y);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const lastD = effectiveDims(last).d;
    const totalSpan = (last.position.y + lastD) - first.position.y;
    const totalModDepth = sorted.reduce((s, m) => s + effectiveDims(m).d, 0);
    const spacing = (totalSpan - totalModDepth) / (sorted.length - 1);

    let currentY = first.position.y;
    for (const mod of sorted) {
      const { d } = effectiveDims(mod);
      positions.set(mod.id, { x: mod.position.x, y: Math.round(currentY) });
      currentY += d + spacing;
    }
  }

  return { positions };
}

/**
 * Snap all selected modules to the nearest wall (keeping relative spacing).
 */
export function snapSelectionToWall(
  modules: PlacedModule[],
  walls: Wall[],
  allModules: PlacedModule[],
): AlignmentResult {
  const positions = new Map<string, Point2D>();

  for (const mod of modules) {
    const snap = snapToWall(
      mod.position,
      mod,
      walls,
      allModules,
      mod.id,
    );
    if (snap.wall_id) {
      positions.set(mod.id, snap.position);
    }
  }

  return { positions };
}
