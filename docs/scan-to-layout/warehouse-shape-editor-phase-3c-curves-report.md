# Phase 3C: Curves/Arcs — Implementation Report

**Date:** 2025-01-XX
**Status:** ✅ Complete — Build verified

---

## Overview

Phase 3C extends the warehouse custom-shape pipeline from straight-line-only polylines to support **quadratic bezier curves** on any edge. This enables realistic silhouettes for curved furniture profiles (e.g., rounded corners, arched tops, ergonomic contours).

The implementation is fully **backward compatible** — profiles without a `curves` field render identically to before.

---

## Data Model

### New Type: `CurveSegment`
```typescript
interface CurveSegment {
  edge: number;        // edge index: curve from points[edge] → points[edge+1]
  cp: ProfilePoint;    // quadratic bezier control point [x, y] in mm
}
```

### Extended: `ProfileData`
```typescript
interface ProfileData {
  points: ProfilePoint[];
  closed: boolean;
  curves?: CurveSegment[];  // NEW — absent/empty = all straight
}
```

---

## Files Modified

### 1. `src/lib/warehouse/shape-editor-types.ts`
- Added `CurveSegment` interface
- Extended `ProfileData` with optional `curves` field
- Updated `computeProfileBBox()` to include curve control points in bounds
- Added `getCurveForEdge()` helper function

### 2. `src/components/admin/ProfileEditor.tsx`
- **Imports**: Added `CurveSegment`, `getCurveForEdge`
- **State**: Added `dragCurveIndex` for dragging curve control points
- **Update helper**: New `updateProfile(points, curves)` alongside existing `updatePoints`
- **Double-click handler**: `handleEdgeDoubleClick` — toggles curve on/off per edge
- **Edge click**: Remaps curve edge indices when inserting a point (split edge removes its curve)
- **Delete point**: Remaps/removes curves touching deleted point
- **Reset**: Clears curves array
- **SVG path**: Uses `Q` commands for curved edges, `L` for straight
- **Control point handles**: Purple diamond SVG elements with guide lines
- **Edge labels**: Show `~Nmm ⌒` for curved edges
- **Hint text**: Updated to mention double-click for curves

### 3. `src/spatial/profileExtrusion.ts`
- **Import**: Added `CurveSegment`, `getCurveForEdge`
- **`profileToShape(points, curves?)`**: Uses `THREE.Shape.quadraticCurveTo()` for curved edges
- **`buildExtrudedMesh(points, ext, color, curves?)`**: Passes curves through
- **`generateExtrusionGLB(points, ext, color, curves?)`**: Passes curves through

### 4. `src/spatial/moduleMeshBuilder.ts`
- **Import**: Added `CurveSegment` type
- **`extractShapeEditor()`**: Now extracts `profile.curves` from config jsonb
- **`buildModuleGroup()`**: Passes `shapeData.curves` to `buildExtrudedMesh`

### 5. `src/components/admin/WarehouseObjectEditor.tsx`
- **`handleGenerateMesh()`**: Passes `shapeEditorConfig.profile.curves` to `generateExtrusionGLB`

---

## User Interaction

| Action | Effect |
|--------|--------|
| **Click** on edge | Add vertex (existing behaviour) |
| **Double-click** on edge | Add quadratic curve (control point at midpoint + perpendicular offset) |
| **Double-click** curved edge | Remove curve (revert to straight) |
| **Drag** diamond handle | Adjust curve control point (snaps to 10mm grid) |
| **Right-click** diamond handle | Remove curve on that edge |
| **Reset to Rectangle** | Clears all curves |

---

## Backward Compatibility

- Old profiles without `curves` field → all edges straight (no change)
- `curves: []` or `curves: undefined` → identical to no curves
- jsonb round-trip: `warehouse-adapter.ts` stores/retrieves `shape_editor` as opaque jsonb — curves persist automatically
- Fallback chain unchanged: mesh_ref GLB → direct extrusion → cabinet_spec → default box
- `EditorContent.tsx` already snapshots entire `shapeEditor` into config — curves included

---

## Build Verification

```
✅ npx next build — passed
✅ No TypeScript errors
✅ No lint errors
```
