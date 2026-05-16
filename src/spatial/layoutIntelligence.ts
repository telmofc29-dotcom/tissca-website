// src/spatial/layoutIntelligence.ts
//
// Deterministic layout intelligence engine for the TISSCA spatial planner.
// Analyses a LayoutDocument and returns structured insights:
// gap warnings, filler suggestions, alignment issues, and utilisation stats.
// No AI — pure rule-based logic.

import type { LayoutDocument, PlacedModule, Wall } from '@/lib/planner/planner-types';
import {
  analyzeWallLayout,
  COMMON_FILLER_WIDTHS,
  DEFAULT_GAP_THRESHOLDS,
} from './dimensions';
import type {
  WallLayoutAnalysis,
  GapThresholds,
} from './dimensions';
import { effectiveDims } from './placementRules';

// ─── Types ───────────────────────────────────────────────────────────────────

export type InsightSeverity = 'info' | 'warning' | 'error';

export type LayoutInsight = {
  id: string;
  severity: InsightSeverity;
  /** Short title for display */
  title: string;
  /** Detailed description */
  description: string;
  /** Which wall this relates to (if any) */
  wall_id?: string;
  /** Which module this relates to (if any) */
  module_id?: string;
  /** Suggested action the user can take */
  suggestion?: string;
};

export type LayoutAnalysisResult = {
  /** Per-wall analysis with classified gaps */
  walls: WallLayoutAnalysis[];
  /** Actionable insights and suggestions */
  insights: LayoutInsight[];
  /** Overall layout score 0–100 (higher = better) */
  score: number;
  /** Summary counts */
  summary: {
    totalGaps: number;
    fillerGaps: number;
    warningGaps: number;
    availableGaps: number;
    totalModules: number;
    wallModules: number;
    freeModules: number;
    avgUtilisation: number;
  };
};

// ─── Engine ──────────────────────────────────────────────────────────────────

let insightCounter = 0;
function nextId(): string {
  return `insight-${++insightCounter}`;
}

/**
 * Run full layout analysis on a LayoutDocument.
 * Returns classified gaps, insights/suggestions, and a quality score.
 */
export function analyzeLayout(
  layout: LayoutDocument,
  thresholds: GapThresholds = DEFAULT_GAP_THRESHOLDS,
): LayoutAnalysisResult {
  insightCounter = 0;
  const { room, placedModules } = layout;
  const insights: LayoutInsight[] = [];

  // ── Per-wall analysis ──
  const wallAnalyses = room.walls.map((wall) =>
    analyzeWallLayout(placedModules, wall, thresholds),
  );

  // ── Gap insights ──
  for (const wa of wallAnalyses) {
    for (const gap of wa.gaps) {
      if (gap.classification === 'ignore') continue;

      if (gap.classification === 'filler') {
        const bestFiller = findBestFiller(gap.width);
        insights.push({
          id: nextId(),
          severity: 'info',
          title: `Filler needed on ${wa.wall_label}`,
          description: `${Math.round(gap.width)}mm gap — needs a filler panel.`,
          wall_id: wa.wall_id,
          suggestion: bestFiller
            ? `Add a ${bestFiller}mm filler panel.`
            : `Add a custom ${Math.round(gap.width)}mm filler.`,
        });
      }

      if (gap.classification === 'warning') {
        insights.push({
          id: nextId(),
          severity: 'warning',
          title: `Bad gap on ${wa.wall_label}`,
          description: `${Math.round(gap.width)}mm gap is too large for a filler but too small for a module. Consider repositioning.`,
          wall_id: wa.wall_id,
          suggestion: 'Reposition adjacent modules or add a narrow unit.',
        });
      }

      if (gap.classification === 'available') {
        insights.push({
          id: nextId(),
          severity: 'info',
          title: `Space on ${wa.wall_label}`,
          description: `${Math.round(gap.width)}mm of available space.`,
          wall_id: wa.wall_id,
          suggestion: 'Consider adding a module to fill this space.',
        });
      }
    }
  }

  // ── Alignment checks ──
  checkAlignmentIssues(placedModules, room.walls, insights);

  // ── Free-standing module warnings ──
  const freeModules = placedModules.filter((m) => !m.wall_id);
  if (freeModules.length > 0) {
    for (const mod of freeModules) {
      if (mod.category !== 'custom') {
        insights.push({
          id: nextId(),
          severity: 'info',
          title: `${mod.label} is free-standing`,
          description: 'This module is not attached to a wall. It may be intentional (island) or needs repositioning.',
          module_id: mod.id,
          suggestion: 'Drag closer to a wall to snap it into place.',
        });
      }
    }
  }

  // ── Empty wall check ──
  for (const wa of wallAnalyses) {
    if (wa.moduleCount === 0 && wa.wall_length > 600) {
      insights.push({
        id: nextId(),
        severity: 'info',
        title: `${wa.wall_label} is empty`,
        description: `${Math.round(wa.wall_length)}mm of wall space with no modules.`,
        wall_id: wa.wall_id,
      });
    }
  }

  // ── Summary ──
  const summary = computeSummary(wallAnalyses, placedModules);
  const score = computeScore(wallAnalyses, insights, placedModules);

  return { walls: wallAnalyses, insights, score, summary };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findBestFiller(gapWidth: number): number | null {
  // Find closest standard filler that fits
  let best: number | null = null;
  let bestDiff = Infinity;
  for (const fw of COMMON_FILLER_WIDTHS) {
    const diff = Math.abs(gapWidth - fw);
    if (fw <= gapWidth + 2 && diff < bestDiff) {
      best = fw;
      bestDiff = diff;
    }
  }
  return best;
}

function checkAlignmentIssues(
  modules: PlacedModule[],
  walls: Wall[],
  insights: LayoutInsight[],
): void {
  // Check if adjacent wall modules on the same wall have misaligned depth
  for (const wall of walls) {
    const wallMods = modules
      .filter((m) => m.wall_id === wall.id)
      .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);

    for (let i = 0; i < wallMods.length - 1; i++) {
      const a = wallMods[i];
      const b = wallMods[i + 1];
      const depthA = effectiveDims(a).d;
      const depthB = effectiveDims(b).d;
      if (Math.abs(depthA - depthB) > 50) {
        insights.push({
          id: nextId(),
          severity: 'warning',
          title: 'Depth mismatch',
          description: `"${a.label}" (${depthA}mm deep) and "${b.label}" (${depthB}mm deep) have different depths.`,
          wall_id: wall.id,
          module_id: a.id,
          suggestion: 'Align module depths for a flush finish.',
        });
      }
    }
  }
}

