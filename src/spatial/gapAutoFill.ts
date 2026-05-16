// src/spatial/gapAutoFill.ts
//
// Gap auto-fill engine for the TISSCA spatial planner.
// Analyses gaps on walls, suggests best-fit modules, and can auto-fill entire walls.

import type { PlacedModule, Wall, ModuleCategory, Point2D } from '@/lib/planner/planner-types';
import { generateId } from '@/lib/planner/planner-types';
import { getGapsOnWall } from './dimensions';
import type { GapInfo } from './dimensions';
import { wallLocalToWorld, getWallDirection } from './coordinateUtils';


// ─── Types ───────────────────────────────────────────────────────────────────

export type GapSuggestion = {
  /** Gap this suggestion applies to */
  gap: GapInfo;
  /** Wall the gap is on */
  wallId: string;
  /** Ranked suggestions: best-fit first */
  options: FillOption[];
};

export type FillOption = {
  /** Display label */
  label: string;
  /** Category of module to place */
  category: ModuleCategory;
  /** Width of the suggested module (mm) */
  width: number;
  /** Standard depth for the category (mm) */
  depth: number;
  /** Standard height for the category (mm) */
  height: number;
  /** How well this fits: 1.0 = exact, lower = worse */
  fitQuality: number;
  /** Remaining gap after placing this module (mm) */
  residualGap: number;
  /** World position where the module would be placed */
  position: Point2D;
  /** Rotation to match wall */
  rotation: number;
  /** Colour for preview rendering */
  color: string;
};

// ─── Standard module widths (mm) ─────────────────────────────────────────────

type ModuleSize = {
  label: string;
  category: ModuleCategory;
  width: number;
  depth: number;
  height: number;
  color: string;
};

/** Common cabinet widths available for auto-fill */
const STANDARD_MODULES: ModuleSize[] = [
  // Base cabinets
  { label: 'Base 300', category: 'base_cabinet', width: 300, depth: 600, height: 870, color: '#a3c4f3' },
  { label: 'Base 400', category: 'base_cabinet', width: 400, depth: 600, height: 870, color: '#a3c4f3' },
  { label: 'Base 450', category: 'base_cabinet', width: 450, depth: 600, height: 870, color: '#a3c4f3' },
  { label: 'Base 500', category: 'base_cabinet', width: 500, depth: 600, height: 870, color: '#a3c4f3' },
  { label: 'Base 600', category: 'base_cabinet', width: 600, depth: 600, height: 870, color: '#a3c4f3' },
  { label: 'Base 800', category: 'base_cabinet', width: 800, depth: 600, height: 870, color: '#a3c4f3' },
  { label: 'Base 900', category: 'base_cabinet', width: 900, depth: 600, height: 870, color: '#a3c4f3' },
  { label: 'Base 1000', category: 'base_cabinet', width: 1000, depth: 600, height: 870, color: '#a3c4f3' },
  { label: 'Base 1200', category: 'base_cabinet', width: 1200, depth: 600, height: 870, color: '#a3c4f3' },
  // Drawer units
  { label: 'Drawers 300', category: 'drawer_unit', width: 300, depth: 600, height: 870, color: '#90dbf4' },
  { label: 'Drawers 400', category: 'drawer_unit', width: 400, depth: 600, height: 870, color: '#90dbf4' },
  { label: 'Drawers 500', category: 'drawer_unit', width: 500, depth: 600, height: 870, color: '#90dbf4' },
  { label: 'Drawers 600', category: 'drawer_unit', width: 600, depth: 600, height: 870, color: '#90dbf4' },
  // Filler panels
  { label: 'Filler 30', category: 'filler_panel', width: 30, depth: 600, height: 870, color: '#d5c4a1' },
  { label: 'Filler 50', category: 'filler_panel', width: 50, depth: 600, height: 870, color: '#d5c4a1' },
  { label: 'Filler 60', category: 'filler_panel', width: 60, depth: 600, height: 870, color: '#d5c4a1' },
  { label: 'Filler 80', category: 'filler_panel', width: 80, depth: 600, height: 870, color: '#d5c4a1' },
  { label: 'Filler 100', category: 'filler_panel', width: 100, depth: 600, height: 870, color: '#d5c4a1' },
  { label: 'Filler 120', category: 'filler_panel', width: 120, depth: 600, height: 870, color: '#d5c4a1' },
  { label: 'Filler 150', category: 'filler_panel', width: 150, depth: 600, height: 870, color: '#d5c4a1' },
  // Tall cabinets
  { label: 'Tall 300', category: 'tall_cabinet', width: 300, depth: 600, height: 2100, color: '#c6b5e2' },
  { label: 'Tall 400', category: 'tall_cabinet', width: 400, depth: 600, height: 2100, color: '#c6b5e2' },
  { label: 'Tall 500', category: 'tall_cabinet', width: 500, depth: 600, height: 2100, color: '#c6b5e2' },
  { label: 'Tall 600', category: 'tall_cabinet', width: 600, depth: 600, height: 2100, color: '#c6b5e2' },
];

