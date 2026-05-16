// src/spatial/dimensions.ts
//
// Dimension + measurement engine for the TISSCA spatial planner.
// Computes wall lengths, module widths, gaps between modules,
// and opening dimensions — all in mm.

import type { PlacedModule, Wall, Opening } from '@/lib/planner/planner-types';
import { getWallLength, worldToWallLocal } from './coordinateUtils';
import { effectiveDims } from './placementRules';

// ─── Types ───────────────────────────────────────────────────────────────────

export type WallDimension = {
  wall_id: string;
  label: string;
  length: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
};

export type ModuleDimension = {
  module_id: string;
  label: string;
  width: number;
  height: number;
  depth: number;
  /** Position along wall from wall start (mm). NaN if free-standing. */
  alongWall: number;
  /** Module category */
  category: string;
};

export type GapInfo = {
  /** Distance from wall start to gap start (mm) */
  start: number;
  /** Distance from wall start to gap end (mm) */
  end: number;
  /** Gap width (mm) */
  width: number;
};

export type WallGaps = {
  wall_id: string;
  gaps: GapInfo[];
};

export type OpeningDimension = {
  opening_id: string;
  label: string;
  width: number;
  height: number;
  /** Offset from wall start (mm) */
  offset: number;
  /** Elevation from floor (mm) */
  elevation: number;
};

// ─── Gap Classification ──────────────────────────────────────────────────────

export type GapClass = 'ignore' | 'filler' | 'warning' | 'available';

/** Configurable thresholds for gap classification (all in mm) */
export type GapThresholds = {
  /** Gaps smaller than this are ignored (default 30) */
  ignoreBelow: number;
  /** Gaps in filler range: ignoreBelow..fillerMax (default 80) */
  fillerMax: number;
  /** Gaps in warning range: fillerMax..warningMax (default 300) */
  warningMax: number;
};

export const DEFAULT_GAP_THRESHOLDS: GapThresholds = {
  ignoreBelow: 30,
  fillerMax: 80,
  warningMax: 300,
};

/** Common filler panel widths (mm) used in kitchen/wardrobe fitting */
export const COMMON_FILLER_WIDTHS = [30, 50, 60, 80, 100, 120, 150];

export type ClassifiedGap = GapInfo & {
  /** Classification based on thresholds */
  classification: GapClass;
  /** World-space start point (for rendering) */
  worldStart: { x: number; y: number };
  /** World-space end point (for rendering) */
  worldEnd: { x: number; y: number };
  /** Wall this gap belongs to */
  wall_id: string;
  /** Wall label for display */
  wall_label: string;
};

export type WallLayoutAnalysis = {
  wall_id: string;
  wall_label: string;
  wall_length: number;
  moduleCount: number;
  /** Total occupied width on this wall (mm) */
  occupiedWidth: number;
  /** Utilisation ratio 0–1 */
  utilisation: number;
  gaps: ClassifiedGap[];
};

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Get dimension info for a wall.
 */
export function getWallDimensions(wall: Wall): WallDimension {
  return {
    wall_id: wall.id,
    label: wall.label,
    length: getWallLength(wall),
    start: { ...wall.start },
    end: { ...wall.end },
  };
}

/**
 * Get dimension info for a placed module, including its position along a wall.
 */
export function getModuleDimensions(mod: PlacedModule, wall?: Wall): ModuleDimension {
  const { w } = effectiveDims(mod);
  let alongWall = NaN;

  if (wall && mod.wall_id === wall.id) {
    const centre = {
      x: mod.position.x + w / 2,
      y: mod.position.y + effectiveDims(mod).d / 2,
    };
    const local = worldToWallLocal(centre, wall);
    alongWall = local.along - w / 2; // left edge of module
  }

  return {
    module_id: mod.id,
    label: mod.label,
    width: mod.width,
    height: mod.height,
    depth: mod.depth,
    alongWall,
    category: mod.category,
  };
}

/**
 * Get gaps between modules on a wall.
 * Returns gaps before the first module, between modules, and after the last.
 * Modules are sorted by their along-wall position.
 */
