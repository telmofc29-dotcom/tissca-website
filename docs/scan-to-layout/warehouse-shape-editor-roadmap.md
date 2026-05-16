# Warehouse Shape Editor — Architecture & Roadmap

> **Status:** Planning only — not yet in implementation.
> **Date:** 2 April 2026
> **Author:** TISSCA Engineering

---

## 1. Product Scope

### What this is

A future admin-facing shape editor that allows TISSCA staff (and eventually power-users) to create arbitrary warehouse objects beyond the structured parametric templates. Think "mini SketchUp" scoped to the constraints of a kitchen/joinery design platform — not a general-purpose 3D modelling tool.

### What it is NOT

- Not a replacement for the parametric builder (Phase 2)
- Not a general 3D modelling application
- Not exposed to end-users in the initial release
- Not a real-time collaborative editor

### Target use cases

| Use case | Example |
|---|---|
| Custom profile extrusions | Curved island top, L-shaped breakfast bar, angled peninsula |
| Non-rectangular objects | Bay window seat, corner curved worktop, porthole window |
| Scanned object refinement | Clean up a LiDAR-scanned appliance into a clean warehouse asset |
| Bespoke fittings | Bespoke wine rack, custom shelf unit with odd dimensions |
| Admin library enrichment | Quickly author objects that have no parametric template match |

---

## 2. Why Phase 1 and Phase 2 Come First

The shape editor depends on foundations that Phase 1 and Phase 2 establish. Without them, a shape editor would be building on sand.

### Phase 1 (complete): Warehouse Object Editor

Delivered:
- Admin CRUD for `warehouse_assets` via Supabase
- File upload pipeline: `asset-thumbnails` (2MB, jpeg/png/webp) + `asset-meshes` (25MB, ply/usdz)
- Storage proxy with signed URLs (`/api/storage/[...path]`)
- Reference format: `<bucket>/<owner_id>/<asset_id>/<filename>`
- Round-trip via `warehouse-adapter.ts` (`rowToAsset` ↔ `assetToRow`)
- `planner_hints` jsonb as the extensible metadata store

**Shape editor dependency:** The editor must store its output as a `warehouse_assets` row. Phase 1 proves this pipeline works end-to-end.

### Phase 2 (complete): Parametric Builder

Delivered:
- `CabinetSpec` stored in `planner_hints.cabinet_spec`
- 7 cabinet types, 9 sub-specs (carcass, plinth, doors, drawers, shelves, worktop, handle, divisions, finish)
- SVG front + side elevation renderer (`ParametricPreview`)
- Auto-eligibility mapping (`subtypeToCabinetType`)
- Zero schema migration — pure jsonb extension

**Shape editor dependency:** The parametric builder proves that structured object descriptions can:
1. Live inside `planner_hints` without schema changes
2. Drive visual previews (SVG today, mesh tomorrow)
3. Feed the spatial engine via the existing adapter
4. Round-trip through the Supabase pipeline

### What the shape editor adds on top

The shape editor introduces **freeform geometry** — the one thing parametric specs cannot express. It does this by storing a shape definition (profile polyline or mesh) alongside or instead of a `CabinetSpec`.

---

## 3. 2D Profile Editing vs Direct 3D Editing

This is the single most important architectural decision. The two approaches have radically different complexity.

### Option A: 2D Profile → Extrude (recommended for Phase 3)

The admin draws a 2D polyline/spline profile (top-down or front-elevation), then the system extrudes it to a specified depth/height.

```
    ┌──────────────┐
    │  2D profile   │  ← SVG/Canvas editor
    │  (polyline)   │
    └──────┬───────┘
           │ extrude(depth)
    ┌──────▼───────┐
    │  3D mesh      │  ← generated
    │  (BufferGeom) │
    └──────────────┘
```

**Advantages:**
- Far simpler UI — 2D canvas with vertex handles, not 3D camera/controls
- Deterministic mesh output — no degenerate geometry
- Maps to real joinery: most cabinet shapes are profile extrusions
- Small data payload: store polyline points + extrusion config, not full mesh
- Works in a browser without GPU requirements for the editing phase

**Disadvantages:**
- Cannot express shapes that aren't extrudable (e.g. tapered surfaces, compound curves)
- Requires a separate approach for sculpted objects

**Stored as:**
```json
{
  "shape_editor": {
    "version": 1,
    "mode": "profile_extrude",
    "profile": {
      "points": [[0,0], [600,0], [600,870], [0,870]],
      "closed": true,
      "curves": [{ "index": 2, "type": "arc", "radius": 50 }]
    },
    "extrusion": {
      "depth": 580,
      "direction": "y",
      "symmetric": false
    }
  }
}
```