function computeSummary(
  wallAnalyses: WallLayoutAnalysis[],
  modules: PlacedModule[],
) {
  let totalGaps = 0;
  let fillerGaps = 0;
  let warningGaps = 0;
  let availableGaps = 0;

  for (const wa of wallAnalyses) {
    for (const g of wa.gaps) {
      if (g.classification === 'ignore') continue;
      totalGaps++;
      if (g.classification === 'filler') fillerGaps++;
      if (g.classification === 'warning') warningGaps++;
      if (g.classification === 'available') availableGaps++;
    }
  }

  const wallModules = modules.filter((m) => m.wall_id).length;
  const wallsWithModules = wallAnalyses.filter((wa) => wa.moduleCount > 0);
  const avgUtilisation =
    wallsWithModules.length > 0
      ? wallsWithModules.reduce((s, wa) => s + wa.utilisation, 0) / wallsWithModules.length
      : 0;

  return {
    totalGaps,
    fillerGaps,
    warningGaps,
    availableGaps,
    totalModules: modules.length,
    wallModules,
    freeModules: modules.length - wallModules,
    avgUtilisation: Math.round(avgUtilisation * 100) / 100,
  };
}

function computeScore(
  wallAnalyses: WallLayoutAnalysis[],
  insights: LayoutInsight[],
  modules: PlacedModule[],
): number {
  if (modules.length === 0) return 0;

  let score = 100;

  // Deduct for warning gaps
  const warnings = insights.filter((i) => i.severity === 'warning').length;
  score -= warnings * 8;

  // Deduct for error-level insights
  const errors = insights.filter((i) => i.severity === 'error').length;
  score -= errors * 15;

  // Bonus for good utilisation on walls that have modules
  const wallsWithModules = wallAnalyses.filter((wa) => wa.moduleCount > 0);
  if (wallsWithModules.length > 0) {
    const avgUtil = wallsWithModules.reduce((s, wa) => s + wa.utilisation, 0) / wallsWithModules.length;
    score += Math.round(avgUtil * 10); // up to +10 for high utilisation
  }

  // Small deduct for free-standing non-custom modules
  const freeNonCustom = modules.filter((m) => !m.wall_id && m.category !== 'custom').length;
  score -= freeNonCustom * 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}
