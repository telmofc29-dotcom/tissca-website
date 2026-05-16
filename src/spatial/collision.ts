// src/spatial/collision.ts
//
// Collision detection for the TISSCA spatial planner.
// Prevents overlapping modules on the same wall or in free space.

import type { PlacedModule, Wall } from '@/lib/planner/planner-types';
import { worldToWallLocal } from './coordinateUtils';
import { effectiveDims } from './placementRules';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CollisionResult = {
  /** True if there is a collision */
  collides: boolean;
  /** IDs of modules that collide with the tested placement */
  collidingIds: string[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

/** Tolerance in mm — ignore overlap smaller than this */
const OVERLAP_TOLERANCE_MM = 5;

// ─── Wall-based collision ───────────────────────────────────────────────────

/**
 * Check if a module placement collides with existing modules on the same wall.
 * Compares wall-local spans (along-wall range) to detect overlap.
 */
export function checkWallCollision(
  mod: PlacedModule,
  wall: Wall,
  existingModules: PlacedModule[],
): CollisionResult {
  // Compute the tested module's span along this wall
  const modCentre = {
    x: mod.position.x + mod.width / 2,
    y: mod.position.y + mod.depth / 2,
  };
  const modLocal = worldToWallLocal(modCentre, wall);
  const { w: modW } = effectiveDims(mod);
  const modStart = modLocal.along - modW / 2;
  const modEnd = modLocal.along + modW / 2;

  // Only check modules on the same wall
  const sameWallModules = existingModules.filter(
    (m) => m.wall_id === wall.id && m.id !== mod.id,
  );

  const collidingIds: string[] = [];

  for (const other of sameWallModules) {
    const otherCentre = {
      x: other.position.x + other.width / 2,
      y: other.position.y + other.depth / 2,
    };
    const otherLocal = worldToWallLocal(otherCentre, wall);
    const { w: otherW } = effectiveDims(other);
    const otherStart = otherLocal.along - otherW / 2;
    const otherEnd = otherLocal.along + otherW / 2;

    // Check 1D overlap
    const overlap = Math.min(modEnd, otherEnd) - Math.max(modStart, otherStart);
    if (overlap > OVERLAP_TOLERANCE_MM) {
      collidingIds.push(other.id);
    }
  }

  return { collides: collidingIds.length > 0, collidingIds };
}

// ─── Free-space (AABB) collision ────────────────────────────────────────────

/**
 * Check if a module's axis-aligned bounding box overlaps with any other module.
 * Used for free-standing modules (no wall_id) or as a fallback.
 */
export function checkAABBCollision(
  mod: PlacedModule,
  existingModules: PlacedModule[],
): CollisionResult {
  const { w: aw, d: ad } = effectiveDims(mod);
  const ax1 = mod.position.x + OVERLAP_TOLERANCE_MM;
  const ay1 = mod.position.y + OVERLAP_TOLERANCE_MM;
  const ax2 = mod.position.x + aw - OVERLAP_TOLERANCE_MM;
  const ay2 = mod.position.y + ad - OVERLAP_TOLERANCE_MM;

  const collidingIds: string[] = [];

  for (const other of existingModules) {
    if (other.id === mod.id) continue;

    const { w: bw, d: bd } = effectiveDims(other);
    const bx1 = other.position.x;
    const by1 = other.position.y;
    const bx2 = other.position.x + bw;
    const by2 = other.position.y + bd;

    // AABB overlap test
    if (ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1) {
      collidingIds.push(other.id);
    }
  }

  return { collides: collidingIds.length > 0, collidingIds };
}

// ─── Combined check ─────────────────────────────────────────────────────────

/**
 * Check collision using the appropriate method based on wall assignment.
 */
export function checkCollision(
  mod: PlacedModule,
  walls: Wall[],
  existingModules: PlacedModule[],
): CollisionResult {
  if (mod.wall_id) {
    const wall = walls.find((w) => w.id === mod.wall_id);
    if (wall) {
      return checkWallCollision(mod, wall, existingModules);
    }
  }
  return checkAABBCollision(mod, existingModules);
}