### Option B: Direct 3D Mesh Editing (Phase 4+)

The admin manipulates vertices/faces in a 3D viewport à la SketchUp/Blender.

**Advantages:**
- Can express any shape
- More intuitive for users with 3D modelling experience

**Disadvantages:**
- Enormous UI complexity (selection, transformation, snapping, undo in 3D)
- Degenerate geometry risk (non-manifold, inverted normals, zero-area faces)
- Much larger data payloads
- Requires serious GPU for editing, not just viewing
- Three.js editor patterns are immature compared to native apps

### Recommendation

**Phase 3 = 2D profile extrusion.** This covers 90%+ of joinery shapes. Direct 3D editing is a Phase 4+ concern and may be better served by an external tool (Blender/SketchUp) with PLY/USDZ import.

---

## 4. Mesh/Model Generation Options

Once a shape definition exists (profile polyline or parametric spec), we need to generate renderable geometry.

### Option 1: Client-side generation (Three.js)

Generate `THREE.ExtrudeGeometry` or `THREE.BufferGeometry` directly in the browser.

- **Pro:** Zero server cost, instant preview, works offline
- **Pro:** Three.js `ExtrudeGeometry` already supports profile + depth + bevel
- **Con:** Generated mesh is JavaScript-only — not portable to iOS/Android SceneKit/ARKit
- **Con:** No USDZ/PLY export without additional libraries

**Current state:** `src/spatial/moduleMeshBuilder.ts` already generates box-based Three.js meshes for cabinet modules. Extending this to profile-extruded shapes is a natural path.

### Option 2: Server-side generation (API)

Send shape definition to an API route that generates a mesh file (PLY/USDZ/GLB) and stores it in `asset-meshes`.

- **Pro:** Produces portable mesh files consumable by all platforms
- **Pro:** Can use heavier geometry libraries (e.g. OpenCascade via WASM, Manifold)
- **Con:** Latency — round-trip to generate + upload
- **Con:** Server cost (CPU for geometry computation)

### Option 3: Hybrid (recommended)

1. **Client generates Three.js geometry** for instant preview in the admin editor
2. **On save, client exports GLB** via `THREE.GLTFExporter` (already available in Three.js ecosystem)
3. **Upload GLB to `asset-meshes` bucket** using existing upload pipeline
4. **Cross-platform clients** load the GLB file (Three.js on web, SceneKit on iOS, Filament on Android)

This avoids server-side geometry generation entirely while producing portable mesh files.

```
 Editor (browser)
   │
   ├─ THREE.ExtrudeGeometry(profile, depth) → live preview
   │
   └─ on save:
       ├─ THREE.GLTFExporter → .glb blob
       ├─ upload to asset-meshes bucket
       ├─ store ref in planner_hints.shape_editor.mesh_ref
       └─ store profile polyline in planner_hints.shape_editor.profile
```

---

## 5. Parametric + Freeform Hybrid Strategy

The warehouse must support three asset authoring tiers. Each tier feeds the same downstream pipeline.

```
    Tier 1: Static              Tier 2: Parametric          Tier 3: Freeform
    (Phase 1)                  (Phase 2)                   (Phase 3+)
    ┌──────────────┐           ┌──────────────┐            ┌──────────────┐
    │ Manual dims  │           │ CabinetSpec  │            │ Profile +    │
    │ + upload     │           │ + SVG preview│            │ Extrude      │
    └──────┬───────┘           └──────┬───────┘            └──────┬───────┘
           │                          │                           │
           └──────────┬───────────────┴───────────────────────────┘
                      │
               ┌──────▼───────┐
               │ warehouse_   │  ← same table
               │ assets row   │
               ├──────────────┤
               │ planner_hints│  ← stores cabinet_spec OR shape_editor
               │ (jsonb)      │
               ├──────────────┤
               │ thumbnail_ref│  ← SVG snapshot or uploaded image
               │ (text)       │
               └──────┬───────┘
                      │
               ┌──────▼───────┐
               │ Planner /    │  ← consumers don't care about authoring tier
               │ Layout       │
               │ Engine       │
               └──────────────┘
```

### Detection strategy

The adapter already reads `planner_hints` and unpacks it. Adding a tier check:

```typescript
// In warehouse-adapter.ts
const hints = row.planner_hints as Record<string, unknown>;

if (hints.shape_editor) {
  // Tier 3: freeform — load mesh from shape_editor.mesh_ref
} else if (hints.cabinet_spec) {
  // Tier 2: parametric — generate geometry from CabinetSpec
} else {
  // Tier 1: static — use box geometry from width/depth/height
}
```