// ─── Core functions ──────────────────────────────────────────────────────────

/**
 * Analyse a gap and return ranked fill suggestions.
 */
export function suggestGapFill(
  gap: GapInfo,
  wall: Wall,
): FillOption[] {
  const wallDir = getWallDirection(wall);
  const normalX = -wallDir.y;
  const normalY = wallDir.x;

  const options: FillOption[] = [];

  for (const mod of STANDARD_MODULES) {
    if (mod.width > gap.width + 2) continue; // doesn't fit

    const residual = gap.width - mod.width;
    const fitQuality = residual <= 2 ? 1.0 : Math.max(0, 1 - residual / gap.width);

    // Position: start of gap along wall, flush to wall
    const worldStart = wallLocalToWorld(gap.start + mod.width / 2, 0, wall);
    const halfDepth = mod.depth / 2;

    const position: Point2D = {
      x: Math.round(worldStart.x + normalX * halfDepth - mod.width / 2),
      y: Math.round(worldStart.y + normalY * halfDepth - mod.depth / 2),
    };

    // Compute rotation from wall angle
    const wallAngle = Math.atan2(wallDir.y, wallDir.x);
    const rotation = Math.round(((wallAngle * 180) / Math.PI + 360) % 360 / 90) * 90;

    options.push({
      label: mod.label,
      category: mod.category,
      width: mod.width,
      depth: mod.depth,
      height: mod.height,
      fitQuality,
      residualGap: residual,
      position,
      rotation,
      color: mod.color,
    });
  }

  // Sort by fit quality (best first), then prefer cabinets over fillers for large gaps
  options.sort((a, b) => {
    // For small gaps (< 160mm), prefer fillers
    if (gap.width < 160) {
      const aIsFiller = a.category === 'filler_panel' ? 1 : 0;
      const bIsFiller = b.category === 'filler_panel' ? 1 : 0;
      if (aIsFiller !== bIsFiller) return bIsFiller - aIsFiller;
    }
    // For larger gaps, prefer exact fits, then larger modules
    if (Math.abs(a.fitQuality - b.fitQuality) > 0.01) return b.fitQuality - a.fitQuality;
    return b.width - a.width; // prefer larger modules
  });

  return options;
}

/**
 * Analyse all gaps on a wall and return suggestions for each.
 * Only returns suggestions for gaps that are >= 30mm (skips trivial gaps).
 */
export function analyzeGapsForWall(
  modules: PlacedModule[],
  wall: Wall,
): GapSuggestion[] {
  const { gaps } = getGapsOnWall(modules, wall);
  const suggestions: GapSuggestion[] = [];

  for (const gap of gaps) {
    if (gap.width < 30) continue; // too small to fill

    const options = suggestGapFill(gap, wall);
    if (options.length > 0) {
      suggestions.push({
        gap,
        wallId: wall.id,
        options: options.slice(0, 5), // top 5 suggestions
      });
    }
  }

  return suggestions;
}

/**
 * Auto-fill an entire wall with best-fit modules.
 * Fills gaps from left to right, using the best-fitting module for each.
 * Returns the modules to be placed (not yet added to layout).
 */
export function autoFillWall(
  existingModules: PlacedModule[],
  wall: Wall,
): PlacedModule[] {
  const newModules: PlacedModule[] = [];
  let currentModules = [...existingModules];

  // Iteratively fill gaps until no more can be filled
  for (let iteration = 0; iteration < 50; iteration++) {
    const suggestions = analyzeGapsForWall(currentModules, wall);
    if (suggestions.length === 0) break;

    // Find the best single fill across all gaps (highest fit quality)
    let bestFill: FillOption | null = null;
    for (const s of suggestions) {
      const topOption = s.options[0];
      if (topOption && (!bestFill || topOption.fitQuality > bestFill.fitQuality)) {
        bestFill = topOption;
      }
    }

    if (!bestFill || bestFill.fitQuality < 0.3) break; // no good fills left

    // Create the module
    const newMod: PlacedModule = {
      id: generateId('mod'),
      category: bestFill.category,
      label: bestFill.label,
      position: bestFill.position,
      width: bestFill.width,
      depth: bestFill.depth,
      height: bestFill.height,
      rotation: bestFill.rotation,
      wall_id: wall.id,
      color: bestFill.color,
      notes: 'Auto-filled',
    };

    newModules.push(newMod);
    currentModules = [...currentModules, newMod];
  }

  return newModules;
}

/**
 * Get all gap suggestions across all walls.
 */
export function analyzeAllGaps(
  modules: PlacedModule[],
  walls: Wall[],
): GapSuggestion[] {
  const allSuggestions: GapSuggestion[] = [];
  for (const wall of walls) {
    allSuggestions.push(...analyzeGapsForWall(modules, wall));
  }
  return allSuggestions;
}
