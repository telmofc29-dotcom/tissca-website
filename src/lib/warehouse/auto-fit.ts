/**
 * TISSCA Auto-Fit Engine
 *
 * Computes cut/used dimensions for finishing components based on placement context.
 * Warehouse dimensions = stock sizes (what is sold).
 * Auto-fit dimensions = cut sizes (what is actually used in the layout).
 *
 * Used by the scan-to-layout editor when placing warehouse assets.
 */

import type { PlacedModule, Point2D } from '../planner/planner-types';
import type { WarehouseAsset, AutoFitHint } from './warehouse-types';

// ─── Cabinet categories that finishing components adapt to ─────────────────────

const CABINET_CATEGORIES = new Set([
  'base_cabinet',
  'wall_cabinet',
  'tall_cabinet',
  'drawer_unit',
  'appliance_housing',
]);

// ─── Proximity threshold for "adjacent" detection (mm) ────────────────────────

const ADJACENT_THRESHOLD_MM = 100;

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutoFitResult = {
  width: number;
  depth: number;
  height: number;
};

type PlacementContext = {
  /** All modules already placed in the layout */
  placedModules: PlacedModule[];
  /** Where the new module is being placed */
  position: Point2D;
};

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Compute cut dimensions for a warehouse asset given its placement context.
 * Returns adjusted dimensions based on the asset's autoFit hints.
 * If no hints apply or no context matches, returns stock dimensions unchanged.
 */
export function autoFitDimensions(
  asset: WarehouseAsset,
  context: PlacementContext,
): AutoFitResult {
  const result: AutoFitResult = {
    width: asset.dimensions.width,
    depth: asset.dimensions.depth,
    height: asset.dimensions.height,
  };

  const hints = asset.autoFit;
  if (!hints || hints.length === 0) return result;

  // Find nearest cabinet to the placement position
  const nearest = findNearestCabinet(context.position, context.placedModules);

  for (const hint of hints) {
    applyHint(hint, result, asset, context, nearest);
  }

  return result;
}

// ─── Hint Application ─────────────────────────────────────────────────────────

function applyHint(
  hint: AutoFitHint,
  result: AutoFitResult,
  asset: WarehouseAsset,
  context: PlacementContext,
  nearest: PlacedModule | null,
): void {
  switch (hint) {
    case 'match_adjacent_height':
      if (nearest) {
        result.height = clampToParametric(nearest.height, asset, 'height');
      }
      break;

    case 'match_adjacent_depth':
      if (nearest) {
        result.depth = clampToParametric(nearest.depth, asset, 'depth');
      }
      break;

    case 'fill_gap': {
      // Measure available gap at placement position
      const gap = measureGap(context.position, context.placedModules);
      if (gap !== null) {
        result.width = clampToParametric(gap, asset, 'width');
      }
      break;
    }

    case 'run_length': {
      // Measure total cabinet run on the same wall
      const runLen = measureCabinetRun(context.position, context.placedModules);
      if (runLen !== null) {
        result.width = clampToParametric(runLen, asset, 'width');
      }
      break;
    }
  }
}

// ─── Spatial Helpers ──────────────────────────────────────────────────────────

/** Find the nearest cabinet-category module to a given position */
function findNearestCabinet(
  pos: Point2D,
  modules: PlacedModule[],
): PlacedModule | null {
  let best: PlacedModule | null = null;
  let bestDist = Infinity;

  for (const m of modules) {
    if (!CABINET_CATEGORIES.has(m.category)) continue;
    const dx = pos.x - (m.position.x + m.width / 2);
    const dy = pos.y - (m.position.y + m.depth / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bestDist && dist < ADJACENT_THRESHOLD_MM + Math.max(m.width, m.depth)) {
      bestDist = dist;
      best = m;
    }
  }

  return best;
}

/** Measure the gap between adjacent cabinets at a placement position (X-axis) */
function measureGap(
  pos: Point2D,
  modules: PlacedModule[],
): number | null {
  // Find cabinets on the same wall line (similar Y position)
  const sameWall = modules.filter(
    (m) => CABINET_CATEGORIES.has(m.category) && Math.abs(m.position.y - pos.y) < ADJACENT_THRESHOLD_MM,
  );

  if (sameWall.length < 1) return null;

  // Find the nearest cabinet edges to the left and right of placement X
  let leftEdge: number | null = null;
  let rightEdge: number | null = null;

  for (const m of sameWall) {
    const mRight = m.position.x + m.width;
    const mLeft = m.position.x;

    // Cabinet to the left: its right edge is the boundary
    if (mRight <= pos.x + ADJACENT_THRESHOLD_MM && (leftEdge === null || mRight > leftEdge)) {
      leftEdge = mRight;
    }
    // Cabinet to the right: its left edge is the boundary
    if (mLeft >= pos.x - ADJACENT_THRESHOLD_MM && (rightEdge === null || mLeft < rightEdge)) {
      rightEdge = mLeft;
    }
  }

  if (leftEdge !== null && rightEdge !== null) {
    const gap = rightEdge - leftEdge;
    return gap > 0 ? gap : null;
  }

  return null;
}

/** Measure total cabinet run width near a position (same wall line) */
function measureCabinetRun(
  pos: Point2D,
  modules: PlacedModule[],
): number | null {
  const sameWall = modules.filter(
    (m) => CABINET_CATEGORIES.has(m.category) && Math.abs(m.position.y - pos.y) < ADJACENT_THRESHOLD_MM,
  );

  if (sameWall.length === 0) return null;

  // Total span from leftmost edge to rightmost edge
  let minX = Infinity;
  let maxX = -Infinity;
  for (const m of sameWall) {
    minX = Math.min(minX, m.position.x);
    maxX = Math.max(maxX, m.position.x + m.width);
  }

  const run = maxX - minX;
  return run > 0 ? run : null;
}

// ─── Parametric Clamping ──────────────────────────────────────────────────────

/**
 * Clamp a value to the asset's parametric rules for a given dimension.
 * Respects min/max/step constraints.
 */
function clampToParametric(
  value: number,
  asset: WarehouseAsset,
  dimension: 'width' | 'depth' | 'height',
): number {
  const p = asset.parametric;
  if (!p || !p.resizable) return value;

  const minKey = `min${capitalize(dimension)}` as keyof typeof p;
  const maxKey = `max${capitalize(dimension)}` as keyof typeof p;
  const stepKey = `step${capitalize(dimension)}` as keyof typeof p;

  const min = (p[minKey] as number | undefined) ?? 0;
  const max = (p[maxKey] as number | undefined) ?? Infinity;
  const step = (p[stepKey] as number | undefined) ?? 1;

  // Clamp to range
  let clamped = Math.max(min, Math.min(max, value));

  // Snap to step
  if (step > 1) {
    clamped = Math.round(clamped / step) * step;
    clamped = Math.max(min, Math.min(max, clamped));
  }

  return clamped;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
