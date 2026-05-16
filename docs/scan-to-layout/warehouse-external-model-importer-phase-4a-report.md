# Phase 4A: External Model Importer — Implementation Report

**Date:** 2 April 2026
**Status:** ✅ Complete — Build verified

---

## Overview

Phase 4A adds an admin-only External Model Importer to the TISSCA warehouse system. It allows admin users to import existing 3D models (GLB/glTF) and create structured, planner-compatible warehouse assets — complete with dimensions, category, placement, and metadata.

Imported models are **not just files**. They become proper warehouse assets with all fields the planning engine requires. The imported mesh is for visual fidelity; the metadata drives planner logic.

---

## Audit Summary

| Component | Classification | Reused? |
|-----------|---------------|---------|
| Upload endpoint (`warehouse-upload/route.ts`) | ✅ Production | Fully reused — no changes |
| Storage proxy (`storage/[...path]/route.ts`) | ✅ Production | Fully reused — no changes |
| CRUD API (`warehouse-assets/route.ts`) | ✅ Production | Fully reused — no changes |
| Warehouse adapter (`warehouse-adapter.ts`) | ✅ Production | Fully reused — no changes |
| Warehouse types (`warehouse-types.ts`) | ✅ Production | No changes needed |
| Planner mesh consumption (`moduleMeshBuilder.ts`) | ✅ Production | No changes needed — mesh_ref pipeline works |
| 3D preview in admin | ⚠️ Missing | **New** — imperative Three.js preview (no R3F SSR issues) |
| Admin route for import | ⚠️ Missing | **New** — `/admin/warehouse/import` |

**Key finding:** Zero API changes required. The existing upload pipeline, storage proxy, and CRUD endpoints handle the importer flow entirely.

---

## Files Created

### 1. `src/components/admin/ModelImporter.tsx`
Full client component (~650 lines) implementing:

**Section A — File Upload:**
- Drag-and-drop zone with file picker fallback
- GLB/glTF validation (extension + size)
- Client-side parsing via `GLTFLoader.parse()`
- Auto-extract: bounding box, mesh count, triangle count, unit detection

**Section B — Model Preview & Inspection:**
- Live 3D preview using imperative Three.js (WebGLRenderer)
- Auto-rotating camera around the model
- Grid floor + axes helper for orientation reference
- Model stats: mesh count, triangle count, file size, detected unit
- Quality warnings (high triangle count, zero meshes)

**Section C — Normalisation Controls:**
- **C.1 Identity:** Name, category, subtype
- **C.2 Unit & Orientation:** Unit system selector (metres/cm/mm) with auto-detection, Y-rotation (0°/90°/180°/270°) with live dimension recalculation
- **C.3 Dimensions:** Width/depth/height in mm, auto-populated from bounding box, manually overridable
- **C.4 Placement:** Placement mode, wall-mounted/freestanding flags
- **C.5 Room Compatibility:** Multi-select room type buttons
- **C.6 Additional Details:** Material name, notes

**Section D — Save to Warehouse:**
- Uploads GLB to `asset-meshes` bucket via existing endpoint
- Creates warehouse asset via existing CRUD endpoint
- Stores `imported_model` metadata in `planner_hints` with:
  - original filename, file size, detected unit
  - mesh count, triangle count
  - Y rotation applied, import date
- Creates rectangular `shape_editor` config from dimensions (enables extrusion fallback)
- Sets `mesh_ref` pointing to uploaded GLB
- Sets `source: 'imported'`
- Redirects to asset edit page on success

### 2. `src/app/(admin)/admin/warehouse/import/page.tsx`
Server component wrapper with:
- Breadcrumb navigation
- Dynamic import of `ModelImporter` with `ssr: false` (Three.js requires browser)
- Loading state placeholder

### 3. `src/app/(admin)/admin/warehouse/page.tsx` (modified)
- Added "Import Model" button next to existing "New Object" button in warehouse list header

---

## Formats Supported

