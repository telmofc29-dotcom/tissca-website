// src/spatial/coordinateUtils.ts
//
// Shared coordinate system utilities for the TISSCA spatial engine.
// Used by Plan, Elevation, and 3D renderers — single source of truth
// for wall geometry, direction vectors, and coordinate transforms.

import type { Wall, Point2D } from '@/lib/planner/planner-types';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Convert mm → Three.js scene units (1 unit = 1 metre) */
export const MM = 1 / 1000;

/** Standard plinth height in mm */
export const PLINTH_HEIGHT_MM = 150;

/** Wall cabinet mounting elevation in mm from floor */
export const WALL_CAB_ELEVATION_MM = 1400;

/** Standard plinth height in scene units */
export const PLINTH_HEIGHT = PLINTH_HEIGHT_MM * MM;

/** Wall cabinet mounting elevation in scene units */
export const WALL_CAB_ELEVATION = WALL_CAB_ELEVATION_MM * MM;

// ─── Category colour palette ────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, string> = {
  base_cabinet: '#a3c4f3',
  wall_cabinet: '#b5e48c',
  tall_cabinet: '#f9c74f',
  drawer_unit: '#90dbf4',
  appliance_housing: '#f8961e',
  wardrobe_single: '#cdb4db',
  wardrobe_double: '#cdb4db',
  filler_panel: '#d4a373',
  end_panel: '#BEB0A0',
  custom: '#e0e0e0',
};

export const OPENING_COLORS: Record<string, string> = {
  door: '#6B8F71',
  window: '#7BA4C7',
  obstacle: '#888888',
};

// ─── Wall geometry ──────────────────────────────────────────────────────────

/** Return wall length in mm */
export function getWallLength(wall: Wall): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Return unit direction vector along wall (start → end), in mm space */
export function getWallDirection(wall: Wall): Point2D {
  const len = getWallLength(wall);
  if (len === 0) return { x: 1, y: 0 };
  return {
    x: (wall.end.x - wall.start.x) / len,
    y: (wall.end.y - wall.start.y) / len,
  };
}

/** Return wall angle in radians (atan2) */
export function getWallAngle(wall: Wall): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  return Math.atan2(dy, dx);
}

/** Return wall normal (perpendicular, pointing "into" room — left-hand normal) */
export function getWallNormal(wall: Wall): Point2D {
  const dir = getWallDirection(wall);
  return { x: -dir.y, y: dir.x };
}

/** Return midpoint of wall in mm */
export function getWallMidpoint(wall: Wall): Point2D {
  return {
    x: (wall.start.x + wall.end.x) / 2,
    y: (wall.start.y + wall.end.y) / 2,
  };
}

// ─── Coordinate transforms ──────────────────────────────────────────────────

/**
 * Project a world-space point onto a wall's local coordinate system.
 * Returns { along, perp } where:
 *   along = distance from wall.start along wall direction (mm)
 *   perp  = perpendicular distance from wall line (mm)
 */
export function worldToWallLocal(point: Point2D, wall: Wall): { along: number; perp: number } {
  const dir = getWallDirection(wall);
  const px = point.x - wall.start.x;
  const py = point.y - wall.start.y;
  return {
    along: px * dir.x + py * dir.y,
    perp: -px * dir.y + py * dir.x,
  };
}

/**
 * Convert wall-local coordinates back to world space.
 * along = distance from wall.start along wall direction (mm)
 * perp  = perpendicular offset from wall line (mm)
 */
export function wallLocalToWorld(along: number, perp: number, wall: Wall): Point2D {
  const dir = getWallDirection(wall);
  return {
    x: wall.start.x + dir.x * along - dir.y * perp,
    y: wall.start.y + dir.y * along + dir.x * perp,
  };
}

// ─── Module category helpers ────────────────────────────────────────────────

import type { ModuleCategory } from '@/lib/planner/planner-types';

export function isBaseCategory(cat: ModuleCategory): boolean {
  return cat === 'base_cabinet' || cat === 'drawer_unit' || cat === 'appliance_housing';
}

export function isWallCategory(cat: ModuleCategory): boolean {
  return cat === 'wall_cabinet';
}

export function isTallCategory(cat: ModuleCategory): boolean {
  return cat === 'tall_cabinet';
}

/**
 * Get the floor elevation (mm from ground) for a module category.
 * Base cabinets sit on plinth, wall cabinets at 1400mm, tall from floor.
 */
export function getModuleFloorElevation(cat: ModuleCategory): number {
  if (isBaseCategory(cat)) return PLINTH_HEIGHT_MM;
  if (isWallCategory(cat)) return WALL_CAB_ELEVATION_MM;
  return 0;
}

/**
 * Get effective body height (mm) after subtracting plinth for base cabinets.
 */
export function getModuleBodyHeight(cat: ModuleCategory, totalHeight: number): number {
  if (isBaseCategory(cat)) return totalHeight - PLINTH_HEIGHT_MM;
  return totalHeight;
}

/** Resolve colour for a module: explicit colour or category default */
export function getModuleColor(cat: ModuleCategory, explicitColor?: string): string {
  return CATEGORY_COLORS[cat] || explicitColor || '#e0e0e0';
}
