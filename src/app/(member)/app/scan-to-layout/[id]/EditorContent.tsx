// src/app/(member)/app/scan-to-layout/[id]/page.tsx v2.0
//
// PURPOSE:
// Full-screen spatial editor for a single room layout.
// Tabs: Overview | Plan | Elevation | 3D | Layout | Scope
// Three-column Layout tab: warehouse panel | canvas | inspector.
//
// ROUTING:
// - /app/scan-to-layout/[id] — edit a saved layout
// - Back button returns to /app/scan-to-layout (list page)

'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { trackEvent } from '@/utils/analytics';
import type {
  LayoutDocument,
  PlacedModule,
  Opening,
  Point2D,
} from '@/lib/planner/planner-types';
import {
  MODULE_TEMPLATES,
  generateId,
  createDefaultLayoutDocument,
  buildRectangularWalls,
} from '@/lib/planner/planner-types';
import PlannerCanvas from '@/components/planner/PlannerCanvas';
// ModulePalette replaced by WarehousePanel in v2.0
import InspectorPanel from '@/components/planner/InspectorPanel';
import QuoteSummary from '@/components/planner/QuoteSummary';
import LayoutInsightsPanel from '@/components/planner/LayoutInsightsPanel';
import PlannerToolbar from '@/components/planner/PlannerToolbar';
import EditorTabs from '@/components/planner/EditorTabs';
import EditorModeBar from '@/components/planner/EditorModeBar';
import WarehousePanel from '@/components/planner/WarehousePanel';
import WallEditElevation from '@/components/planner/WallEditElevation';
import OverviewTab from '@/components/planner/tabs/OverviewTab';
import { applyAllOverrides, setOverride as saveWarehouseOverride, clearOverride as clearWarehouseOverride, hasOverride as hasWarehouseOverride, type WarehouseItemOverride } from '@/lib/warehouse/warehouse-overrides';
import PlanTab from '@/components/planner/tabs/PlanTab';
import ElevationTab from '@/components/planner/tabs/ElevationTab';
import dynamic from 'next/dynamic';
import ScopeTab from '@/components/planner/tabs/ScopeTab';

// ThreeDTab uses @react-three/fiber which requires React 19+ internals.
// Dynamic-import it so the fiber chunk only loads when 3D tab is activated,
// preventing the entire editor from crashing during module evaluation.
const ThreeDTab = dynamic(() => import('@/components/planner/tabs/ThreeDTab'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p className="mt-3 text-sm text-slate-500">Loading 3D viewport...</p>
      </div>
    </div>
  ),
});
import type { EditorTab, EditorMode, AssetCategory } from '@/lib/warehouse/warehouse-types';
import type { WarehouseAsset } from '@/lib/warehouse/warehouse-types';
import { WAREHOUSE_ASSETS } from '@/lib/warehouse/warehouse-registry';
import { mergeWarehouseAssets } from '@/lib/warehouse/warehouse-adapter';
import type { WarehouseAssetRow } from '@/lib/workspace-data';
import { autoFitDimensions } from '@/lib/warehouse/auto-fit';
import type { ModuleCategory } from '@/lib/planner/planner-types';
import { validatePlacement } from '@/spatial/placementRules';
import { snapToWall } from '@/spatial/snapping';
import { checkCollision } from '@/spatial/collision';
import { processRelationships, getRelationshipsForModule, detachRelationship, detectAllRuns } from '@/spatial/relationships';
import { validateConstraints, isPlacementBlocked } from '@/spatial/constraints';
import { autoFillWall } from '@/spatial/gapAutoFill';
import LiveCostBar from '@/components/planner/LiveCostBar';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map a WarehouseAsset category/subtype to the existing ModuleCategory system */
function mapAssetCategory(asset: { category: AssetCategory; subtype: string }): ModuleCategory {
  const map: Record<string, ModuleCategory> = {
    'kitchen:base_unit': 'base_cabinet',
    'kitchen:wall_unit': 'wall_cabinet',
    'kitchen:tall_unit': 'tall_cabinet',
    'kitchen:drawer_unit': 'drawer_unit',
    'kitchen:corner_unit': 'base_cabinet',
    'kitchen:appliance_housing': 'appliance_housing',
    'wardrobe:single': 'wardrobe_single',
    'wardrobe:double': 'wardrobe_double',
    'wardrobe:shelving': 'wardrobe_single',
    'wardrobe:drawers': 'drawer_unit',
    'wardrobe:hanging_module': 'wardrobe_single',
    'room_elements:end_panel': 'end_panel',
    'room_elements:filler_panel': 'filler_panel',
    'room_elements:plinth': 'filler_panel',
    'room_elements:cornice': 'filler_panel',
    'room_elements:pelmet': 'filler_panel',
  };
  return map[`${asset.category}:${asset.subtype}`] || 'custom';
}

// ─── Component ───────────────────────────────────────────────────────────────