export function getGapsOnWall(modules: PlacedModule[], wall: Wall): WallGaps {
  const wallLen = getWallLength(wall);

  // Compute along-wall spans for each module
  const spans: { start: number; end: number }[] = [];

  for (const mod of modules) {
    if (mod.wall_id !== wall.id) continue;
    const { w } = effectiveDims(mod);
    const centre = {
      x: mod.position.x + w / 2,
      y: mod.position.y + effectiveDims(mod).d / 2,
    };
    const local = worldToWallLocal(centre, wall);
    spans.push({
      start: local.along - w / 2,
      end: local.along + w / 2,
    });
  }

  // Sort by start position
  spans.sort((a, b) => a.start - b.start);

  const gaps: GapInfo[] = [];

  // Gap before first module
  if (spans.length === 0) {
    // Entire wall is a gap
    if (wallLen > 0) {
      gaps.push({ start: 0, end: wallLen, width: wallLen });
    }
  } else {
    if (spans[0].start > 1) {
      gaps.push({ start: 0, end: spans[0].start, width: spans[0].start });
    }

    // Gaps between modules
    for (let i = 0; i < spans.length - 1; i++) {
      const gapStart = spans[i].end;
      const gapEnd = spans[i + 1].start;
      const gapWidth = gapEnd - gapStart;
      if (gapWidth > 1) {
        gaps.push({ start: gapStart, end: gapEnd, width: gapWidth });
      }
    }

    // Gap after last module
    const lastEnd = spans[spans.length - 1].end;
    if (wallLen - lastEnd > 1) {
      gaps.push({ start: lastEnd, end: wallLen, width: wallLen - lastEnd });
    }
  }

  return { wall_id: wall.id, gaps };
}

/**
 * Get dimension info for an opening.
 */
export function getOpeningDimensions(opening: Opening): OpeningDimension {
  return {
    opening_id: opening.id,
    label: opening.label,
    width: opening.width,
    height: opening.height,
    offset: opening.offset,
    elevation: opening.elevation,
  };
}

// ─── Gap Classification + Wall Analysis ──────────────────────────────────────

/**
 * Classify a gap by its width.
 */
export function classifyGap(width: number, thresholds: GapThresholds = DEFAULT_GAP_THRESHOLDS): GapClass {
  if (width < thresholds.ignoreBelow) return 'ignore';
  if (width <= thresholds.fillerMax) return 'filler';
  if (width <= thresholds.warningMax) return 'warning';
  return 'available';
}

/**
 * Analyse the layout of modules on a single wall.
 * Returns classified gaps, utilisation stats, and world-space coordinates for rendering.
 */
export function analyzeWallLayout(
  modules: PlacedModule[],
  wall: Wall,
  thresholds: GapThresholds = DEFAULT_GAP_THRESHOLDS,
): WallLayoutAnalysis {
  const wallLen = getWallLength(wall);
  const { gaps } = getGapsOnWall(modules, wall);

  // Wall direction unit vector for world-space conversion
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = len > 0 ? dx / len : 1;
  const uy = len > 0 ? dy / len : 0;

  const wallModules = modules.filter((m) => m.wall_id === wall.id);
  const occupiedWidth = wallModules.reduce((sum, m) => sum + effectiveDims(m).w, 0);

  const classifiedGaps: ClassifiedGap[] = gaps.map((gap) => ({
    ...gap,
    classification: classifyGap(gap.width, thresholds),
    worldStart: {
      x: wall.start.x + ux * gap.start,
      y: wall.start.y + uy * gap.start,
    },
    worldEnd: {
      x: wall.start.x + ux * gap.end,
      y: wall.start.y + uy * gap.end,
    },
    wall_id: wall.id,
    wall_label: wall.label,
  }));

  return {
    wall_id: wall.id,
    wall_label: wall.label,
    wall_length: wallLen,
    moduleCount: wallModules.length,
    occupiedWidth,
    utilisation: wallLen > 0 ? occupiedWidth / wallLen : 0,
    gaps: classifiedGaps,
  };
}