### Planner integration

The spatial engine (`placementRules.ts`, `collision.ts`, `snapping.ts`) operates on bounding boxes. A freeform object's bounding box is derived from the profile extents + extrusion depth, so collision detection works without changes. The 3D renderer loads the mesh file for visual fidelity while the planner uses the bbox for logic.

---

## 6. Backend / Storage Model

### No schema migration required

All shape data fits in the existing `planner_hints` jsonb column.

| Data | Storage location |
|---|---|
| Shape definition (polyline + extrusion config) | `planner_hints.shape_editor` |
| Generated mesh file (GLB) | `asset-meshes` bucket, ref in `planner_hints.shape_editor.mesh_ref` |
| Thumbnail (auto-generated SVG snapshot) | `asset-thumbnails` bucket, ref in `thumbnail_ref` column |
| Cabinet spec (if hybrid: parametric + custom profile) | `planner_hints.cabinet_spec` |
| Bounding box override | `planner_hints.shape_editor.bbox` (if profile extends beyond width×depth×height) |

### Example row state for a freeform object

```json
{
  "name": "Curved Island Top",
  "category": "room_elements",
  "subtype": "island",
  "width": 1800,
  "depth": 900,
  "height": 910,
  "planner_hints": {
    "shape_editor": {
      "version": 1,
      "mode": "profile_extrude",
      "profile": {
        "points": [[0,0],[1800,0],[1800,900],[900,900]],
        "closed": true,
        "curves": [{"index": 2, "type": "arc", "radius": 450}]
      },
      "extrusion": {"depth": 910, "direction": "z"},
      "mesh_ref": "asset-meshes/abc123/curved-island.glb",
      "bbox": {"width": 1800, "depth": 900, "height": 910}
    },
    "material_color": "#78716C"
  },
  "thumbnail_ref": "asset-thumbnails/abc123/curved-island.png"
}
```

### Sync version

`warehouse_assets.sync_version` already exists. Each save from the shape editor increments it. Mobile clients use `sync_version` to detect stale cache.

---

## 7. Cross-Platform Consumption

### Current state

| Platform | Rendering stack | Model format support |
|---|---|---|
| Web | Three.js r0.172 via @react-three/fiber 8.18 | Native (BufferGeometry), GLB (GLTFLoader), PLY (PLYLoader) |
| iOS | SceneKit / RealityKit (future) | USDZ (native), GLB (via ModelIO) |
| Android | Filament / SceneView (future) | GLB (native), USDZ (limited) |

### Recommended portable format: GLB

GLB (binary glTF) is the only format with native or near-native support on all three platforms. The shape editor should export GLB.

### Consumption flow

```
Platform boot
  │
  ├─ Fetch warehouse_assets rows (via API or Supabase SDK)
  │
  ├─ For each asset with planner_hints.shape_editor.mesh_ref:
  │     ├─ Web:     GLTFLoader.load(signedUrl)
  │     ├─ iOS:     MDLAsset(url:) or SCNScene(url:)
  │     └─ Android: ModelRenderable.builder().setSource(uri)
  │
  └─ For assets without mesh_ref:
        └─ Generate box/parametric geometry from dims + CabinetSpec
```

### Offline fallback

If mesh file is unavailable (no network, bucket error), all platforms fall back to box geometry from `width × depth × height`. The planner continues working; only visual fidelity degrades.

---

## 8. Risks and Complexity

### High risk

| Risk | Impact | Mitigation |
|---|---|---|
| 2D editing UX complexity | Profile editor alone is a significant UI project (vertex handles, curve editing, undo/redo, snapping) | Start with polyline-only, no curves. Add arc/bezier in a sub-phase |
| Degenerate profiles | Self-intersecting polylines produce broken meshes | Validate winding order + intersection checks before extrusion |
| GLB export quality | `THREE.GLTFExporter` may produce large files or lose material data | Test with target shapes early; set a 5MB max per GLB |
| Mobile mesh loading performance | Loading many custom GLBs in a room layout may exceed memory | LOD system: use box geometry beyond camera distance threshold; limit custom meshes per layout |

### Medium risk

