// src/spatial/relationships.ts
//
// Relationship engine for the TISSCA layout planner.
// Manages attachment, hosting, and spanning relationships between modules.
//
// Rules:
// - Appliances auto-latch to nearby compatible cabinets/worktops
// - Worktops auto-generate when an appliance needs one and none exists
// - Relationships are stored as directed edges in LayoutDocument.relationships
// - All relationships are detachable by the user

import type {
  PlacedModule,
  ModuleRelationship,
  ModuleCategory,
  Point2D,
} from '@/lib/planner/planner-types';
import { generateId } from '@/lib/planner/planner-types';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum edge-to-edge distance (mm) for auto-latch to trigger */
const LATCH_PROXIMITY_MM = 50;

/** Minimum worktop thickness (mm) when auto-generating */
export const MIN_WORKTOP_THICKNESS_MM = 20;

/** Default worktop thickness (mm) */
export const DEFAULT_WORKTOP_THICKNESS_MM = 38;

/** Default worktop depth (mm) — matches standard base cabinet depth */
export const DEFAULT_WORKTOP_DEPTH_MM = 600;

// ─── Category helpers ────────────────────────────────────────────────────────

/** Categories that represent base cabinet runs (can host worktops) */
const BASE_RUN_CATEGORIES: ModuleCategory[] = [
  'base_cabinet',
  'drawer_unit',
];

/** Categories that are surface appliances (need a worktop host) — kept for reference */
// const SURFACE_APPLIANCE_CATEGORIES: ModuleCategory[] = [
//   'appliance_housing',  // hobs, sinks when placed standalone
// ];

/** Labels that indicate a surface-mounted appliance */
const SURFACE_APPLIANCE_LABELS = ['hob', 'sink', 'cooktop', 'induction'];

/** Labels that indicate a housed/built-in appliance */
const HOUSED_APPLIANCE_LABELS = ['oven', 'microwave', 'dishwasher', 'washing', 'fridge', 'freezer'];

/** Worktop-like labels */
const WORKTOP_LABELS = ['worktop', 'countertop', 'benchtop', 'work surface'];

// ─── Detection helpers ───────────────────────────────────────────────────────

function isSurfaceAppliance(mod: PlacedModule): boolean {
  const lbl = mod.label.toLowerCase();
  return SURFACE_APPLIANCE_LABELS.some((k) => lbl.includes(k));
}

function isHousedAppliance(mod: PlacedModule): boolean {
  const lbl = mod.label.toLowerCase();
  return HOUSED_APPLIANCE_LABELS.some((k) => lbl.includes(k));
}

function isBaseCabinet(mod: PlacedModule): boolean {
  return BASE_RUN_CATEGORIES.includes(mod.category);
}

export function isWorktop(mod: PlacedModule): boolean {
  const lbl = mod.label.toLowerCase();
  return WORKTOP_LABELS.some((k) => lbl.includes(k)) || mod.category === 'custom' && lbl.includes('worktop');
}

function isTallCabinet(mod: PlacedModule): boolean {
  return mod.category === 'tall_cabinet';
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

/** Effective dimensions accounting for rotation */
function effectiveDims(mod: PlacedModule): { w: number; d: number } {
  const isRotated = mod.rotation === 90 || mod.rotation === 270;
  return {
    w: isRotated ? mod.depth : mod.width,
    d: isRotated ? mod.width : mod.depth,
  };
}

/**
 * AABB edge-to-edge distance between two modules.
 * Returns 0 if they overlap.
 */
function edgeToEdgeDist(a: PlacedModule, b: PlacedModule): number {
  const ad = effectiveDims(a);
  const bd = effectiveDims(b);

  const aMinX = a.position.x, aMaxX = a.position.x + ad.w;
  const aMinY = a.position.y, aMaxY = a.position.y + ad.d;
  const bMinX = b.position.x, bMaxX = b.position.x + bd.w;
  const bMinY = b.position.y, bMaxY = b.position.y + bd.d;

  const dx = Math.max(0, Math.max(aMinX - bMaxX, bMinX - aMaxX));
  const dy = Math.max(0, Math.max(aMinY - bMaxY, bMinY - aMaxY));

  return Math.sqrt(dx * dx + dy * dy);
}

/** Check if module A overlaps or is within edge-to-edge proximity of module B */
function isNearby(a: PlacedModule, b: PlacedModule, tolerance: number): boolean {
  return edgeToEdgeDist(a, b) <= tolerance;
}

/** Check if two modules share the same wall and are adjacent */
function onSameWall(a: PlacedModule, b: PlacedModule): boolean {
  return !!a.wall_id && a.wall_id === b.wall_id;
}

// ─── Core engine ─────────────────────────────────────────────────────────────

/**
 * Find the best host for a surface appliance (hob/sink).
 * Uses scored ranking: same-wall + worktop is best, then same-wall + base, etc.
 */
export function findBestHost(
  appliance: PlacedModule,
  modules: PlacedModule[],
): PlacedModule | null {
  const candidates = modules.filter((m) => m.id !== appliance.id);

  type ScoredCandidate = { mod: PlacedModule; score: number };
  const scored: ScoredCandidate[] = [];

  for (const c of candidates) {
    if (!isWorktop(c) && !isBaseCabinet(c)) continue;
    if (!isNearby(appliance, c, LATCH_PROXIMITY_MM)) continue;

    let score = 0;
    // Host type priority: worktop (best) > base cabinet
    if (isWorktop(c)) score += 100;
    else if (isBaseCabinet(c)) score += 50;
    // Same wall bonus (strong preference)
    if (onSameWall(appliance, c)) score += 200;
    // Proximity bonus (closer = higher score)
    const dist = edgeToEdgeDist(appliance, c);
    score += Math.max(0, LATCH_PROXIMITY_MM - dist);

    scored.push({ mod: c, score });
  }

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].mod;
}

