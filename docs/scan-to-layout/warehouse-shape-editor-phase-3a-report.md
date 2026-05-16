# Warehouse Shape Editor — Phase 3A Implementation Report

> Phase 3A: 2D profile polyline editor for the admin Warehouse Object Editor.
> Build verified: `npx next build` — **PASS, zero errors**.

---

## 1. Audit Summary

### WarehouseObjectEditor Section Order (Pre-3A)

| # | Section | Purpose |
|---|---------|---------|
| A | Identity | Name, category, subtype, source, platform |
| B | Dimensions | Width, depth, height, front_clearance (mm) |
| C | Placement & Planner Behaviour | Placement mode, room types, services, planner_hints JSON editor |
| C2 | Parametric Builder | CabinetSpec form + SVG preview (conditional, blue border) |
| D | Presentation | Material, notes, thumbnail upload, 3D model upload |
| E | Preview | Visual preview + data summary |
| F | Actions | Save / Cancel / Delete |

### Insertion Point

Shape Editor inserted as **Section C3** between C2 (Parametric Builder) and D (Presentation).

### Reusable Components

| Component / Pattern | Reused? | Notes |
|---------------------|---------|-------|
| ParametricBuilder props pattern | ✅ | Same `(config, onChange)` interface |
| ParametricPreview SVG scaling | ✅ | Same viewport/scale logic for ProfileEditor |
| `snapToGrid()` from snapping.ts | Pattern reused | ProfileEditor has its own inline snap (10mm grid) |
| planner_hints merge pattern | ✅ | Identical merge in handleSave |
| WarehouseAsset passthrough field | ✅ | Added `shapeEditor?: unknown` alongside `cabinetSpec` |
| warehouse-adapter.ts preservation | ✅ | Same `rowToAsset` / `assetToRow` pattern |

---

## 2. Files Changed

### New Files

| File | Purpose |
|------|---------|
| `src/lib/warehouse/shape-editor-types.ts` | `ShapeEditorConfig`, `ProfileData`, `ProfileBBox`, validation, bbox computation, defaults |
| `src/components/admin/ProfileEditor.tsx` | SVG-based 2D polyline editor with drag, add, delete, grid, dimensions |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/warehouse/warehouse-types.ts` | Added `shapeEditor?: unknown` to `WarehouseAsset` |
| `src/lib/warehouse/warehouse-adapter.ts` | Preserve `shape_editor` in `rowToAsset()` and `assetToRow()` |
| `src/components/admin/WarehouseObjectEditor.tsx` | Import ProfileEditor + types, add `shapeEditorConfig` state, Section C3 JSX, merge into save |

---

## 3. Data Model

### planner_hints.shape_editor

```json
{
  "version": 1,
  "mode": "profile_polyline",
  "profile": {
    "points": [[0, 0], [600, 0], [600, 870], [0, 870]],
    "closed": true
  },
  "bbox": {
    "width": 600,
    "height": 870
  }
}
```

### Storage Path

```
warehouse_assets.planner_hints (jsonb)
  └── shape_editor: ShapeEditorConfig
```

No schema migration required. Uses existing `planner_hints` jsonb column.

### Adapter Flow

```
Supabase row
  → rowToAsset(): planner_hints.shape_editor → asset.shapeEditor
  → assetToRow(): asset.shapeEditor → planner_hints.shape_editor
```

---

## 4. What Phase 3A Can Do

### Profile Editor Capabilities

| Feature | Status |
|---------|--------|
| Create closed polyline profile | ✅ |
| Drag vertex handles (pointer capture) | ✅ |
| Click edge to insert new point | ✅ |
| Delete point (right-click, Delete key, table button) | ✅ |
| Grid snapping (10mm increments) | ✅ |
| Reset to rectangle (matches asset W×H) | ✅ |
| Validate profile (min 3 pts, no dupes, no self-intersection, non-zero area) | ✅ |
| Dimension readout (point count, bbox W×H) | ✅ |
| Edge length labels (mm) | ✅ |
| Asset dimension reference overlay (dashed blue rectangle) | ✅ |
| Origin axes marker (X red, Y green) | ✅ |
| Point coordinates table (expandable) | ✅ |
| Persist to planner_hints.shape_editor on save | ✅ |
| Load from existing planner_hints.shape_editor | ✅ |
| Remove profile (reverts to null) | ✅ |
| Non-shape assets unaffected | ✅ |
| Backward compatible with existing assets | ✅ |

### What It Does NOT Do (By Design)

| Not Included | Phase |
|--------------|-------|
| 3D extrusion preview | Phase 3B |
| GLB mesh generation | Phase 3B |
| Arcs / bezier curves | Phase 3C |
| Direct 3D editing | Phase 4 |
| Planner mesh consumption of shape_editor | Phase 3B |
| Undo/redo command stack | Phase 3B |

---

## 5. What Remains for Phase 3B (Extrusion)

### Priority Tasks

1. **Extrusion controls** — depth (mm), direction (x/y/z), symmetric toggle
2. **THREE.ExtrudeGeometry** — convert profile points to Shape → extrude
3. **GLB export** — GLTFExporter → upload to `asset-meshes` bucket
4. **mesh_ref storage** — `planner_hints.shape_editor.mesh_ref` → path to GLB
5. **Planner consumption** — `moduleMeshBuilder.ts` loads GLB via model_ref instead of box geometry
6. **3D preview** — live extrusion preview in editor (optional, could be SVG isometric)
7. **Undo/redo** — command stack for profile editing operations

### Data Model Extension (Phase 3B)

```json
{
  "version": 1,
  "mode": "profile_polyline",
  "profile": { ... },
  "bbox": { ... },
  "extrusion": {
    "depth": 580,
    "direction": "z",
    "symmetric": false
  },
  "mesh_ref": "asset-meshes/{owner_id}/{asset_id}/profile.glb"
}
```

---

## 6. Build Verification

```
npx next build → PASS
- ✓ Compiled successfully
- ✓ Generating static pages (161/161)
- Zero TypeScript errors
- All existing functionality preserved
```
