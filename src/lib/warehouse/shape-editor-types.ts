// src/lib/warehouse/shape-editor-types.ts
//
// Type definitions for the 2D profile shape editor.
// Stored in warehouse_assets.planner_hints.shape_editor as jsonb.
//
// Phase 3A: polyline profile editing (straight segments only).
// Phase 3B: extrusion config + mesh generation preparation.
// Phase 3C: arcs/curves (extends profile.curves[]).

// ─── Profile ─────────────────────────────────────────────────────────────────

/** A 2D point in mm — [x, y]. */
export type ProfilePoint = [number, number];

// ─── Curves (Phase 3C) ──────────────────────────────────────────────────────

/**
 * A curve segment applied to a specific edge of the profile.
 *
 * An edge is the segment from points[edge] to points[(edge+1) % length].
 * When a CurveSegment exists for an edge, it is rendered and extruded as a
 * quadratic bezier curve instead of a straight line.
 *
 * Edges without a matching CurveSegment remain straight (backward compatible).
 */
export interface CurveSegment {
  /** Index of the starting point — curve applies on edge [edge → edge+1]. */
  edge: number;
  /** Control point [x, y] in mm for the quadratic bezier. */
  cp: ProfilePoint;
}

/** A closed or open 2D polyline profile. */
export interface ProfileData {
  /** Ordered array of [x, y] points in mm. */
  points: ProfilePoint[];
  /** Whether the profile forms a closed polygon. Phase 3A: always true. */
  closed: boolean;
  /**
   * Optional curve metadata for edges (Phase 3C).
   * Each entry maps a quadratic bezier control point to an edge index.
   * Edges without entries are straight lines.
   * Absent or empty array = all edges straight (backward compatible).
   */
  curves?: CurveSegment[];
}

/** Bounding box of the profile in mm. */
export interface ProfileBBox {
  width: number;
  height: number;
}

// ─── Extrusion (Phase 3B) ────────────────────────────────────────────────────

/** Axis along which the profile is extruded. */
export type ExtrusionDirection = 'x' | 'y' | 'z';

/** Extrusion parameters for turning a 2D profile into a 3D shape. */
export interface ExtrusionConfig {
  /** Extrusion depth in mm. */
  depth: number;
  /** Axis of extrusion. Default 'z' (profile in XY plane, extruded along Z). */
  direction: ExtrusionDirection;
  /** If true, extrude equally in both directions from the profile plane. */
  symmetric: boolean;
}

// ─── Shape Editor Config ─────────────────────────────────────────────────────

/**
 * The full shape editor configuration stored in planner_hints.shape_editor.
 *
 * Phase 3A: profile polyline + bbox.
 * Phase 3B: + extrusion config + optional mesh_ref.
 * Phase 3C: + curves array.
 */
export interface ShapeEditorConfig {
  /** Schema version for forward compatibility. */
  version: 1;
  /** Editing mode. Phase 3A/3B = "profile_polyline". */
  mode: 'profile_polyline';
  /** The 2D profile definition. */
  profile: ProfileData;
  /** Computed bounding box from profile extents. */
  bbox: ProfileBBox;
  /** Extrusion parameters (Phase 3B). */
  extrusion?: ExtrusionConfig;
  /**
   * Reference to a generated mesh file in storage (Phase 3B).
   * Format: "asset-meshes/{owner_id}/{asset_id}/profile.glb"
   */
  mesh_ref?: string;
  /** ISO timestamp of last mesh generation (for cache invalidation). */
  mesh_generated_at?: string;
}

// ─── Defaults & Helpers ──────────────────────────────────────────────────────

/**
 * Create a default rectangular profile matching the asset's current dimensions.
 * Points follow a clockwise winding order starting from bottom-left.
 * Includes default extrusion config (depth matches the asset's depth dimension).
 */