// ─── TEMP: Inline Error Boundary for PlannerCanvas ─────────────────────────
import React from 'react';
class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: '#fef2f2', border: '2px solid #ef4444', padding: 16, margin: 8, borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }}>
          <strong style={{ color: '#dc2626' }}>PLANNERCANVAS CRASH</strong>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, color: '#1e293b' }}>{this.state.error.message}\n{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function EditorContent() {
  const params = useParams();
  const router = useRouter();
  const layoutId = params.id as string;
  const { accessToken, isLoading: ctxLoading } = useWorkspace();

  // ─── State ─────────────────────────────────────────────────────────────

  const [layout, setLayout] = useState<LayoutDocument>(createDefaultLayoutDocument());
  const [layoutName, setLayoutName] = useState('Untitled Layout');
  const [layoutType, setLayoutType] = useState('kitchen');
  const [layoutLeadId, setLayoutLeadId] = useState<string | null>(null);
  const [layoutJobId, setLayoutJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [dragTemplateId, setDragTemplateId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'inspector' | 'summary' | 'insights'>('inspector');
  const [activeTab, setActiveTab] = useState<EditorTab>('layout');
  const [editorMode, setEditorMode] = useState<EditorMode>('floor_plan');
  const [warehouseDragId, setWarehouseDragId] = useState<string | null>(null);
  const [showAddOpening, setShowAddOpening] = useState(false);
  const [showRoomEdit, setShowRoomEdit] = useState(false);
  const [collisionIds, setCollisionIds] = useState<string[]>([]);
  const [warehouseAssets, setWarehouseAssets] = useState<WarehouseAsset[] | null>(null);
  const [wallEditWallId, setWallEditWallId] = useState<string | null>(null);
  const [autoLayoutWallId, setAutoLayoutWallId] = useState<string | null>(null);
  const [overrideVersion, setOverrideVersion] = useState(0);

  const dirtyRef = useRef(false);

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }),
    [accessToken],
  );

  // ─── Load warehouse assets (hybrid: static + Supabase) ───────────────

  useEffect(() => {
    if (!accessToken) return;
    async function loadWarehouse() {
      try {
        const res = await fetch('/api/workspace/warehouse-assets', {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          const rows = (data.assets ?? []) as WarehouseAssetRow[];
          setWarehouseAssets(mergeWarehouseAssets(rows));
        }
      } catch {
        // Supabase warehouse not available — will use static fallback
      }
    }
    loadWarehouse();
  }, [accessToken]);

  /** Resolved warehouse list: hybrid if loaded, static fallback, with user overrides applied */
  const resolvedAssets = useMemo(
    () => applyAllOverrides(warehouseAssets ?? [...WAREHOUSE_ASSETS]),
    [warehouseAssets, overrideVersion],
  );

  /** Set of asset IDs that have user overrides (for UI indicators) */
  const overriddenAssetIds = useMemo(() => {
    const ids = new Set<string>();
    for (const asset of resolvedAssets) {
      if (hasWarehouseOverride(asset.id)) ids.add(asset.id);
    }
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedAssets, overrideVersion]);

  // ─── Load layout ──────────────────────────────────────────────────────

  useEffect(() => {
    if (ctxLoading) return;
    if (!accessToken || !layoutId) {
      setLoading(false);
      if (!accessToken) setError('Not authenticated. Please sign in.');
      return;
    }

    async function loadLayout() {
      try {
        const res = await fetch(`/api/workspace/layouts/${layoutId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        if (!res.ok) {
          if (res.status === 404) {
            setError('Layout not found.');
          } else {
            const data = await res.json().catch(() => ({}));
            setError(data.error || 'Failed to load layout.');
          }
          return;
        }
        const data = await res.json();
        const l = data.layout;
        if (!l || typeof l !== 'object') {
          setError('Invalid layout data from server.');
          return;
        }
        setLayoutName(l.name || 'Untitled Layout');
        setLayoutType(l.layout_type || 'kitchen');
        setLayoutLeadId(l.lead_id || null);
        setLayoutJobId(l.job_id || null);
        setLastSaved(l.updated_at);

        const ld = l.layout_data as Partial<LayoutDocument> | null;
        if (ld && ld.version && ld.room) {
          // Merge with defaults to fill any missing fields (viewSettings, openings, etc.)
          const defaults = createDefaultLayoutDocument();
          setLayout({
            ...defaults,
            ...ld,
            openings: Array.isArray(ld.openings) ? ld.openings : defaults.openings,
            placedModules: Array.isArray(ld.placedModules) ? ld.placedModules : defaults.placedModules,
            relationships: Array.isArray((ld as Record<string, unknown>).relationships) ? (ld as LayoutDocument).relationships : defaults.relationships,
            viewSettings: { ...defaults.viewSettings, ...(ld.viewSettings ?? {}) },
            room: { ...defaults.room, ...(ld.room ?? {}) },
          });
        } else {
          setLayout(createDefaultLayoutDocument());
        }

        trackEvent('feature_view', '/app/scan-to-layout/editor', {
          eventLabel: 'layout_opened',
          metadata: { layoutId, layoutType: l.layout_type },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load layout');
      } finally {
        setLoading(false);
      }
    }

    loadLayout();
  }, [accessToken, ctxLoading, layoutId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-save (every 30s when dirty) ──────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      if (dirtyRef.current && !saving) {
        handleSave();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [accessToken, layoutId, layout, saving]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Save ──────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!accessToken || !layoutId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/workspace/layouts', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          id: layoutId,
          name: layoutName,
          layout_type: layoutType,
          layout_data: layout,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }
      setLastSaved(new Date().toISOString());
      dirtyRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [accessToken, layoutId, layoutName, layoutType, layout, authHeaders]);

  // ─── Layout mutators ──────────────────────────────────────────────────

  function markDirty() {
    dirtyRef.current = true;
  }

  function updateLayout(updater: (prev: LayoutDocument) => LayoutDocument) {
    setLayout((prev) => {
      const next = updater(prev);
      markDirty();
      return next;
    });
  }

  function handleUpdateOpening(id: string, updates: Partial<Opening>) {
    updateLayout((prev) => ({
      ...prev,
      openings: prev.openings.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    }));
  }

  function handleDeleteOpening(id: string) {
    updateLayout((prev) => ({
      ...prev,
      openings: prev.openings.filter((o) => o.id !== id),
    }));
    if (selectedItemId === id) handleSelectItem(null);
  }

  function handleAddOpening(type: 'door' | 'window' | 'obstacle', wallId: string, width: number, height: number) {
    const newOpening: Opening = {
      id: generateId('op'),
      type,
      wall_id: wallId,
      label: type === 'door' ? 'Door' : type === 'window' ? 'Window' : 'Obstacle',
      offset: 500,
      width,
      height,
      elevation: type === 'window' ? 900 : 0,
    };
    updateLayout((prev) => ({
      ...prev,
      openings: [...prev.openings, newOpening],
    }));
    handleSelectItem(newOpening.id);
    setShowAddOpening(false);
  }

  function handleUpdateRoomDimensions(width: number, depth: number, height: number) {
    updateLayout((prev) => {
      const newWalls = prev.room.type === 'rectangular'
        ? buildRectangularWalls(width, depth)
        : prev.room.walls; // keep polygon walls as-is for L/U shapes
      return {
        ...prev,
        room: { ...prev.room, width, depth, height, walls: newWalls },
      };
    });
  }

  function handleDropModule(position: Point2D) {
    // ── Warehouse asset drop (auto-fit aware) ──────────────────────────
    const wAsset = warehouseDragId
      ? resolvedAssets.find((a) => a.id === warehouseDragId)
      : null;

    if (wAsset) {
      // Auto-fit: compute cut dimensions from placement context
      const fitted = autoFitDimensions(wAsset, {
        placedModules: layout.placedModules,
        position,
      });

      const candidate: PlacedModule = {
        id: generateId('mod'),
        category: mapAssetCategory(wAsset),
        label: wAsset.name,
        position,
        width: fitted.width,
        depth: fitted.depth,
        height: fitted.height,
        rotation: 0,
        wall_id: null,
        color: wAsset.material.color,
        notes: wAsset.metadata.notes || '',
        // Track original stock dimensions for cut lists / waste calc
        stockDimensions: {
          width: wAsset.dimensions.width,
          depth: wAsset.dimensions.depth,
          height: wAsset.dimensions.height,
        },
        assetId: wAsset.id,
        // Snapshot effective price + material from warehouse asset (includes user overrides)
        unitPrice: wAsset.metadata.unitPrice,
        materialType: wAsset.material.type,
        // Snapshot parametric + shape specs for downstream consumers (mesh builder, scope engine)
        ...((wAsset.cabinetSpec || wAsset.shapeEditor) ? { config: {
          ...(wAsset.cabinetSpec ? { cabinet_spec: wAsset.cabinetSpec } : {}),
          ...(wAsset.shapeEditor ? { shape_editor: wAsset.shapeEditor } : {}),
        } } : {}),
      };

      // Apply wall-aware snapping + placement rules + collision check
      try {
        const snap = snapToWall(position, candidate, layout.room.walls, layout.placedModules);
        candidate.position = snap.position;
        candidate.wall_id = snap.wall_id;
        candidate.rotation = snap.rotation;

        const result = validatePlacement(candidate, layout.room);
        candidate.position = result.position;
        candidate.rotation = result.rotation;
        candidate.wall_id = result.wall_id;

        if (!result.valid) {
          setCollisionIds([candidate.id]);
        } else {
          const collision = checkCollision(candidate, layout.room.walls, layout.placedModules);
          setCollisionIds(collision.collides ? [candidate.id, ...collision.collidingIds] : []);
        }
      } catch {
        setCollisionIds([]);
      }

      // Constraint check: block invalid placements (e.g. oven without housing)
      const violations = validateConstraints(candidate, layout.placedModules, layout.relationships);
      if (isPlacementBlocked(violations)) {
        setCollisionIds([candidate.id]);
        setWarehouseDragId(null);
        setDragTemplateId(null);
        return;
      }

      updateLayout((prev) => {
        const nextModules = [...prev.placedModules, candidate];
        const { newRelationships, autoModules, removedRelationshipIds } = processRelationships(
          candidate, nextModules, prev.relationships,
        );
        return {
          ...prev,
          placedModules: [...nextModules, ...autoModules],
          relationships: [
            ...prev.relationships.filter((r) => !removedRelationshipIds.includes(r.id)),
            ...newRelationships,
          ],
        };
      });
      handleSelectItem(candidate.id);
      setWarehouseDragId(null);
      setDragTemplateId(null);
      return;
    }

    // ── Template-based drop (legacy / non-warehouse) ───────────────────
    const tplId = dragTemplateId;
    if (!tplId) return;
    const template = MODULE_TEMPLATES.find((t) => t.id === tplId);
    if (!template) return;

    // Build candidate module
    const candidate: PlacedModule = {
      id: generateId('mod'),
      category: template.category,
      label: template.label,
      position,
      width: template.defaultWidth,
      depth: template.defaultDepth,
      height: template.defaultHeight,
      rotation: 0,
      wall_id: null,
      color: template.color,
      notes: '',
    };

    // Apply wall-aware snapping + placement rules + collision check
    try {
      const snap = snapToWall(
        position,
        candidate,
        layout.room.walls,
        layout.placedModules,
      );
      candidate.position = snap.position;
      candidate.wall_id = snap.wall_id;
      candidate.rotation = snap.rotation;

      const result = validatePlacement(candidate, layout.room);
      candidate.position = result.position;
      candidate.rotation = result.rotation;
      candidate.wall_id = result.wall_id;

      if (!result.valid) {
        setCollisionIds([candidate.id]);
      } else {
        const collision = checkCollision(candidate, layout.room.walls, layout.placedModules);
        setCollisionIds(collision.collides ? [candidate.id, ...collision.collidingIds] : []);
      }
    } catch {
      // Spatial engine error — place module at raw drop position
      setCollisionIds([]);
    }

    // Constraint check: block invalid placements
    const tplViolations = validateConstraints(candidate, layout.placedModules, layout.relationships);
    if (isPlacementBlocked(tplViolations)) {
      setCollisionIds([candidate.id]);
      setDragTemplateId(null);
      return;
    }

    updateLayout((prev) => {
      const nextModules = [...prev.placedModules, candidate];
      const { newRelationships, autoModules, removedRelationshipIds } = processRelationships(
        candidate, nextModules, prev.relationships,
      );
      return {
        ...prev,
        placedModules: [...nextModules, ...autoModules],
        relationships: [
          ...prev.relationships.filter((r) => !removedRelationshipIds.includes(r.id)),
          ...newRelationships,
        ],
      };
    });
    handleSelectItem(candidate.id);
    setDragTemplateId(null);
  }

  function handleMoveItem(id: string, position: Point2D, wallId?: string | null, rotation?: number) {
    updateLayout((prev) => {
      const updatedModules = prev.placedModules.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, position };
        if (wallId !== undefined) updated.wall_id = wallId;
        if (rotation !== undefined) updated.rotation = rotation;
        return updated;
      });

      // Run collision check
      const moved = updatedModules.find((m) => m.id === id);
      if (moved) {
        try {
          const collision = checkCollision(moved, prev.room.walls, updatedModules);
          setCollisionIds(collision.collides ? [id, ...collision.collidingIds] : []);
        } catch {
          setCollisionIds([]);
        }
      } else {
        setCollisionIds([]);
      }

      // Update relationships for moved module
      if (moved) {
        const { newRelationships, autoModules, removedRelationshipIds, positionCorrections } = processRelationships(
          moved, updatedModules, prev.relationships,
        );

        // Apply position corrections for appliance alignment
        let correctedModules = updatedModules;
        if (positionCorrections.size > 0) {
          correctedModules = updatedModules.map((m) => {
            const correction = positionCorrections.get(m.id);
            if (correction) return { ...m, position: correction };
            return m;
          });
        }

        return {
          ...prev,
          placedModules: [...correctedModules, ...autoModules],
          relationships: [
            ...prev.relationships.filter((r) => !removedRelationshipIds.includes(r.id)),
            ...newRelationships,
          ],
        };
      }

      return { ...prev, placedModules: updatedModules };
    });
  }

  function handleBulkMoveModules(positions: Map<string, Point2D>) {
    updateLayout((prev) => ({
      ...prev,
      placedModules: prev.placedModules.map((m) => {
        const pos = positions.get(m.id);
        return pos ? { ...m, position: pos } : m;
      }),
    }));
  }

  function handleUpdateModule(id: string, updates: Partial<PlacedModule>) {
    updateLayout((prev) => ({
      ...prev,
      placedModules: prev.placedModules.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    }));
  }

  function handleDeleteModule(id: string) {
    updateLayout((prev) => ({
      ...prev,
      placedModules: prev.placedModules.filter((m) => m.id !== id),
      relationships: prev.relationships.filter((r) => r.sourceId !== id && r.targetId !== id),
    }));
    if (selectedItemId === id) handleSelectItem(null);
  }

  function handleDetachRelationship(relationshipId: string) {
    updateLayout((prev) => {
      const { removedModuleIds } = detachRelationship(relationshipId, prev.relationships, prev.placedModules);
      return {
        ...prev,
        relationships: prev.relationships.filter((r) => r.id !== relationshipId),
        placedModules: prev.placedModules.filter((m) => !removedModuleIds.includes(m.id)),
      };
    });
  }

  /** Apply modules from insights panel (gap fix, auto-fill) with relationship processing */
  function handleApplyModules(newModules: PlacedModule[]) {
    updateLayout((prev) => {
      let modules = [...prev.placedModules, ...newModules];
      let rels = [...prev.relationships];

      // Process relationships for each new module
      for (const mod of newModules) {
        const result = processRelationships(mod, modules, rels);
        modules = [...modules, ...result.autoModules];
        rels = [
          ...rels.filter((r) => !result.removedRelationshipIds.includes(r.id)),
          ...result.newRelationships,
        ];
      }

      return { ...prev, placedModules: modules, relationships: rels };
    });
  }

  /** Reassign an appliance module to a different host */
  function handleReassignHost(applianceId: string, newHostId: string) {
    updateLayout((prev) => {
      // Remove old hosting relationships for this appliance
      const filteredRels = prev.relationships.filter(
        (r) => !(r.sourceId === applianceId && (r.type === 'attached_to' || r.type === 'hosted_by')),
      );
      // Add new relationship
      const newRel = {
        id: generateId('rel'),
        type: 'attached_to' as const,
        sourceId: applianceId,
        targetId: newHostId,
        auto: false,
      };
      return { ...prev, relationships: [...filteredRels, newRel] };
    });
  }

  /** Auto-fill a wall with best-fit modules + process relationships */
  function handleAutoLayoutWall(wallId: string) {
    const wall = layout.room.walls.find((w) => w.id === wallId);
    if (!wall) return;
    const newModules = autoFillWall(layout.placedModules, wall);
    if (newModules.length === 0) return;
    handleApplyModules(newModules);
    setAutoLayoutWallId(null);
  }

  /** Apply cost optimisation: swap module category to a cheaper alternative */
  function handleOptimiseModule(moduleId: string, newCategory: ModuleCategory) {
    updateLayout((prev) => ({
      ...prev,
      placedModules: prev.placedModules.map((m) =>
        m.id === moduleId ? { ...m, category: newCategory } : m,
      ),
    }));
  }

  function handleDuplicateModule(id: string) {
    const existing = layout.placedModules.find((m) => m.id === id);
    if (!existing) return;
    const dup: PlacedModule = {
      ...existing,
      id: generateId('mod'),
      position: {
        x: existing.position.x + 50,
        y: existing.position.y + 50,
      },
      label: `${existing.label} (copy)`,
    };
    updateLayout((prev) => ({
      ...prev,
      placedModules: [...prev.placedModules, dup],
    }));
    handleSelectItem(dup.id);
  }

  // ─── Warehouse asset placement ────────────────────────────────────────

  function handleWarehouseDrag(assetId: string) {
    setWarehouseDragId(assetId);
    // Also set dragTemplateId for backward compat with canvas drop
    const asset = resolvedAssets.find((a) => a.id === assetId);
    if (asset) {
      // Find matching MODULE_TEMPLATE or create ad-hoc
      const tpl = MODULE_TEMPLATES.find(
        (t) => t.defaultWidth === asset.dimensions.width &&
               t.defaultHeight === asset.dimensions.height &&
               t.label.toLowerCase().includes(asset.name.split(' ')[0].toLowerCase()),
      );
      if (tpl) {
        setDragTemplateId(tpl.id);
      }
    }
  }

  /** Save override as user's warehouse default (localStorage) */
  function handleSaveWarehouseDefault(assetId: string, override: WarehouseItemOverride) {
    saveWarehouseOverride(assetId, override);
    setOverrideVersion((v) => v + 1);
  }

  /** Reset a warehouse item back to system default */
  function handleResetWarehouseDefault(assetId: string) {
    clearWarehouseOverride(assetId);
    setOverrideVersion((v) => v + 1);
  }

  function handleWarehouseTap(assetId: string) {
    const asset = resolvedAssets.find((a) => a.id === assetId);
    if (!asset) return;

    // Place at centre of room
    const cx = Math.max(0, (layout.room.width - asset.dimensions.width) / 2);
    const cy = Math.max(0, (layout.room.depth - asset.dimensions.depth) / 2);

    // Auto-fit: compute cut dimensions from placement context
    const fitted = autoFitDimensions(asset, {
      placedModules: layout.placedModules,
      position: { x: cx, y: cy },
    });

    const candidate: PlacedModule = {
      id: generateId('mod'),
      category: mapAssetCategory(asset),
      label: asset.name,
      position: { x: cx, y: cy },
      width: fitted.width,
      depth: fitted.depth,
      height: fitted.height,
      rotation: 0,
      wall_id: null,
      color: asset.material.color,
      notes: asset.metadata.notes || '',
      // Track original stock dimensions for cut lists / waste calc
      stockDimensions: {
        width: asset.dimensions.width,
        depth: asset.dimensions.depth,
        height: asset.dimensions.height,
      },
      assetId: asset.id,
      // Snapshot effective price + material from warehouse asset (includes user overrides)
      unitPrice: asset.metadata.unitPrice,
      materialType: asset.material.type,
      // Snapshot parametric + shape specs for downstream consumers (mesh builder, scope engine)
      ...((asset.cabinetSpec || asset.shapeEditor) ? { config: {
        ...(asset.cabinetSpec ? { cabinet_spec: asset.cabinetSpec } : {}),
        ...(asset.shapeEditor ? { shape_editor: asset.shapeEditor } : {}),
      } } : {}),
    };

    // Apply wall-aware snapping + placement rules + collision check
    try {
      const snap = snapToWall(
        candidate.position,
        candidate,
        layout.room.walls,
        layout.placedModules,
      );
      candidate.position = snap.position;
      candidate.wall_id = snap.wall_id;
      candidate.rotation = snap.rotation;

      const result = validatePlacement(candidate, layout.room);
      candidate.position = result.position;
      candidate.rotation = result.rotation;
      candidate.wall_id = result.wall_id;

      const collision = checkCollision(candidate, layout.room.walls, layout.placedModules);
      setCollisionIds(collision.collides ? [candidate.id, ...collision.collidingIds] : []);
    } catch {
      // Spatial engine error — place module at raw centre position
      setCollisionIds([]);
    }

updateLayout((prev) => {
        const nextModules = [...prev.placedModules, candidate];
        const { newRelationships, autoModules, removedRelationshipIds } = processRelationships(
          candidate, nextModules, prev.relationships,
        );
        return {
          ...prev,
          placedModules: [...nextModules, ...autoModules],
          relationships: [
            ...prev.relationships.filter((r) => !removedRelationshipIds.includes(r.id)),
            ...newRelationships,
          ],
        };
      });
    handleSelectItem(candidate.id);
    setActiveTab('layout'); // Switch to layout tab to see placement
  }

  function handleZoom(delta: number) {
    updateLayout((prev) => ({
      ...prev,
      viewSettings: {
        ...prev.viewSettings,
        zoom: Math.max(0.3, Math.min(3, prev.viewSettings.zoom + delta)),
      },
    }));
  }

  function handleToggleGrid() {
    updateLayout((prev) => ({
      ...prev,
      viewSettings: { ...prev.viewSettings, showGrid: !prev.viewSettings.showGrid },
    }));
  }

  function handleToggleDimensions() {
    updateLayout((prev) => ({
      ...prev,
      viewSettings: { ...prev.viewSettings, showDimensions: !prev.viewSettings.showDimensions },
    }));
  }

  // ─── Derived ──────────────────────────────────────────────────────────

  const selectedModule = layout.placedModules.find((m) => m.id === selectedItemId) || null;
  const selectedOpening = layout.openings.find((o) => o.id === selectedItemId) || null;
  const wallList = layout.room.walls.map((w) => ({ id: w.id, label: w.label }));
  const selectedRelationships = selectedItemId
    ? getRelationshipsForModule(selectedItemId, layout.relationships)
    : [];
  const selectedModules = selectedItemIds.length > 0
    ? layout.placedModules.filter((m) => selectedItemIds.includes(m.id))
    : [];
  const detectedRuns = useMemo(() => detectAllRuns(layout.placedModules), [layout.placedModules]);

  function handleSelectItem(id: string | null) {
    setSelectedItemId(id);
    setSelectedItemIds(id ? [id] : []);
  }

  function handleToggleSelectItem(id: string) {
    setSelectedItemIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((i) => i !== id);
        setSelectedItemId(next[next.length - 1] || null);
        return next;
      }
      setSelectedItemId(id);
      return [...prev, id];
    });
  }

  /** Double-click a wall in the plan view → switch to wall edit mode with that wall selected */
  function handleWallClick(wallId: string) {
    setWallEditWallId(wallId);
    setEditorMode('wall_edit');
  }

  // ─── Loading / Error ──────────────────────────────────────────────────

  if (ctxLoading || loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Loading layout editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center max-w-sm">
          <h3 className="text-base font-semibold text-slate-900">Could not load layout</h3>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            onClick={() => router.push('/app/scan-to-layout')}
            className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Back to Scan to Layout
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  const isLayoutTab = activeTab === 'layout';

  return (
    <div className="flex flex-col gap-2 h-[calc(100vh-160px)]">
      {/* Top Bar: Toolbar + Tabs */}
      <div className="flex flex-col gap-2">
        <PlannerToolbar
          layoutName={layoutName}
          layoutType={layoutType}
          saving={saving}
          lastSaved={lastSaved}
          onSave={handleSave}
          layout={layout}
          onZoom={handleZoom}
          onToggleGrid={handleToggleGrid}
          onToggleDimensions={handleToggleDimensions}
          onBack={() => router.push('/app/scan-to-layout')}
        />

        {/* Tab bar + mode bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <EditorTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            moduleCount={layout.placedModules.length}
          />
          {isLayoutTab && (
            <EditorModeBar
              activeMode={editorMode}
              onModeChange={setEditorMode}
            />
          )}
        </div>

        {/* Live cost bar */}
        {isLayoutTab && layout.placedModules.length > 0 && (
          <LiveCostBar modules={layout.placedModules} selectedModule={selectedModule} />
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'overview' && (
          <div className="h-full overflow-y-auto">
            <OverviewTab
              layout={layout}
              layoutName={layoutName}
              layoutType={layoutType}
              lastSaved={lastSaved}
            />
          </div>
        )}

        {activeTab === 'plan' && (
          <PlanTab layout={layout} />
        )}

        {activeTab === 'elevation' && (
          <ElevationTab layout={layout} />
        )}

        {activeTab === '3d' && (
          <CanvasErrorBoundary>
            <ThreeDTab layout={layout} />
          </CanvasErrorBoundary>
        )}

        {activeTab === 'layout' && (
          <div className="flex flex-1 gap-3 h-full min-h-0">
            {/* Left: Warehouse Panel (replaces palette on large screens) */}
            <div className="w-64 shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden hidden lg:flex lg:flex-col">
              <WarehousePanel
                onDragAsset={handleWarehouseDrag}
                onTapPlace={handleWarehouseTap}
                assets={resolvedAssets}
                overriddenIds={overriddenAssetIds}
              />
            </div>

            {/* Center: Canvas */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              {/* Editor mode context hint */}
              {editorMode !== 'floor_plan' && (
                <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {editorMode === 'wall_edit' && <><span>🧱</span> Wall Edit — adjust walls and room geometry</>}
                    {editorMode === 'free_place' && <><span>✋</span> Free Place — position islands and custom items</>}
                    {editorMode === 'opening_edit' && <><span>🪟</span> Openings — add and position doors and windows</>}
                  </div>
                  <div className="flex gap-1.5">
                    {editorMode === 'opening_edit' && (
                      <button
                        onClick={() => setShowAddOpening(!showAddOpening)}
                        className="rounded-md bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-600 transition-colors"
                      >
                        + Add Opening
                      </button>
                    )}
                    {editorMode === 'wall_edit' && (
                      <button
                        onClick={() => setShowRoomEdit(!showRoomEdit)}
                        className="rounded-md bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-600 transition-colors"
                      >
                        ✎ Edit Dimensions
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Auto Layout Wall toolbar */}
              {editorMode === 'floor_plan' && wallList.length > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-800 flex items-center gap-2">
                  <span>🪄</span>
                  <span className="font-medium">Auto Layout</span>
                  <select
                    value={autoLayoutWallId ?? ''}
                    onChange={(e) => setAutoLayoutWallId(e.target.value || null)}
                    className="rounded-md border border-purple-300 bg-white px-2 py-1 text-[11px] text-purple-800 focus:outline-none focus:ring-1 focus:ring-purple-400"
                  >
                    <option value="">Select wall…</option>
                    {wallList.map((w) => (
                      <option key={w.id} value={w.id}>{w.label}</option>
                    ))}
                  </select>
                  <button
                    disabled={!autoLayoutWallId}
                    onClick={() => autoLayoutWallId && handleAutoLayoutWall(autoLayoutWallId)}
                    className="rounded-md bg-purple-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Fill Wall
                  </button>
                </div>
              )}

              {/* Add Opening Form */}
              {showAddOpening && (
                <AddOpeningPanel
                  walls={wallList}
                  onAdd={handleAddOpening}
                  onCancel={() => setShowAddOpening(false)}
                />
              )}

              {/* Room Dimensions Editor */}
              {showRoomEdit && (
                <RoomDimensionsPanel
                  room={layout.room}
                  onUpdate={handleUpdateRoomDimensions}
                  onClose={() => setShowRoomEdit(false)}
                />
              )}
              <div className="flex-1 min-h-0">
                {editorMode === 'wall_edit' ? (
                  <WallEditElevation
                    layout={layout}
                    selectedItemId={selectedItemId}
                    onSelectItem={handleSelectItem}
                    onMoveItem={handleMoveItem}
                    initialWallId={wallEditWallId || undefined}
                  />
                ) : (
                  <CanvasErrorBoundary>
                    <PlannerCanvas
                      layout={layout}
                      selectedItemId={selectedItemId}
                      selectedItemIds={selectedItemIds}
                      onSelectItem={handleSelectItem}
                      onToggleSelectItem={handleToggleSelectItem}
                      onMoveItem={handleMoveItem}
                      onDropModule={handleDropModule}
                      collisionIds={collisionIds}
                      relationships={layout.relationships}
                      onWallClick={handleWallClick}
                      runs={detectedRuns}
                    />
                  </CanvasErrorBoundary>
                )}
              </div>
            </div>

            {/* Right: Inspector + Summary + Insights */}
            <div className="w-72 shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden hidden xl:flex xl:flex-col">
              {/* Tab header */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setRightTab('inspector')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${
                    rightTab === 'inspector'
                      ? 'border-b-2 border-amber-500 text-amber-700 bg-amber-50/50'
                      : 'text-slate-600 hover:bg-gray-50'
                  }`}
                >
                  Inspector
                </button>
                <button
                  onClick={() => setRightTab('summary')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${
                    rightTab === 'summary'
                      ? 'border-b-2 border-amber-500 text-amber-700 bg-amber-50/50'
                      : 'text-slate-600 hover:bg-gray-50'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setRightTab('insights')}
                  className={`flex-1 px-2 py-2.5 text-xs font-medium transition-colors ${
                    rightTab === 'insights'
                      ? 'border-b-2 border-amber-500 text-amber-700 bg-amber-50/50'
                      : 'text-slate-600 hover:bg-gray-50'
                  }`}
                >
                  Insights
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {rightTab === 'inspector' ? (
                  <InspectorPanel
                    selectedModule={selectedModule}
                    selectedOpening={selectedOpening}
                    onUpdateModule={handleUpdateModule}
                    onDeleteModule={handleDeleteModule}
                    onDuplicateModule={handleDuplicateModule}
                    onUpdateOpening={handleUpdateOpening}
                    onDeleteOpening={handleDeleteOpening}
                    walls={wallList}
                    relationships={selectedRelationships}
                    allModules={layout.placedModules}
                    onDetachRelationship={handleDetachRelationship}
                    onReassignHost={handleReassignHost}
                    selectedModules={selectedModules}
                    onBulkMoveModules={handleBulkMoveModules}
                    onSaveWarehouseDefault={handleSaveWarehouseDefault}
                    onResetWarehouseDefault={handleResetWarehouseDefault}
                    hasWarehouseOverride={
                      selectedModule?.assetId
                        ? hasWarehouseOverride(selectedModule.assetId)
                        : false
                    }
                  />
                ) : rightTab === 'summary' ? (
                  <QuoteSummary
                    layout={layout}
                    layoutId={layoutId}
                    layoutName={layoutName}
                    accessToken={accessToken}
                    leadId={layoutLeadId}
                    jobId={layoutJobId}
                  />
                ) : (
                  <LayoutInsightsPanel layout={layout} onApplyModules={handleApplyModules} onOptimiseModule={handleOptimiseModule} />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scope' && (
          <div className="h-full overflow-y-auto">
            <ScopeTab
              layout={layout}
              layoutName={layoutName}
              layoutType={layoutType}
              layoutId={layoutId}
              leadId={layoutLeadId}
              jobId={layoutJobId}
              accessToken={accessToken}
            />
          </div>
        )}
      </div>

      {/* Mobile hint (Layout tab only) */}
      {isLayoutTab && (
        <div className="lg:hidden rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
          <p className="text-xs text-amber-900">
            The full layout editor with warehouse and inspector works best on larger screens.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Add Opening Panel ────────────────────────────────────────────────────────

function AddOpeningPanel({
  walls,
  onAdd,
  onCancel,
}: {
  walls: { id: string; label: string }[];
  onAdd: (type: 'door' | 'window' | 'obstacle', wallId: string, width: number, height: number) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<'door' | 'window' | 'obstacle'>('door');
  const [wallId, setWallId] = useState(walls[0]?.id || '');
  const [width, setWidth] = useState(900);
  const [height, setHeight] = useState(type === 'door' ? 2100 : 1200);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-blue-900">Add Opening</span>
        <button onClick={onCancel} className="text-xs text-blue-600 hover:underline">Cancel</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <span className="text-[10px] text-slate-500 block mb-0.5">Type</span>
          <select
            value={type}
            onChange={(e) => {
              const t = e.target.value as 'door' | 'window' | 'obstacle';
              setType(t);
              setHeight(t === 'door' ? 2100 : t === 'window' ? 1200 : 900);
            }}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-slate-900 focus:ring-1 focus:ring-amber-500"
          >
            <option value="door">🚪 Door</option>
            <option value="window">🪟 Window</option>
            <option value="obstacle">⬛ Obstacle</option>
          </select>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block mb-0.5">Wall</span>
          <select
            value={wallId}
            onChange={(e) => setWallId(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-slate-900 focus:ring-1 focus:ring-amber-500"
          >
            {walls.map((w) => (
              <option key={w.id} value={w.id}>{w.label}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block mb-0.5">Width (mm)</span>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Math.max(200, Number(e.target.value)))}
            min={200}
            step={50}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-slate-900 focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block mb-0.5">Height (mm)</span>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Math.max(200, Number(e.target.value)))}
            min={200}
            step={50}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-slate-900 focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <button
          onClick={() => onAdd(type, wallId, width, height)}
          disabled={!wallId}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Place {type}
        </button>
      </div>
    </div>
  );
}

// ─── Room Dimensions Panel ──────────────────────────────────────────────────

function RoomDimensionsPanel({
  room,
  onUpdate,
  onClose,
}: {
  room: { width: number; depth: number; height: number; type: string };
  onUpdate: (width: number, depth: number, height: number) => void;
  onClose: () => void;
}) {
  const [w, setW] = useState(room.width);
  const [d, setD] = useState(room.depth);
  const [h, setH] = useState(room.height);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-900">Edit Room Dimensions</span>
        <button onClick={onClose} className="text-xs text-slate-500 hover:underline">Close</button>
      </div>
      {room.type !== 'rectangular' && (
        <p className="text-[10px] text-amber-600 mb-2">
          Non-rectangular rooms: only bounding dimensions and ceiling height are updated. Wall geometry is preserved.
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <span className="text-[10px] text-slate-500 block mb-0.5">Width (mm)</span>
          <input
            type="number"
            value={w}
            onChange={(e) => setW(Math.max(500, Number(e.target.value)))}
            min={500}
            step={100}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-slate-900 focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block mb-0.5">Depth (mm)</span>
          <input
            type="number"
            value={d}
            onChange={(e) => setD(Math.max(500, Number(e.target.value)))}
            min={500}
            step={100}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-slate-900 focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block mb-0.5">Ceiling (mm)</span>
          <input
            type="number"
            value={h}
            onChange={(e) => setH(Math.max(1800, Number(e.target.value)))}
            min={1800}
            step={50}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs text-slate-900 focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <button
          onClick={() => { onUpdate(w, d, h); onClose(); }}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          Apply changes
        </button>
      </div>
    </div>
  );
}