/**
 * Find the best housing for a built-in appliance (oven, dishwasher, etc.).
 * Uses scored ranking: appliance_housing > tall cabinet > base cabinet (under-counter only).
 */
export function findBestHousing(
  appliance: PlacedModule,
  modules: PlacedModule[],
): PlacedModule | null {
  const candidates = modules.filter((m) => m.id !== appliance.id);
  const lbl = appliance.label.toLowerCase();
  const isUnderCounter = lbl.includes('dishwasher') || lbl.includes('washing');

  type ScoredCandidate = { mod: PlacedModule; score: number };
  const scored: ScoredCandidate[] = [];

  for (const c of candidates) {
    const isValidHousing = isTallCabinet(c) || c.category === 'appliance_housing';
    const isValidBase = isUnderCounter && isBaseCabinet(c);
    if (!isValidHousing && !isValidBase) continue;
    if (!isNearby(appliance, c, LATCH_PROXIMITY_MM)) continue;

    let score = 0;
    // Housing type priority: appliance_housing (best) > tall cabinet > base cabinet
    if (c.category === 'appliance_housing') score += 150;
    else if (isTallCabinet(c)) score += 100;
    else if (isBaseCabinet(c)) score += 50;
    // Same wall bonus (strong preference)
    if (onSameWall(appliance, c)) score += 200;
    // Proximity bonus
    const dist = edgeToEdgeDist(appliance, c);
    score += Math.max(0, LATCH_PROXIMITY_MM - dist);

    scored.push({ mod: c, score });
  }

  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].mod;
}

// ─── Run detection ───────────────────────────────────────────────────────────

/** Maximum gap (mm) between adjacent cabinet edges to still count as "contiguous" */
const RUN_GAP_TOLERANCE_MM = 15;

/** A contiguous run of base cabinets along a single wall */
export type CabinetRun = {
  id: string;
  wallId: string;
  modules: PlacedModule[];
  /** Wall-local start position (mm from wall start) */
  startAlong: number;
  /** Wall-local end position (mm from wall start) */
  endAlong: number;
};

/**
 * Get the along-wall extent of a module (start, end) in mm from wall start.
 * Uses centre projection for wall-agnostic ordering (works for any wall angle).
 */
function getModuleWallExtent(mod: PlacedModule): { start: number; end: number } {
  const dims = effectiveDims(mod);
  // For any rotation the along-wall axis is always the width axis.
  // Position is top-left of AABB. Project along whichever axis the wall runs.
  const isHoriz = mod.rotation === 0 || mod.rotation === 180;
  const along = isHoriz ? mod.position.x : mod.position.y;
  const span = isHoriz ? dims.w : dims.d;
  return { start: along, end: along + span };
}

/**
 * Find all base cabinets forming a contiguous run that includes `startModule`.
 * Two cabinets are contiguous when their along-wall edges are within RUN_GAP_TOLERANCE_MM.
 * Returns them sorted by along-wall position.
 */
