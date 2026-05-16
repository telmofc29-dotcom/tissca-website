// src/spatial/snapping.ts
//
// Snap engine for the TISSCA spatial planner.
// Converts raw world coordinates into wall-aware, neighbour-aligned positions.

import type { PlacedModule, Wall, Point2D } from '@/lib/planner/planner-types';
import {
  getWallLength,
  getWallDirection,
  worldToWallLocal,
  wallLocalToWorld,
} from './coordinateUtils';
import { effectiveDims, findNearestWall } from './placementRules';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SnapResult = {
  /** Snapped world position (top-left of AABB) */
  position: Point2D;
  /** Wall the module snapped to (null if free-floating) */
  wall_id: string | null;
  /** Snapped rotation in degrees */
  rotation: number;
  /** If a snap guide should be shown, this is the guide source */
  snapGuide?: { type: 'neighbour' | 'wall-end' | 'centre' | 'host-centre'; along: number; wall: Wall };
  /** Module ID being snapped to (for host highlight rendering) */
  hostTarget?: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

/** Snap tolerance in mm for neighbour edge alignment */
const NEIGHBOUR_SNAP_MM = 60;

/** Snap tolerance for wall start/end */
const WALL_END_SNAP_MM = 80;

/** Snap tolerance for wall centre */
const CENTRE_SNAP_MM = 60;

/** Snap tolerance for centring on a neighbouring cabinet */
const CABINET_CENTRE_SNAP_MM = 50;

// ─── Core snap function ─────────────────────────────────────────────────────

/**
 * Given a raw pointer position (world mm) and module dimensions,
 * compute a snapped, wall-aware placement.
 *
 * 1. Find nearest wall
 * 2. Project onto wall axis
 * 3. Snap to neighbour edges, wall ends, wall centre
 * 4. Return snapped position + wall_id + rotation
 */
export function snapToWall(
  pointerMm: Point2D,
  mod: Pick<PlacedModule, 'width' | 'depth' | 'height' | 'category' | 'rotation'>,
  walls: Wall[],
  existingModules: PlacedModule[],
  currentModuleId?: string,
): SnapResult {
  // Build a virtual module at pointer to find nearest wall
  const virtualMod = {
    position: pointerMm,
    width: mod.width,
    depth: mod.depth,
    rotation: mod.rotation,
  };

  const nearest = findNearestWall(virtualMod, walls);

  if (!nearest) {
    // No wall nearby — grid-snap only (handled by caller)
    return { position: pointerMm, wall_id: null, rotation: mod.rotation };
  }

  const wall = nearest.wall;
  const wallLen = getWallLength(wall);

  // Compute rotation for this wall
  const wallAngle = Math.atan2(
    wall.end.y - wall.start.y,
    wall.end.x - wall.start.x,
  );
  const deg = ((wallAngle * 180) / Math.PI + 360) % 360;
  const rotation = Math.round(deg / 90) * 90;

  // Effective dimensions at snapped rotation
  const { w } = effectiveDims({ ...mod, rotation });

  // Module centre in wall-local coords
  const halfW = w / 2;
  let along = nearest.along;

  // ─── Snap along wall ────────────────────────────────────

  // Build neighbour edges on this wall
  const neighbours = existingModules.filter(
    (m) => m.wall_id === wall.id && m.id !== currentModuleId,
  );

  const neighbourEdges: { along: number; moduleId: string }[] = [];
  for (const n of neighbours) {
    const nCentre = { x: n.position.x + n.width / 2, y: n.position.y + n.depth / 2 };
    const nLocal = worldToWallLocal(nCentre, wall);
    const { w: nw } = effectiveDims(n);
    neighbourEdges.push({ along: nLocal.along - nw / 2, moduleId: n.id }); // left edge
    neighbourEdges.push({ along: nLocal.along + nw / 2, moduleId: n.id }); // right edge
  }

  let snapGuide: SnapResult['snapGuide'];
  let hostTarget: string | undefined;

  // Try snap to neighbour edge (module left/right aligns to their edge)
  // HARD SNAP: when within range, force EXACT edge position — no residual offset
  const moduleLeftAlong = along - halfW;
  const moduleRightAlong = along + halfW;

  for (const edge of neighbourEdges) {
    // Snap module's left edge to neighbour's right edge (or vice versa)
    if (Math.abs(moduleLeftAlong - edge.along) < NEIGHBOUR_SNAP_MM) {
      along = Math.round(edge.along + halfW);
      snapGuide = { type: 'neighbour', along: Math.round(edge.along), wall };
      hostTarget = edge.moduleId;
      break;
    }
    if (Math.abs(moduleRightAlong - edge.along) < NEIGHBOUR_SNAP_MM) {
      along = Math.round(edge.along - halfW);
      snapGuide = { type: 'neighbour', along: Math.round(edge.along), wall };
      hostTarget = edge.moduleId;
      break;
    }
  }

  // Try snap to centre of a neighbouring cabinet (for appliance centring)
  // HARD SNAP: force exact centre — no floating offset
  if (!snapGuide) {
    for (const n of neighbours) {
      const nCentre = { x: n.position.x + n.width / 2, y: n.position.y + n.depth / 2 };
      const nLocal = worldToWallLocal(nCentre, wall);
      if (Math.abs(along - nLocal.along) < CABINET_CENTRE_SNAP_MM) {
        along = Math.round(nLocal.along);
        snapGuide = { type: 'host-centre', along: Math.round(nLocal.along), wall };
        hostTarget = n.id;
        break;
      }
    }
  }

  // HARD SNAP: all wall-end/centre snaps force integer positions
  // Snap to wall start (along = halfW)
  if (!snapGuide && Math.abs(along - halfW) < WALL_END_SNAP_MM) {
    along = Math.round(halfW);
    snapGuide = { type: 'wall-end', along: 0, wall };
  }

  // Snap to wall end (along = wallLen - halfW)
  if (!snapGuide && Math.abs(along - (wallLen - halfW)) < WALL_END_SNAP_MM) {
    along = Math.round(wallLen - halfW);
    snapGuide = { type: 'wall-end', along: wallLen, wall };
  }

  // Snap to wall centre
  if (!snapGuide && Math.abs(along - wallLen / 2) < CENTRE_SNAP_MM) {
    along = Math.round(wallLen / 2);
    snapGuide = { type: 'centre', along: Math.round(wallLen / 2), wall };
  }

  // Clamp so module stays within wall span
  along = Math.max(halfW, Math.min(wallLen - halfW, along));

  // ─── Compute world position ─────────────────────────────

  const { d } = effectiveDims({ ...mod, rotation });
  const dir = getWallDirection(wall);
  const normalX = -dir.y;
  const normalY = dir.x;

  const centreOnWall = wallLocalToWorld(along, 0, wall);
  const halfD = d / 2;

  // HARD SNAP: round final world position to integer mm — eliminates sub-mm drift
  const position: Point2D = {
    x: Math.round(centreOnWall.x + normalX * halfD - w / 2),
    y: Math.round(centreOnWall.y + normalY * halfD - d / 2),
  };

  return { position, wall_id: wall.id, rotation, snapGuide, hostTarget };
}

/**
 * Convenience: snap a pointer position using only grid (no wall awareness).
 * Used when module is far from all walls.
 */
export function snapToGrid(position: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}