| Format | Status | Notes |
|--------|--------|-------|
| **GLB** (Binary glTF) | ✅ Supported now | Canonical runtime format. Parsed client-side. |
| **glTF** (JSON + bin) | ✅ Supported now | Parsed via same GLTFLoader |
| **SketchUp (.skp)** | 📋 Future work | Export to GLB from SketchUp first |
| **OBJ, FBX, STEP** | 📋 Future work | Convert to GLB using Blender/tools first |

---

## Normalisation Workflow

```
Upload GLB ─→ Parse (GLTFLoader) ─→ Extract BBox ─→ Detect Unit
     │                                                    │
     │    ┌────── Admin reviews & adjusts ────────┐      │
     │    │ · Confirm/change unit system           │      │
     │    │ · Set Y rotation for orientation       │◄─────┘
     │    │ · Override dimensions if needed         │
     │    │ · Set category/subtype                 │
     │    │ · Set placement mode                   │
     │    │ · Add room compatibility               │
     │    │ · Add material + notes                 │
     │    └────────────────────────────────────────┘
     │                       │
     ▼                       ▼
Upload to               Create Warehouse
asset-meshes             Asset (POST)
     │                       │
     └──── mesh_ref ────────►│
                             │
                             ▼
                    Asset in warehouse
                    (planner-ready)
```

---

## What is Saved into warehouse_assets / planner_hints

### warehouse_assets row:
| Field | Value |
|-------|-------|
| name | Admin-provided name |
| category | Selected category |
| subtype | Selected subtype |
| source | `'imported'` |
| source_platform | `'web'` |
| width/depth/height | Normalised dimensions (mm) |
| placement_mode | Admin-selected |
| is_wall_mounted | Admin-set |
| is_freestanding | Admin-set |
| compatible_room_types | Admin-selected |
| material_name | Admin-provided |
| notes | Admin-provided |
| planner_hints | See below |

### planner_hints jsonb:
```jsonc
{
  "imported_model": {
    "original_filename": "cabinet.glb",
    "original_size": 1234567,
    "detected_unit": "metres",
    "mesh_count": 5,
    "triangle_count": 12000,
    "y_rotation_applied": 0,
    "import_date": "2026-04-02T12:00:00.000Z"
  },
  "shape_editor": {
    "version": 1,
    "mode": "profile_polyline",
    "profile": {
      "points": [[0,0],[600,0],[600,870],[0,870]],
      "closed": true
    },
    "bbox": { "width": 600, "height": 870 },
    "extrusion": { "depth": 580, "direction": "z", "symmetric": false },
    "mesh_ref": "asset-meshes/{owner_id}/{timestamp}/imported.glb",
    "mesh_generated_at": "2026-04-02T12:00:00.000Z"
  }
}
```

### Planner consumption:
- **Tier 1a (mesh_ref GLB):** Loads the imported GLB via `loadMeshRefGLB()` for full visual fidelity
- **Tier 1b (shape_editor extrusion):** Rectangular extrusion fallback if GLB fails to load
- No changes to fallback chain required

---

## Future Work

| Item | Priority | Notes |
|------|----------|-------|
| SketchUp native import (.skp) | Medium | Requires server-side conversion; current safe path: export to GLB from SketchUp |
| Auto-thumbnail generation | Low | Render snapshot from Three.js preview scene |
| OBJ/FBX/STEP support | Low | Use Blender conversion or server-side tool chain |
| Batch import (multiple files) | Medium | Current UI handles one model at a time |
| Model optimisation (decimation) | Low | Auto-reduce triangle count for planner performance |
| Material extraction from GLB | Low | Parse PBR materials → map to warehouse material system |
| Automatic orientation detection | Low | Heuristic-based front-face detection |

---

## Build Verification

```
✅ npx next build — passed
✅ /admin/warehouse/import route: 101 kB (345 kB with shared chunks)
✅ No TypeScript errors
✅ No lint errors
✅ Existing warehouse editor, upload, storage proxy, planner — all unchanged
```