export function findBaseRun(
  startModule: PlacedModule,
  modules: PlacedModule[],
): PlacedModule[] {
  if (!startModule.wall_id) return [startModule];
  const wallId = startModule.wall_id;

  // Gather all base cabinets on this wall
  const bases = modules.filter(
    (m) => m.wall_id === wallId && isBaseCabinet(m),
  );
  if (bases.length === 0) return [startModule];

  // Sort by along-wall start position
  bases.sort((a, b) => {
    const ea = getModuleWallExtent(a);
    const eb = getModuleWallExtent(b);
    return ea.start - eb.start;
  });

  // Build adjacency: sweep left→right, group contiguous modules
  const runs: PlacedModule[][] = [];
  let currentRun: PlacedModule[] = [bases[0]];
  let currentEnd = getModuleWallExtent(bases[0]).end;

  for (let i = 1; i < bases.length; i++) {
    const ext = getModuleWallExtent(bases[i]);
    if (ext.start - currentEnd <= RUN_GAP_TOLERANCE_MM) {
      // Contiguous — extend current run
      currentRun.push(bases[i]);
      currentEnd = Math.max(currentEnd, ext.end);
    } else {
      // Gap — start a new run
      runs.push(currentRun);
      currentRun = [bases[i]];
      currentEnd = ext.end;
    }
  }
  runs.push(currentRun);

  // Find the run that contains startModule
  const matchingRun = runs.find((run) => run.some((m) => m.id === startModule.id));
  return matchingRun || [startModule];
}

/**
 * Detect all contiguous base cabinet runs across all walls.
 */
export function detectAllRuns(modules: PlacedModule[]): CabinetRun[] {
  const bases = modules.filter(isBaseCabinet);
  const wallIds = [...new Set(bases.map((m) => m.wall_id).filter(Boolean))] as string[];
  const allRuns: CabinetRun[] = [];
  const claimed = new Set<string>();

  for (const wallId of wallIds) {
    const wallBases = bases.filter((m) => m.wall_id === wallId && !claimed.has(m.id));
    if (wallBases.length === 0) continue;

    // Sort by along-wall position
    wallBases.sort((a, b) => getModuleWallExtent(a).start - getModuleWallExtent(b).start);

    let currentRun: PlacedModule[] = [wallBases[0]];
    let currentEnd = getModuleWallExtent(wallBases[0]).end;

    for (let i = 1; i < wallBases.length; i++) {
      const ext = getModuleWallExtent(wallBases[i]);
      if (ext.start - currentEnd <= RUN_GAP_TOLERANCE_MM) {
        currentRun.push(wallBases[i]);
        currentEnd = Math.max(currentEnd, ext.end);
      } else {
        // Emit completed run
        const runStart = getModuleWallExtent(currentRun[0]).start;
        allRuns.push({
          id: generateId('run'),
          wallId,
          modules: currentRun,
          startAlong: runStart,
          endAlong: currentEnd,
        });
        currentRun.forEach((m) => claimed.add(m.id));
        currentRun = [wallBases[i]];
        currentEnd = ext.end;
      }
    }
    // Emit last run
    const runStart = getModuleWallExtent(currentRun[0]).start;
    allRuns.push({
      id: generateId('run'),
      wallId,
      modules: currentRun,
      startAlong: runStart,
      endAlong: currentEnd,
    });
    currentRun.forEach((m) => claimed.add(m.id));
  }

  return allRuns;
}

/**
 * Generate a worktop module that spans a run of base cabinets.
 * Returns the new PlacedModule (not yet added to the layout).
 */
export function generateWorktop(
  baseRun: PlacedModule[],
  thickness: number = DEFAULT_WORKTOP_THICKNESS_MM,
): PlacedModule {
  if (baseRun.length === 0) {
    throw new Error('Cannot generate worktop for empty run');
  }

  // Calculate span: leftmost to rightmost edge of the run
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let maxDepth = 0;
  for (const mod of baseRun) {
    const isRotated = mod.rotation === 90 || mod.rotation === 270;
    const w = isRotated ? mod.depth : mod.width;
    const d = isRotated ? mod.width : mod.depth;
    minX = Math.min(minX, mod.position.x);
    minY = Math.min(minY, mod.position.y);
    maxX = Math.max(maxX, mod.position.x + w);
    maxY = Math.max(maxY, mod.position.y + d);
    maxDepth = Math.max(maxDepth, d);
  }

  const firstMod = baseRun[0];
  const isHorizontalWall = firstMod.rotation === 0 || firstMod.rotation === 180;
  const spanWidth = isHorizontalWall ? maxX - minX : maxY - minY;
  const depth = Math.max(maxDepth, DEFAULT_WORKTOP_DEPTH_MM);

  // Place worktop on top of base run (same position, spanning them)
  return {
    id: generateId('wkt'),
    category: 'custom' as ModuleCategory,
    label: 'Worktop',
    position: { x: minX, y: minY },
    width: isHorizontalWall ? spanWidth : depth,
    depth: isHorizontalWall ? depth : spanWidth,
    height: Math.max(thickness, MIN_WORKTOP_THICKNESS_MM),
    rotation: firstMod.rotation,
    wall_id: firstMod.wall_id,
    color: '#D4A574', // visible warm maple
    notes: `Auto-generated worktop (${thickness}mm)`,
  };
}