export function defaultShapeEditorConfig(
  width: number,
  height: number,
  depth?: number,
): ShapeEditorConfig {
  return {
    version: 1,
    mode: 'profile_polyline',
    profile: {
      points: [
        [0, 0],
        [width, 0],
        [width, height],
        [0, height],
      ],
      closed: true,
    },
    bbox: { width, height },
    extrusion: {
      depth: depth ?? 580,
      direction: 'z',
      symmetric: false,
    },
  };
}

/** Default extrusion config. */
export function defaultExtrusionConfig(depth?: number): ExtrusionConfig {
  return {
    depth: depth ?? 580,
    direction: 'z',
    symmetric: false,
  };
}

/**
 * Compute bounding box from profile points and optional curve control points.
 */
export function computeProfileBBox(
  points: ProfilePoint[],
  curves?: CurveSegment[],
): ProfileBBox {
  if (points.length === 0) return { width: 0, height: 0 };
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  // Include curve control points in bbox calculation
  if (curves) {
    for (const c of curves) {
      if (c.cp[0] < minX) minX = c.cp[0];
      if (c.cp[0] > maxX) maxX = c.cp[0];
      if (c.cp[1] < minY) minY = c.cp[1];
      if (c.cp[1] > maxY) maxY = c.cp[1];
    }
  }
  return {
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY),
  };
}

/**
 * Find the CurveSegment for a given edge index, or undefined if straight.
 */
export function getCurveForEdge(
  curves: CurveSegment[] | undefined,
  edgeIndex: number,
): CurveSegment | undefined {
  if (!curves) return undefined;
  return curves.find((c) => c.edge === edgeIndex);
}

/**
 * Validate a profile for basic sanity:
 * - At least 3 points for a closed polygon
 * - No duplicate consecutive points
 * - No self-intersecting edges (simplified check)
 *
 * Returns an array of warning strings. Empty = valid.
 */
export function validateProfile(profile: ProfileData): string[] {
  const warnings: string[] = [];
  const pts = profile.points;

  if (pts.length < 3) {
    warnings.push('Profile needs at least 3 points to form a polygon.');
    return warnings;
  }

  // Check for duplicate consecutive points
  for (let i = 0; i < pts.length; i++) {
    const next = (i + 1) % pts.length;
    if (pts[i][0] === pts[next][0] && pts[i][1] === pts[next][1]) {
      warnings.push(`Points ${i + 1} and ${next + 1} are identical.`);
    }
  }

  // Check for zero-area (all points collinear)
  const area = computeSignedArea(pts);
  if (Math.abs(area) < 1) {
    warnings.push('Profile has zero area — all points may be collinear.');
  }

  // Simple self-intersection check for non-adjacent edges
  if (pts.length >= 4) {
    for (let i = 0; i < pts.length; i++) {
      const a1 = pts[i];
      const a2 = pts[(i + 1) % pts.length];
      for (let j = i + 2; j < pts.length; j++) {
        if (j === pts.length - 1 && i === 0) continue; // skip last-first adjacency
        const b1 = pts[j];
        const b2 = pts[(j + 1) % pts.length];
        if (segmentsIntersect(a1, a2, b1, b2)) {
          warnings.push('Profile has self-intersecting edges.');
          return warnings; // one warning is enough
        }
      }
    }
  }

  return warnings;
}

// ─── Geometry Utilities ──────────────────────────────────────────────────────

/** Signed area of a polygon (positive = CW in screen coords). */
function computeSignedArea(pts: ProfilePoint[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i][0] * pts[j][1];
    area -= pts[j][0] * pts[i][1];
  }
  return area / 2;
}

/** Check if two line segments (a1-a2) and (b1-b2) intersect. */
function segmentsIntersect(
  a1: ProfilePoint,
  a2: ProfilePoint,
  b1: ProfilePoint,
  b2: ProfilePoint,
): boolean {
  const d1 = cross(a1, a2, b1);
  const d2 = cross(a1, a2, b2);
  const d3 = cross(b1, b2, a1);
  const d4 = cross(b1, b2, a2);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
}

/** Cross product of vectors (p2-p1) × (p3-p1). */
function cross(p1: ProfilePoint, p2: ProfilePoint, p3: ProfilePoint): number {
  return (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
}
