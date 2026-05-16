# Warehouse Authoring Pipeline — Verification Report

> Generated after full audit + surgical integration fixes.
> Build verified: `npx next build` — **PASS, zero errors**.

---

## 1. End-to-End Pipeline Verification

### Data Flow (Verified)

```
Admin creates asset (WarehouseObjectEditor)
  → POST /api/workspace/warehouse-assets
    → warehouse_assets row (24 cols, planner_hints jsonb)

Planner opens scan-to-layout editor
  → GET /api/workspace/warehouse-assets (EditorContent.tsx L155-175)
    → mergeWarehouseAssets() builds WarehouseAsset[]
      → rowToAsset() now preserves cabinet_spec ✅

User places module (drag or tap)
  → handleDropModule() / handleWarehouseTap()
    → PlacedModule created with assetId + config.cabinet_spec ✅

3D view renders
  → buildModuleGroup(mod) reads mod.config.cabinet_spec ✅
    → shelf count, door count, drawer fronts, plinth height from spec
    → Falls back to hardcoded defaults when no spec present

Layout saved
  → room_layouts.layout_data (jsonb)
    → PlacedModule[] with assetId + config preserved ✅
```

### Files Modified (This Pass)

| File | Change | Purpose |
|------|--------|---------|
| `src/lib/warehouse/warehouse-types.ts` | Added `cabinetSpec?: unknown` | Type carries cabinet_spec through pipeline |
| `src/lib/warehouse/warehouse-adapter.ts` | `rowToAsset()` + `assetToRow()` | Preserve cabinet_spec in both conversion directions |
| `src/app/(member)/app/scan-to-layout/[id]/EditorContent.tsx` | Both placement handlers | Snapshot cabinetSpec into PlacedModule.config |
| `src/spatial/moduleMeshBuilder.ts` | Door/drawer/shelf/plinth rendering | Read cabinet_spec for parametric 3D mesh generation |

### Files Verified (No Changes Needed)

| File | Status | Notes |
|------|--------|-------|
| `src/app/api/workspace/warehouse-assets/route.ts` | ✅ | POST/PATCH/DELETE pass planner_hints through as opaque object |
| `src/app/api/admin/warehouse-upload/route.ts` | ✅ | Admin gate, file sanitisation, proper bucket path construction |
| `src/app/api/storage/[...path]/route.ts` | ✅ | Auth check, bucket allowlist, 1-hour signed URLs |
| `src/lib/workspace-data.ts` | ✅ | CRUD handles all 24 warehouse_assets columns |
| `src/components/planner/WarehousePanel.tsx` | ✅ | Renders name, dims, material.color, placement, unitPrice |
| `src/components/admin/WarehouseObjectEditor.tsx` | ✅ | Extracts cabinetSpec on load, merges on save |
| `src/app/(admin)/admin/warehouse/page.tsx` | ✅ | Lists all assets, thumbnails via storage proxy |
| `src/lib/planner/scope-engine.ts` | ✅ | 3-part asset matching: assetId → name → dims+category |

---

## 2. Planner Consumption Verification

### What the Planner Now Consumes

| Data | Source | Used By |
|------|--------|---------|
| `assetId` | PlacedModule.assetId | scope-engine.ts (pricing, specs), future mobile sync |
| `cabinet_spec` | PlacedModule.config.cabinet_spec | moduleMeshBuilder.ts (3D rendering) |
| `width/depth/height` | PlacedModule dimensions (mm) | 2D canvas, 3D mesh, collision |
| `category` | PlacedModule.category | Placement rules, colour lookup, shelf defaults |
| `color` | PlacedModule.color | Material appearance |

### Cabinet Spec Consumption (moduleMeshBuilder)

| Spec Field | Fallback | Effect |
|------------|----------|--------|
| `shelves.count` | tall→3, base→1, wall→0 | Number of internal shelf dividers |
| `doors.count` | 1 | Number of front door panels with gap between |
| `drawers.count` + `drawers.heights[]` | 0 (no drawers) | Drawer fronts rendered bottom-up |
| `plinth.height` + `plinth.enabled` | PLINTH_HEIGHT constant | Plinth height in mm, applied to base/tall |

### Backward Compatibility

- **No cabinet_spec?** → All rendering falls back to existing hardcoded values.
- **Partial cabinet_spec?** → Each field falls back independently.
- **Pre-existing layouts?** → PlacedModule without `config` renders identically to before.

---

## 3. Cross-Platform Readiness

### Format Assessment

| Aspect | Status | Detail |
|--------|--------|--------|
| Layout storage format | ✅ Platform-agnostic | Pure JSON in `room_layouts.layout_data` (jsonb) |
| PlacedModule serialisation | ✅ Survives JSON round-trip | assetId (string) + config (Record<string, unknown>) |
| planner_hints / cabinet_spec | ✅ Platform-agnostic | Opaque JSON in warehouse_assets.planner_hints |
| Storage proxy (thumbnails, meshes) | ⚠️ Auth required | Bearer token → signed URL (1hr), native clients must handle 302 redirects |
| Mobile client code | ❌ Not yet built | No react-native/expo/flutter deps. Web-only for now |
| Mobile sync docs | ❌ No warehouse coverage | SYNC_CONTRACT.md, MOBILE_API.md do not mention warehouse_assets |

### Tables a Mobile Client Would Need

| Table | Access | Notes |
|-------|--------|-------|
| `profiles` | Read | User identity, plan tier |
| `workspaces` | Read | Team context (team tier) |
| `warehouse_assets` | Read | Asset library — system presets + user custom |
| `room_layouts` | Read/Write | Saved layouts containing PlacedModule[] |

### Storage Proxy for Native Clients

```
GET /api/storage/asset-thumbnails/{owner_id}/{asset_id}/thumbnail.jpg
  Headers: Authorization: Bearer {supabase_jwt}
  → 302 redirect to signed URL (1-hour expiry)
```

Native clients must:
1. Pass Bearer token
2. Follow 302 redirects
3. Cache signed URLs locally
4. Refresh on expiry

---

## 4. Gaps & Future Work

### Documented Gaps

| Gap | Severity | When to Address |
|-----|----------|-----------------|
| Mobile docs don't mention warehouse_assets | Low | Before mobile build phase |
| No offline sync for warehouse_assets | Low | Mobile phase — cache on launch, read-only |
| model_ref (3D mesh files) not consumed in planner yet | Medium | Phase 3A (shape editor) — currently boxes only |
| Parametric builder only produces cabinet_spec for cabinets | Low | Extend to other categories as needed |

### Next Phases (from roadmap)

- **Phase 3A**: Polyline wall editor (2D profile authoring)
- **Phase 3B**: Extrusion + GLB export (mesh generation)
- **Phase 3C**: Curved surfaces, arcs
- **Phase 4**: Direct 3D editing

---

## 5. Build Verification

```
npx next build → PASS
- Zero TypeScript errors
- Zero lint errors
- All pages compile successfully
```

All surgical fixes are backward-compatible. No existing functionality was removed or broken.
