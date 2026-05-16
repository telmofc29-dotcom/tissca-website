# Phase 3B.1 — GLB Mesh Generation + Upload

**Status:** COMPLETE  
**Build:** PASS (no new errors or warnings)

---

## Summary

Added end-to-end GLB mesh generation from the 2D profile + extrusion config,
with upload to Supabase Storage and UI feedback in the Warehouse Object Editor.

**Flow:**  
Profile points + Extrusion config → `buildExtrudedMesh()` → Three.js Scene →
`GLTFExporter` (binary) → Blob → FormData → POST `/api/admin/warehouse-upload`
→ `asset-meshes/{uid}/{assetId}/profile.glb` → store `mesh_ref` + `mesh_generated_at`
in `shapeEditorConfig` → saved via `handleSave` into `planner_hints.shape_editor`.

---

## Files Changed

### 1. `src/app/api/admin/warehouse-upload/route.ts`
- **Change:** Added `'model/gltf-binary'` to `ALLOWED_MODEL_TYPES`
- **Why:** GLTFExporter outputs with MIME type `model/gltf-binary`; previously rejected

### 2. `src/spatial/profileExtrusion.ts`
- **Change:** Added `generateExtrusionGLB()` async function + GLTFExporter import
- **Signature:** `generateExtrusionGLB(points, ext, color) → Promise<Blob>`
- **Details:** Builds extruded mesh, wraps in Scene, exports binary GLB via GLTFExporter
- **Import:** `three/examples/jsm/exporters/GLTFExporter.js`

### 3. `src/components/admin/WarehouseObjectEditor.tsx`
- **New import:** `generateExtrusionGLB` from `@/spatial/profileExtrusion`
- **New state:** `meshStatus` — tracks `'idle' | 'generating' | 'uploading' | 'done' | 'error'`
- **New wrapper:** `updateShapeEditor()` — wraps `setShapeEditorConfig` to reset `meshStatus` on edits
- **New handler:** `handleGenerateMesh()` — full generate → upload → store mesh_ref flow
- **Section C3 additions:**
  - "Generate Mesh" / "Regenerate Mesh" button (disabled for new assets, during generation)
  - Status indicators: "Generating GLB…", "Uploading…", "✓ GLB uploaded", "✗ Generation failed"
  - Stale mesh warning when profile/extrusion edited after generation
  - Mesh reference display with timestamp

---

## UI States

| State | Button Label | Indicator |
|-------|-------------|-----------|
| No mesh | "Generate Mesh" | — |
| Generating | (disabled) | "Generating GLB…" |
| Uploading | (disabled) | "Uploading…" |
| Done | "Regenerate Mesh" | "✓ GLB uploaded" |
| Error | "Generate Mesh" | "✗ Generation failed" + error message |
| Stale | "Regenerate Mesh" | "⚠ Profile or extrusion may have changed…" |
| New asset | (disabled) | "Save the asset first before generating a mesh." |

---

## Stale Mesh Detection

When the user edits profile points (via ProfileEditor) or extrusion controls
(depth, direction, symmetric), the `updateShapeEditor` wrapper resets `meshStatus`
from `'done'` back to `'idle'`. This triggers the stale warning if a `mesh_ref`
already exists and the generation timestamp is > 5 seconds old.

---

## Data Flow

```
shapeEditorConfig.mesh_ref      → "asset-meshes/{uid}/{assetId}/profile.glb"
shapeEditorConfig.mesh_generated_at → "2025-01-30T12:34:56.789Z"
```

Both fields persist in `planner_hints.shape_editor` via the existing `handleSave`
merge logic. No schema migration required.

---

## Integration Points

- **moduleMeshBuilder.ts:** Already reads `shape_editor` from PlacedModule.config
  (Phase 3B fallback tier 1). The `mesh_ref` in shape_editor enables future
  GLB loading via `GLTFLoader` as an additional optimization path.
- **Storage proxy:** `/api/storage/asset-meshes/...` already serves signed URLs
  for the `asset-meshes` bucket.
- **EditorContent.tsx:** Already snapshots `shapeEditor` into `PlacedModule.config`
  at placement time.

---

## No Breaking Changes

- All existing upload flows unchanged
- `handleFileUpload` for thumbnails and manual model uploads untouched
- `handleSave` merge logic unchanged (shapeEditorConfig already merged)
- No schema migration required
- No new dependencies added (GLTFExporter ships with three.js)
