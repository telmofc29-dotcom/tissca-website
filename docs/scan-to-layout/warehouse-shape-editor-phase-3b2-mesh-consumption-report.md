# Phase 3B.2 — Mesh Ref GLB Consumption in Web Planner

**Status:** COMPLETE  
**Build:** PASS (zero new errors)

---

## Audit Summary

The web planner renders placed modules via `buildModuleGroup()` in
`moduleMeshBuilder.ts`, called synchronously from `ThreeDTab.tsx` inside a
`useEffect` loop. The function returns a `THREE.Group` immediately. GLB loading
is inherently async, so the design uses a **placeholder + async swap** pattern:

1. Direct extrusion is always built first (instant, synchronous)
2. If `mesh_ref` exists, GLB is fetched and parsed asynchronously
3. On success, placeholder meshes are removed and GLB children inserted
4. On failure (network, parse, stale ref), placeholder remains — zero visual breakage

No changes to `ThreeDTab.tsx` were required. The async load is transparent to
the caller.

---

## Files Changed

### 1. `src/spatial/moduleMeshBuilder.ts`

**New imports:**
- `GLTFLoader` from `three/examples/jsm/loaders/GLTFLoader.js`

**New functions:**

- `extractMeshRef(mod: PlacedModule): string | null`  
  Safely extracts `config.shape_editor.mesh_ref` if it's a non-empty string.

- `loadMeshRefGLB(group: THREE.Group, meshRef: string): void`  
  Fire-and-forget async loader:
  1. `fetch('/api/storage/' + meshRef)` — follows 302 to signed Supabase CDN URL
  2. Reads `ArrayBuffer` from response
  3. `GLTFLoader.parse(buffer)` — parses binary GLB
  4. Removes placeholder children (`shape_editor_extrusion` + `shapeEditorEdges`)
  5. Adds GLB scene children with `userData.part = 'mesh_ref_glb'`
  6. Sets `group.userData.meshRefLoaded = true`
  
  **Safety checks:**
  - `group.parent` checked after each async step (bails if group was disposed)
  - On any error: logs warning, sets `group.userData.meshRefFailed = true`, placeholder stays

**Modified `buildModuleGroup()`:**
- Shape editor branch now triggers `loadMeshRefGLB()` when `extractMeshRef()` returns a path
- Direct extrusion is still built first as the immediate placeholder
- Comment blocks updated to reflect 4-tier fallback chain

---

## Mesh Ref Consumption Flow

```
buildModuleGroup(mod)
│
├─ extractShapeEditor(mod) → found?
│  ├─ YES:
│  │   ├─ Build direct extrusion mesh (SYNC, instant placeholder)
│  │   ├─ Add wireframe edges
│  │   ├─ Position group in world space
│  │   ├─ extractMeshRef(mod) → mesh_ref found?
│  │   │   ├─ YES: loadMeshRefGLB(group, meshRef)  [ASYNC fire-and-forget]
│  │   │   │   ├─ fetch /api/storage/{meshRef} → 302 → signed URL
│  │   │   │   ├─ arrayBuffer → GLTFLoader.parse
│  │   │   │   ├─ SUCCESS: remove extrusion placeholder → add GLB children
│  │   │   │   └─ FAILURE: placeholder stays, warn logged
│  │   │   └─ NO: extrusion is final visual
│  │   └─ RETURN group
│  │
│  └─ NO:
│      ├─ extractCabinetSpec → parametric box (tier 2)
│      └─ default box geometry (tier 3)
```

---

## Final Fallback Chain

| Tier | Source | Render | Timing |
|------|--------|--------|--------|
| 1a | `shape_editor.mesh_ref` | Loaded GLB from storage | Async (replaces 1b) |
| 1b | `shape_editor` profile + extrusion | Direct `ExtrudeGeometry` mesh | Sync (immediate) |
| 2 | `cabinet_spec` | Parametric box with doors/drawers/shelves | Sync |
| 3 | (none) | Default box based on category | Sync |

Tier 1a **upgrades** tier 1b when the GLB loads. If 1a fails, 1b remains. All
tiers are preserved — older layouts without `shape_editor` still render
correctly via tiers 2 and 3.

---

## What Works Now

- Shape editor assets with a generated GLB display the GLB model in the planner
- Zero flicker: extrusion appears immediately, GLB swaps in when loaded
- Failed/missing GLB loads fall back silently to direct extrusion
- Assets without shape_editor still use cabinet_spec or default box
- Older saved layouts render correctly (no config = tier 3)
- Assets with shape_editor but no mesh_ref = direct extrusion (tier 1b)
- Storage proxy auth works via cookies (same-origin fetch)
- No ThreeDTab changes required — transparent to caller

---

## What Remains

### Phase 3C — Curves + Arcs
- Extend profile editor to support arc segments
- Update `profileToShape()` to emit `quadraticCurveTo` / `bezierCurveTo`

### Mobile Consumption
- Mobile planner does not yet consume `shape_editor` or `mesh_ref`
- When implemented: fetch GLB via storage proxy, load with platform GLTFLoader
- `mesh_ref` path is platform-agnostic (`asset-meshes/{uid}/{assetId}/profile.glb`)

### Optional Optimizations
- GLB cache (avoid re-fetching on scene rebuild)
- Loading indicator overlay on the module while GLB loads
- `GLTFLoader` DRACOLoader extension for compressed meshes
- Preload mesh_ref GLBs when layout opens (batch fetch)

---

## No Breaking Changes

- `buildModuleGroup` signature unchanged (still sync, returns `THREE.Group`)
- ThreeDTab untouched — no caller changes needed
- Direct extrusion rendering path fully preserved
- Cabinet spec rendering path fully preserved
- Default box rendering path fully preserved
- No schema migration required
- No new npm dependencies (GLTFLoader ships with three.js)