// ─── Appliance position correction ───────────────────────────────────────────

/**
 * Compute the corrected position for an appliance relative to its host/housing.
 * - HOB/SINK: centred on host cabinet (X centred, Y aligned at back edge)
 * - OVEN/MICROWAVE: flush inside housing bounds (left-aligned, depth-aligned)
 * - DISHWASHER/WASHING: aligned with host run depth, centred on host cabinet
 *
 * Returns null if no correction is needed.
 */
export function correctAppliancePosition(
  appliance: PlacedModule,
  host: PlacedModule,
): Point2D | null {
  const aDims = effectiveDims(appliance);
  const hDims = effectiveDims(host);
  const lbl = appliance.label.toLowerCase();

  if (isSurfaceAppliance(appliance)) {
    // Centre X on host, align Y (depth) to host's back edge
    return {
      x: Math.round(host.position.x + (hDims.w - aDims.w) / 2),
      y: Math.round(host.position.y + (hDims.d - aDims.d) / 2),
    };
  }

  if (lbl.includes('oven') || lbl.includes('microwave')) {
    // Flush inside housing: left-aligned, depth-aligned
    return {
      x: Math.round(host.position.x + (hDims.w - aDims.w) / 2),
      y: Math.round(host.position.y),
    };
  }

  if (lbl.includes('dishwasher') || lbl.includes('washing')) {
    // Centre on host cabinet, align back edge
    return {
      x: Math.round(host.position.x + (hDims.w - aDims.w) / 2),
      y: Math.round(host.position.y),
    };
  }

  if (lbl.includes('fridge') || lbl.includes('freezer')) {
    // Centre in housing
    return {
      x: Math.round(host.position.x + (hDims.w - aDims.w) / 2),
      y: Math.round(host.position.y),
    };
  }

  return null;
}

/**
 * Process a freshly placed or moved module — detect and create relationships.
 *
 * Returns:
 * - newRelationships: relationship edges to add
 * - autoModules: auto-generated modules to add (e.g. worktops)
 * - removedRelationshipIds: stale relationships to remove
 * - positionCorrections: map of module ID → corrected position (for appliance alignment)
 */
