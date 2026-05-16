// src/spatial/openingProjector.ts
//
// Projects openings (doors, windows, obstacles) onto wall planes.
// Provides both 3D mesh markers and 2D elevation coordinates.
// Used by ThreeDTab (3D markers) and ElevationTab (2D canvas drawing).

import * as THREE from 'three';
import type { Wall, Opening, PlacedModule } from '@/lib/planner/planner-types';
import {
  MM,
  getWallLength,
  getWallAngle,
  getWallDirection,
  worldToWallLocal,
  OPENING_COLORS,
} from './coordinateUtils';

// ─── 3D: Opening marker meshes ──────────────────────────────────────────────

export type OpeningMarkerData = {
  opening: Opening;
  mesh: THREE.Mesh;
};

/**
 * Build a thin box mesh positioned on a wall to mark an opening.
 * Used in the 3D viewport.
 */
export function buildOpeningMarker(opening: Opening, wall: Wall): THREE.Mesh {
  const dir = getWallDirection(wall);

  const offsetM = opening.offset * MM;
  const halfW = (opening.width * MM) / 2;
  const cx = wall.start.x * MM + dir.x * (offsetM + halfW);
  const cz = wall.start.y * MM + dir.y * (offsetM + halfW);

  const elev = opening.elevation * MM;
  const h = opening.height * MM;
  const w = opening.width * MM;

  const angle = getWallAngle(wall);
  const colour = OPENING_COLORS[opening.type] || '#888';

  const geometry = new THREE.BoxGeometry(w, h, 0.02);
  const material = new THREE.MeshStandardMaterial({
    color: colour,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(cx, elev + h / 2, cz);
  mesh.rotation.set(0, -angle, 0);
  mesh.userData = { type: 'opening', openingId: opening.id, openingType: opening.type };

  return mesh;
}

/**
 * Build opening markers for all openings, mapped to their walls.
 */
export function buildAllOpeningMarkers(
  openings: Opening[],
  walls: Wall[],
): THREE.Mesh[] {
  const wallMap = new Map<string, Wall>();
  for (const w of walls) wallMap.set(w.id, w);

  const meshes: THREE.Mesh[] = [];
  for (const op of openings) {
    const wall = wallMap.get(op.wall_id);
    if (!wall) continue;
    meshes.push(buildOpeningMarker(op, wall));
  }
  return meshes;
}

// ─── 2D: Elevation projection ───────────────────────────────────────────────

export type ElevationProjection = {
  /** Offset along wall in mm (from wall start) */
  alongWall: number;
  /** Elevation from floor in mm */
  elevation: number;
  /** Width in mm */
  width: number;
  /** Height in mm */
  height: number;
};

/**
 * Project a module's position onto a wall for elevation rendering.
 * Returns the offset along the wall axis from wall.start.
 */
export function projectModuleOnWall(mod: PlacedModule, wall: Wall): number {
  const local = worldToWallLocal(mod.position, wall);
  return Math.max(0, Math.min(local.along, getWallLength(wall)));
}

/**
 * Project an opening onto a wall for elevation rendering.
 * Openings already store offset directly, but this normalises the output format.
 */
export function projectOpeningOnWall(opening: Opening): ElevationProjection {
  return {
    alongWall: opening.offset,
    elevation: opening.elevation,
    width: opening.width,
    height: opening.height,
  };
}
