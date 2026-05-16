// src/spatial/constraints.ts
//
// Hard constraint engine for the TISSCA spatial planner.
// Prevents invalid layout states by validating and auto-correcting placements.
//
// Rules:
// - Hob/sink MUST have a worktop or base run beneath
// - Oven MUST be inside a housing or tall cabinet
// - Dishwasher/washing MUST be adjacent to a base cabinet
// - Worktop MUST span a base cabinet run (not free-floating)
// - Wall cabinets MUST be on a wall

import type { PlacedModule, ModuleRelationship } from '@/lib/planner/planner-types';
import { findBestHost, findBestHousing, generateWorktop, findBaseRun } from './relationships';
import { generateId } from '@/lib/planner/planner-types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConstraintViolation = {
  moduleId: string;
  rule: ConstraintRule;
  message: string;
  /** If auto-correctable, the action to take */
  autoFix?: ConstraintFix;
};

export type ConstraintRule =
  | 'hob_needs_worktop'
  | 'oven_needs_housing'
  | 'sink_needs_worktop'
  | 'dishwasher_needs_base'
  | 'worktop_needs_run'
  | 'wall_cabinet_needs_wall';

export type ConstraintFix =
  | { type: 'create_worktop'; run: PlacedModule[] }
  | { type: 'block_placement' };

// ─── Label helpers ───────────────────────────────────────────────────────────

const SURFACE_LABELS = ['hob', 'sink', 'cooktop', 'induction'];
const HOUSED_LABELS = ['oven', 'microwave'];
const UNDER_COUNTER_LABELS = ['dishwasher', 'washing'];

function isSurface(mod: PlacedModule): boolean {
  const lbl = mod.label.toLowerCase();
  return SURFACE_LABELS.some((k) => lbl.includes(k));
}

function isHoused(mod: PlacedModule): boolean {
  const lbl = mod.label.toLowerCase();
  return HOUSED_LABELS.some((k) => lbl.includes(k));
}

function isUnderCounter(mod: PlacedModule): boolean {
  const lbl = mod.label.toLowerCase();
  return UNDER_COUNTER_LABELS.some((k) => lbl.includes(k));
}

function isBaseCabinet(mod: PlacedModule): boolean {
  return mod.category === 'base_cabinet' || mod.category === 'drawer_unit';
}

// ─── Edge-to-edge distance (AABB) ───────────────────────────────────────────

function edgeDist(a: PlacedModule, b: PlacedModule): number {
  const aw = a.rotation === 90 || a.rotation === 270 ? a.depth : a.width;
  const ad = a.rotation === 90 || a.rotation === 270 ? a.width : a.depth;
  const bw = b.rotation === 90 || b.rotation === 270 ? b.depth : b.width;
  const bd = b.rotation === 90 || b.rotation === 270 ? b.width : b.depth;
  const dx = Math.max(0, Math.max(a.position.x - (b.position.x + bw), b.position.x - (a.position.x + aw)));
  const dy = Math.max(0, Math.max(a.position.y - (b.position.y + bd), b.position.y - (a.position.y + ad)));
  return Math.sqrt(dx * dx + dy * dy);
}

// ─── Core validation ─────────────────────────────────────────────────────────

/** Proximity tolerance for constraint checks (mm) */
const CONSTRAINT_PROXIMITY_MM = 80;

/**
 * Validate all hard constraints for a single module.
 * Returns violations (empty = valid).
 */
export function validateConstraints(
  mod: PlacedModule,
  allModules: PlacedModule[],
  _relationships: ModuleRelationship[],
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  // Surface appliance (hob/sink) → must have worktop or base run nearby
  if (isSurface(mod)) {
    const host = findBestHost(mod, allModules);
    if (!host) {
      // Check if near any base cabinet
      const nearBase = allModules.find(
        (m) => isBaseCabinet(m) && edgeDist(mod, m) <= CONSTRAINT_PROXIMITY_MM,
      );
      if (nearBase) {
        const run = findBaseRun(nearBase, allModules);
        violations.push({
          moduleId: mod.id,
          rule: mod.label.toLowerCase().includes('sink') ? 'sink_needs_worktop' : 'hob_needs_worktop',
          message: `${mod.label} needs a worktop — one will be auto-created`,
          autoFix: { type: 'create_worktop', run },
        });
      } else {
        violations.push({
          moduleId: mod.id,
          rule: mod.label.toLowerCase().includes('sink') ? 'sink_needs_worktop' : 'hob_needs_worktop',
          message: `${mod.label} must be placed on a base cabinet run or worktop`,
          autoFix: { type: 'block_placement' },
        });
      }
    }
  }

  // Housed appliance (oven/microwave) → must be in housing
  if (isHoused(mod)) {
    const housing = findBestHousing(mod, allModules);
    if (!housing) {
      violations.push({
        moduleId: mod.id,
        rule: 'oven_needs_housing',
        message: `${mod.label} must be placed inside a tall cabinet or appliance housing`,
        autoFix: { type: 'block_placement' },
      });
    }
  }

  // Under-counter (dishwasher/washing) → must be adjacent to base cabinet
  if (isUnderCounter(mod)) {
    const nearBase = allModules.find(
      (m) => m.id !== mod.id && isBaseCabinet(m) && edgeDist(mod, m) <= CONSTRAINT_PROXIMITY_MM,
    );
    if (!nearBase) {
      violations.push({
        moduleId: mod.id,
        rule: 'dishwasher_needs_base',
        message: `${mod.label} must be adjacent to a base cabinet run`,
        autoFix: { type: 'block_placement' },
      });
    }
  }

  // Wall cabinet → must be on a wall
  if (mod.category === 'wall_cabinet' && !mod.wall_id) {
    violations.push({
      moduleId: mod.id,
      rule: 'wall_cabinet_needs_wall',
      message: 'Wall cabinet must be placed on a wall',
      autoFix: { type: 'block_placement' },
    });
  }

  return violations;
}

/**
 * Apply auto-fixes for violations that can be corrected.
 * Returns new modules to add (e.g. auto-generated worktops) and
 * new relationships to create.
 */
export function applyConstraintFixes(
  violations: ConstraintViolation[],
  movedModule: PlacedModule,
): {
  autoModules: PlacedModule[];
  autoRelationships: ModuleRelationship[];
} {
  const autoModules: PlacedModule[] = [];
  const autoRelationships: ModuleRelationship[] = [];

  for (const v of violations) {
    if (!v.autoFix || v.autoFix.type !== 'create_worktop') continue;

    const run = v.autoFix.run;
    if (run.length === 0) continue;

    const worktop = generateWorktop(run);
    autoModules.push(worktop);

    // spans_over relationship
    autoRelationships.push({
      id: generateId('rel'),
      type: 'spans_over',
      sourceId: worktop.id,
      targetId: run[0].id,
      auto: true,
      meta: { runIds: run.map((m) => m.id) },
    });

    // attach appliance to worktop
    autoRelationships.push({
      id: generateId('rel'),
      type: 'attached_to',
      sourceId: movedModule.id,
      targetId: worktop.id,
      auto: true,
    });
  }

  return { autoModules, autoRelationships };
}

/**
 * Check if a placement should be blocked (hard constraint violation with no auto-fix).
 */
export function isPlacementBlocked(violations: ConstraintViolation[]): boolean {
  return violations.some(
    (v) => v.autoFix?.type === 'block_placement',
  );
}