export function processRelationships(
  movedModule: PlacedModule,
  allModules: PlacedModule[],
  existingRelationships: ModuleRelationship[],
): {
  newRelationships: ModuleRelationship[];
  autoModules: PlacedModule[];
  removedRelationshipIds: string[];
  positionCorrections: Map<string, Point2D>;
} {
  const newRelationships: ModuleRelationship[] = [];
  const autoModules: PlacedModule[] = [];
  const removedRelationshipIds: string[] = [];
  const positionCorrections = new Map<string, Point2D>();

  // Remove stale relationships where movedModule is the source
  const stale = existingRelationships.filter((r) => r.sourceId === movedModule.id);
  for (const r of stale) {
    // Check if the target module is still nearby (use wider tolerance for hysteresis)
    const target = allModules.find((m) => m.id === r.targetId);
    if (!target || !isNearby(movedModule, target, LATCH_PROXIMITY_MM * 3)) {
      removedRelationshipIds.push(r.id);
    }
  }

  // Surface appliance → worktop/base host
  // AGGRESSIVE WORKTOP: always ensure a worktop exists when appliance is near a base run
  if (isSurfaceAppliance(movedModule)) {
    const host = findBestHost(movedModule, allModules);

    // Check if there's a base run nearby that needs a worktop
    const nearBase = allModules.find(
      (m) => isBaseCabinet(m) && isNearby(movedModule, m, LATCH_PROXIMITY_MM),
    );

    if (nearBase) {
      const run = findBaseRun(nearBase, allModules);
      if (run.length > 0) {
        // Check if a worktop already spans this run
        const existingWorktop = allModules.find(
          (m) => isWorktop(m) && m.wall_id === nearBase.wall_id && isNearby(m, run[0], LATCH_PROXIMITY_MM * 2),
        );

        if (!existingWorktop) {
          // Auto-create worktop for the run
          const worktop = generateWorktop(run);
          autoModules.push(worktop);
          newRelationships.push({
            id: generateId('rel'),
            type: 'spans_over',
            sourceId: worktop.id,
            targetId: run[0].id,
            auto: true,
            meta: { runIds: run.map((m) => m.id) },
          });
          // Attach appliance to the new worktop
          newRelationships.push({
            id: generateId('rel'),
            type: 'attached_to',
            sourceId: movedModule.id,
            targetId: worktop.id,
            auto: true,
          });
        } else if (host) {
          // Worktop exists — attach to it (or existing host)
          const existingRel = existingRelationships.find(
            (r) =>
              r.sourceId === movedModule.id &&
              r.targetId === host.id &&
              !removedRelationshipIds.includes(r.id),
          );
          if (!existingRel) {
            newRelationships.push({
              id: generateId('rel'),
              type: 'attached_to',
              sourceId: movedModule.id,
              targetId: host.id,
              auto: true,
            });
          }
        }
      }
    } else if (host) {
      // No nearby base — attach to whatever host was found
      const existingRel = existingRelationships.find(
        (r) =>
          r.sourceId === movedModule.id &&
          r.targetId === host.id &&
          !removedRelationshipIds.includes(r.id),
      );
      if (!existingRel) {
        newRelationships.push({
          id: generateId('rel'),
          type: 'attached_to',
          sourceId: movedModule.id,
          targetId: host.id,
          auto: true,
        });
      }
    }
  }

  // Housed appliance → tall/housing
  if (isHousedAppliance(movedModule)) {
    const housing = findBestHousing(movedModule, allModules);
    if (housing) {
      const existingRel = existingRelationships.find(
        (r) =>
          r.sourceId === movedModule.id &&
          r.targetId === housing.id &&
          !removedRelationshipIds.includes(r.id),
      );
      if (!existingRel) {
        newRelationships.push({
          id: generateId('rel'),
          type: 'hosted_by',
          sourceId: movedModule.id,
          targetId: housing.id,
          auto: true,
        });
      }
      // Correct appliance position to align precisely with housing
      const corrected = correctAppliancePosition(movedModule, housing);
      if (corrected) positionCorrections.set(movedModule.id, corrected);
    }
  }

  // Correct surface appliance position relative to its host
  if (isSurfaceAppliance(movedModule)) {
    const bestHost = findBestHost(movedModule, [...allModules, ...autoModules]);
    if (bestHost) {
      const corrected = correctAppliancePosition(movedModule, bestHost);
      if (corrected) positionCorrections.set(movedModule.id, corrected);
    }
  }

  return { newRelationships, autoModules, removedRelationshipIds, positionCorrections };
}

/**
 * Get all relationships involving a specific module (as source or target).
 */
export function getRelationshipsForModule(
  moduleId: string,
  relationships: ModuleRelationship[],
): ModuleRelationship[] {
  return relationships.filter(
    (r) => r.sourceId === moduleId || r.targetId === moduleId,
  );
}

/**
 * Remove a relationship by ID and optionally clean up auto-generated modules.
 * Returns IDs of modules that should be removed (e.g. orphaned worktops).
 */
export function detachRelationship(
  relationshipId: string,
  relationships: ModuleRelationship[],
  modules: PlacedModule[],
): { removedModuleIds: string[] } {
  const rel = relationships.find((r) => r.id === relationshipId);
  if (!rel) return { removedModuleIds: [] };

  const removedModuleIds: string[] = [];

  // If detaching from an auto-generated worktop that has no other attachments,
  // remove the orphaned worktop
  if (rel.type === 'attached_to') {
    const target = modules.find((m) => m.id === rel.targetId);
    if (target && isWorktop(target) && target.notes?.includes('Auto-generated')) {
      const otherAttachments = relationships.filter(
        (r) => r.targetId === target.id && r.id !== relationshipId,
      );
      if (otherAttachments.length === 0) {
        removedModuleIds.push(target.id);
        // Also remove worktop's own spans_over relationship
        // (handled by caller filtering on removedModuleIds)
      }
    }
  }

  return { removedModuleIds };
}
