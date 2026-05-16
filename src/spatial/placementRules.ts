// src/spatial/placementRules.ts
//
// Placement constraint engine for the TISSCA spatial planner.
// Validates module placement against room geometry and category rules.
// Returns corrected position/orientation when possible.

import type { PlacedModule, Wall, RoomShape } from '@/lib/planner/planner-types';
import {
  isBaseCategory,
  isWallCategory,
  isTallCategory,
  getWallLength,
  getWallAngle,
  worldToWallLocal,
  wallLocalToWorld,
} from './coordinateUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlacementResult = {
  valid: boolean;
  /** Corrected position (may differ from input if snapped/clamped) */
  position: { x: number; y: number };
  /** Corrected rotation (degrees) */
  rotation: number;
  /** Assigned wall (null = free-standing) */
  wall_id: string | null;
  /** Human-readable reason if invalid */
  reason?: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum perpendicular distance (mm) from wall to auto-assign a module */
const WALL_PROXIMITY_MM = 300;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get the rotation (degrees) that aligns a module's back to a wall */
function wallRotation(wall: Wall): number {
  const angle = getWallAngle(wall);
  // Wall angle is along-wall direction. Module should face away from wall
  // (normal points into room). Module rotation 0 = depth extends downward (+Y).
  // Convert wall angle → nearest 90° snap in degrees.
  const deg = ((angle * 180) / Math.PI + 360) % 360;
  // Round to nearest 90
  return Math.round(deg / 90) * 90;
}

/** Effective width/depth considering rotation */
function effectiveDims(mod: Pick<PlacedModule, 'width' | 'depth' | 'rotation'>): { w: number; d: number } {
  const r = ((mod.rotation % 360) + 360) % 360;
  if (r === 90 || r === 270) return { w: mod.depth, d: mod.width };
  return { w: mod.width, d: mod.depth };
}

/** Get module centre from its position (top-left of AABB) */
function moduleCentre(mod: Pick<PlacedModule, 'position' | 'width' | 'depth' | 'rotation'>): { x: number; y: number } {
  const { w, d } = effectiveDims(mod);
  return { x: mod.position.x + w / 2, y: mod.position.y + d / 2 };
}

// ─── Nearest wall detection ─────────────────────────────────────────────────

export type NearestWallResult = {
  wall: Wall;
  /** Distance along wall from wall.start to the module centre projection */
  along: number;
  /** Perpendicular distance from wall line to module centre */
  perp: number;
};

/**
 * Find the nearest wall to a module's centre.
 * Returns null if no wall is within WALL_PROXIMITY_MM.
 */
export function findNearestWall(
  mod: Pick<PlacedModule, 'position' | 'width' | 'depth' | 'rotation'>,
  walls: Wall[],
  maxDistance = WALL_PROXIMITY_MM,
): NearestWallResult | null {
  if (walls.length === 0) return null;

  const centre = moduleCentre(mod);
  let best: NearestWallResult | null = null;
  let bestDist = Infinity;

  for (const wall of walls) {
    const local = worldToWallLocal(centre, wall);
    const wallLen = getWallLength(wall);

    // Clamp along to wall span so we measure distance to the segment, not infinite line
    const clampedAlong = Math.max(0, Math.min(wallLen, local.along));
    const clampedPoint = wallLocalToWorld(clampedAlong, 0, wall);
    const dx = centre.x - clampedPoint.x;
    const dy = centre.y - clampedPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < bestDist) {
      bestDist = dist;
      best = { wall, along: local.along, perp: local.perp };
    }
  }

  if (!best || bestDist > maxDistance) return null;
  return best;
}

// ─── Core validation ────────────────────────────────────────────────────────

/**
 * Validate and correct a module placement.
 *
 * Rules:
 * 1. Wall cabinets MUST attach to a wall
 * 2. Base / tall cabinets should sit against a wall when nearby
 * 3. Module must fit within room bounds
 * 4. Module depth projects away from wall (into room)
 * 5. Module position clamped along wall span
 */
export function validatePlacement(
  mod: PlacedModule,
  room: RoomShape,
): PlacementResult {
  const cat = mod.category;
  const walls = room.walls;

  // Start with module's current values
  let pos = { ...mod.position };
  let rotation = mod.rotation;
  let wallId: string | null = mod.wall_id;

  // 1. Find nearest wall
  const nearest = findNearestWall(mod, walls);

  // 2. Category-specific rules
  if (isWallCategory(cat)) {
    // Wall cabinets MUST be on a wall
    if (!nearest) {
      return {
        valid: false,
        position: pos,
        rotation,
        wall_id: null,
        reason: 'Wall cabinet must be placed on a wall',
      };
    }
    // Snap to wall
    const snapped = snapModuleToWall(mod, nearest, room);
    pos = snapped.position;
    rotation = snapped.rotation;
    wallId = nearest.wall.id;
  } else if (isBaseCategory(cat) || isTallCategory(cat)) {
    // Base/tall prefer wall but can be free-standing
    if (nearest) {
      const snapped = snapModuleToWall(mod, nearest, room);
      pos = snapped.position;
      rotation = snapped.rotation;
      wallId = nearest.wall.id;
    } else {
      wallId = null;
    }
  } else {
    // Other categories — snap if close, otherwise free
    if (nearest) {
      const snapped = snapModuleToWall(mod, nearest, room);
      pos = snapped.position;
      rotation = snapped.rotation;
      wallId = nearest.wall.id;
    } else {
      wallId = null;
    }
  }

  // 3. Clamp to room bounds
  const { w, d } = effectiveDims({ ...mod, rotation });
  pos.x = Math.max(0, Math.min(room.width - w, pos.x));
  pos.y = Math.max(0, Math.min(room.depth - d, pos.y));

  return {
    valid: true,
    position: pos,
    rotation,
    wall_id: wallId,
  };
}

// ─── Wall snap positioning ──────────────────────────────────────────────────

/**
 * Compute the position and rotation for a module snapped against a wall.
 * Module back sits flush against wall; depth projects into the room.
 */
function snapModuleToWall(
  mod: PlacedModule,
  nearest: NearestWallResult,
  room: RoomShape,
): { position: { x: number; y: number }; rotation: number } {
  const wall = nearest.wall;
  const wallLen = getWallLength(wall);
  const rot = wallRotation(wall);

  // Module effective dims at snapped rotation
  const { w, d } = effectiveDims({ ...mod, rotation: rot });

  // Module centre projected onto wall at its along-value, clamped so it fits
  const halfW = w / 2;
  const clampedAlong = Math.max(halfW, Math.min(wallLen - halfW, nearest.along));

  // Position: back of module flush against wall, depth into room (along normal)
  // The normal points into the room. Place module centre at depth/2 from wall.
  const wallAngle = getWallAngle(wall);
  const normalX = -Math.sin(wallAngle);
  const normalY = Math.cos(wallAngle);

  const centreOnWall = wallLocalToWorld(clampedAlong, 0, wall);
  const halfD = d / 2;

  const centreX = centreOnWall.x + normalX * halfD;
  const centreY = centreOnWall.y + normalY * halfD;

  // Convert centre to top-left position
  const pos = {
    x: Math.max(0, Math.min(room.width - w, centreX - halfW)),
    y: Math.max(0, Math.min(room.depth - d, centreY - halfD)),
  };

  return { position: pos, rotation: rot };
}

// ─── Public re-exports for convenience ──────────────────────────────────────

export { effectiveDims, moduleCentre };