| Risk | Impact | Mitigation |
|---|---|---|
| UX confusion: 3 authoring tiers | Admin may not understand when to use static vs parametric vs freeform | Guided flow: auto-suggest parametric for eligible subtypes, offer freeform only when parametric doesn't fit |
| Mesh cache invalidation on mobile | Edited shape → new GLB → old cached version on device | `sync_version` check on each app launch; background re-download if stale |
| Browser memory during editing | Complex profile + live 3D preview may OOM on low-end devices | Throttle preview updates; defer 3D preview to "Generate Preview" button |

### Low risk

| Risk | Impact | Mitigation |
|---|---|---|
| `planner_hints` column growing large | Many shape definitions + specs per asset | Monitor p95 row size; split mesh metadata to separate column only if > 10KB per row |
| Bucket storage cost | Many GLB files at 1-5MB each | Acceptable at current scale; compress GLBs with Draco if > 1000 custom assets |

---

## 9. Recommended Phased Roadmap

### Phase 3A: Profile Editor Foundation

**Scope:** 2D polyline editor on canvas (no curves yet)

- HTML5 Canvas or SVG-based 2D editor component
- Vertex placement, drag, delete
- Closed polyline constraint
- Grid snapping (configurable: 10mm, 25mm, 50mm steps)
- Undo/redo stack (command pattern)
- Profile validation (no self-intersection, minimum 3 vertices)
- Store polyline in `planner_hints.shape_editor.profile`
- Integration with existing WarehouseObjectEditor as a new section (like parametric builder)

**Estimated complexity:** Medium-high — the editor UI alone is significant.

### Phase 3B: Extrusion + Preview

**Scope:** Generate 3D geometry from profile + depth

- `THREE.ExtrudeGeometry` from polyline + depth
- Live 3D preview in editor (reuse `@react-three/fiber` stack)
- Auto-generate SVG thumbnail for list view
- Auto-update `width`, `depth`, `height` from profile bounding box
- GLB export via `THREE.GLTFExporter`
- Upload GLB to `asset-meshes` on save
- Adapter update: `shape_editor.mesh_ref` → GLTFLoader in ThreeDTab

### Phase 3C: Curves + Refinement

**Scope:** Arc and bezier support in the profile editor

- Arc segments (radius + centre)
- Quadratic/cubic bezier control points
- Curve resolution setting (segments per curve for mesh quality)
- Profile templates: pre-draw common shapes (L, U, curved-front) that the admin can modify
- Multi-profile support: separate top and front profiles for compound shapes

### Phase 4: Direct 3D Editing (future, possibly external)

**Scope:** Full 3D vertex/face manipulation

- This may be better served by integrating an external tool (e.g. embed a simplified three.js editor, or import from Blender/SketchUp)
- Alternatively: vertex-level editing of extruded output (push/pull faces)
- Evaluated after Phase 3 ships and usage patterns reveal whether freeform needs exceed profile extrusion

---

## 10. Dependencies and Prerequisites

| Dependency | Status | Notes |
|---|---|---|
| Phase 1: Warehouse Object Editor | ✅ Complete | CRUD, upload, storage proxy |
| Phase 2: Parametric Builder | ✅ Complete | CabinetSpec, SVG preview, auto-eligibility |
| `planner_hints` jsonb column | ✅ Production | No migration needed |
| `asset-meshes` bucket | ✅ Configured | 25MB, PLY/USDZ/octet-stream — may need GLB MIME type added |
| Three.js ExtrudeGeometry | ✅ Available | Part of Three.js core (r0.172) |
| THREE.GLTFExporter | ⚠️ Needs install | `three/examples/jsm/exporters/GLTFExporter` — bundled with three.js, but may need explicit import setup |
| Mobile GLB loading | ⚠️ Not yet implemented | iOS/Android apps are React Native — need `expo-three` or native SceneKit bridge |
| Undo/redo framework | ❌ Not built | Needed for 2D profile editor; command-pattern stack |

---

## 11. Decision Log

| # | Decision | Rationale |
|---|---|---|
| D1 | 2D profile extrusion before 3D editing | 90%+ of joinery shapes are extrudable; 10× less UI complexity |
| D2 | GLB as the portable mesh format | Only format with native/near-native support on Web + iOS + Android |
| D3 | Client-side mesh generation (no server) | Avoids latency, server cost, and deployment complexity |
| D4 | Store shape definition in `planner_hints` jsonb | Proven extensible via Phase 2; zero migration |
| D5 | Bounding box for planner, mesh for visuals | Keeps spatial engine simple; visual fidelity is a rendering concern |
| D6 | Admin-only initially | Reduces UX polish requirements; power-user/client access later |

---

*This document is the source of truth for Shape Editor planning. Implementation begins only after Phase 2 is production-verified and this roadmap is reviewed.*
