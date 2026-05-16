// src/lib/warehouse/warehouse-types.ts v1.0
//
// PURPOSE:
// Canonical type system for the TISSCA Warehouse — a global, reusable,
// cross-platform asset registry for spatial design.
//
// The Warehouse is the core of the TISSCA spatial platform.
// Every placeable object — from a 600mm base cabinet to a scanned window —
// is modelled as a WarehouseAsset.
//
// DESIGN PRINCIPLES:
//   1. Extensible — new categories/subtypes via union expansion, zero refactor.
//   2. Platform-neutral — works identically on Web, iOS, Android.
//   3. Future-ready — scannedCustom source, parametric rules, connection rules.
//   4. Supabase-storable — all types serialise to jsonb cleanly.
//
// RELATIONSHIP TO planner-types.ts:
//   - planner-types.ts defines geometry + document model (LayoutDocument).
//   - warehouse-types.ts defines the ASSET CATALOGUE that populates the document.
//   - PlacedModule.assetId (optional) links a placed instance back to a warehouse asset.
//   - ModuleTemplate remains as a lightweight placement template; WarehouseAsset is the source of truth.

// ─── Asset Categories ────────────────────────────────────────────────────────

/** Top-level category for warehouse assets */
export type AssetCategory =
  | 'kitchen'
  | 'wardrobe'
  | 'openings'
  | 'room_elements'
  | 'appliances'
  | 'hardware';

/** Kitchen subtypes */
export type KitchenSubtype =
  | 'base_unit'
  | 'wall_unit'
  | 'tall_unit'
  | 'drawer_unit'
  | 'corner_unit'
  | 'appliance_housing';

/** Wardrobe subtypes */
export type WardrobeSubtype =
  | 'single'
  | 'double'
  | 'shelving'
  | 'drawers'
  | 'hanging_module';

/** Openings subtypes */
export type OpeningsSubtype =
  | 'door'
  | 'window'
  | 'bi_fold'
  | 'sliding';

/** Room element subtypes */
export type RoomElementSubtype =
  | 'radiator'
  | 'island'
  | 'column'
  | 'custom_block'
  | 'worktop'
  | 'plinth'
  | 'cornice'
  | 'end_panel'
  | 'filler_panel'
  | 'pelmet';

/** Appliances subtypes */
export type AppliancesSubtype =
  | 'oven'
  | 'hob'
  | 'fridge'
  | 'dishwasher'
  | 'washing_machine'
  | 'microwave'
  | 'extractor';

/** Hardware / fitting subtypes */
export type HardwareSubtype =
  | 'handle'
  | 'hinge';

/** Union of all subtypes */
export type AssetSubtype =
  | KitchenSubtype
  | WardrobeSubtype
  | OpeningsSubtype
  | RoomElementSubtype
  | AppliancesSubtype
  | HardwareSubtype;

// ─── Asset Properties ────────────────────────────────────────────────────────

/** Physical dimensions in millimetres */
export type AssetDimensions = {
  width: number;
  depth: number;
  height: number;
};

/** Parametric resize rules */
export type ParametricRules = {
  /** Can the asset be resized by the user? */
  resizable: boolean;
  /** Minimum dimensions if resizable */
  minWidth?: number;
  minDepth?: number;
  minHeight?: number;
  /** Maximum dimensions if resizable */
  maxWidth?: number;
  maxDepth?: number;
  maxHeight?: number;
  /** Resize step / grid snap (mm) */
  stepWidth?: number;
  stepDepth?: number;
  stepHeight?: number;
  /** Fixed aspect ratio? (e.g. appliances) */
  fixedAspect?: boolean;
};

/** Where this asset can be placed */
export type PlacementRule =
  | 'wall_only'     // Must be against a wall (cabinets, radiators)
  | 'floor'         // Floor-standing, free position (islands, columns)
  | 'wall_mounted'  // On the wall surface (wall cabinets, shelves)
  | 'ceiling'       // Ceiling-mounted (extractors, lights)
  | 'free';         // No constraint (custom blocks)

/** Connection rules for snapping assets together */
export type ConnectionRules = {
  /** Can attach to other units on left/right? */
  canAttachSide: boolean;
  /** Can stack vertically? */
  canStack: boolean;
  /** Specific categories this can connect to */
  connectsTo?: AssetSubtype[];
  /** Requires specific spacing from other units? (mm) */
  requiredGap?: number;
};

/** How this asset originated */
export type AssetSource =
  | 'systemPreset'     // Built-in TISSCA library
  | 'imported'         // User imported (file, URL, etc.)
  | 'scannedCustom';   // Scanned from real world (LiDAR/AR — future)

/** Visual style / material reference */
export type AssetMaterial = {
  /** Material name for display */
  name: string;
  /** Material category */
  type: 'wood' | 'laminate' | 'stone' | 'metal' | 'glass' | 'fabric' | 'other';
  /** Hex colour for 2D rendering */
  color: string;
  /** Optional texture reference for 3D (future) */
  textureRef?: string;
};

/** Auto-fit hint — tells the editor how to intelligently size this asset on placement */
export type AutoFitHint =
  | 'match_adjacent_height'   // Match height of neighbouring cabinet
  | 'match_adjacent_depth'    // Match depth of neighbouring cabinet
  | 'fill_gap'               // Auto-size width to fill available gap
  | 'run_length';            // Auto-size width to cabinet run length

// ─── Core Warehouse Asset ────────────────────────────────────────────────────

/**
 * The canonical asset model.
 * Every object in the TISSCA Warehouse is a WarehouseAsset.
 *
 * System presets are defined in warehouse-registry.ts.
 * User-imported and scanned assets follow the same shape.
 */
export type WarehouseAsset = {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Top-level category */
  category: AssetCategory;
  /** Specific subtype within category */
  subtype: AssetSubtype;
  /** Physical dimensions (mm) */
  dimensions: AssetDimensions;
  /** Resize/parametric behaviour */
  parametric: ParametricRules;
  /** Material / visual style */
  material: AssetMaterial;
  /** Where this can be placed */
  placement: PlacementRule;
  /** How units connect to neighbours */
  connection: ConnectionRules;
  /** Origin of the asset */
  source: AssetSource;
  /** Optional preview/thumbnail path */
  preview?: string;
  /** Metadata — brand, model, notes, pricing, etc. */
  metadata: {
    brand?: string;
    model?: string;
    notes?: string;
    /** Estimated unit price (for scope/quote generation) */
    unitPrice?: number;
    /** Price currency */
    currency?: string;
    /** Tags for search/filter */
    tags?: string[];
  };
  /** Auto-fit hints for intelligent editor sizing on placement */
  autoFit?: AutoFitHint[];
  /**
   * Opaque parametric cabinet specification from planner_hints.cabinet_spec.
   * Passed through for downstream consumers (mesh builder, scope engine, mobile).
   * Typed as unknown to avoid coupling warehouse-types to parametric-types.
   */
  cabinetSpec?: unknown;
  /**
   * 2D profile shape from planner_hints.shape_editor.
   * Passed through for downstream consumers (mesh builder, extrusion, mobile).
   * Typed as unknown to avoid coupling warehouse-types to shape-editor-types.
   */
  shapeEditor?: unknown;
  /** Whether this asset is visible in the palette */
  enabled: boolean;
  /** Sort order within its category */
  sortOrder: number;
};

// ─── Category Metadata ───────────────────────────────────────────────────────

export type CategoryMeta = {
  id: AssetCategory;
  label: string;
  icon: string;
  description: string;
  subtypes: { id: AssetSubtype; label: string }[];
};

export const ASSET_CATEGORIES: CategoryMeta[] = [
  {
    id: 'kitchen',
    label: 'Kitchen',
    icon: '🍳',
    description: 'Base, wall, tall, drawer, corner units and appliance housing',
    subtypes: [
      { id: 'base_unit', label: 'Base Units' },
      { id: 'wall_unit', label: 'Wall Units' },
      { id: 'tall_unit', label: 'Tall Units' },
      { id: 'drawer_unit', label: 'Drawer Units' },
      { id: 'corner_unit', label: 'Corner Units' },
      { id: 'appliance_housing', label: 'Appliance Housing' },
    ],
  },
  {
    id: 'wardrobe',
    label: 'Wardrobe',
    icon: '🚪',
    description: 'Single, double, shelving, drawers, hanging modules',
    subtypes: [
      { id: 'single', label: 'Single' },
      { id: 'double', label: 'Double' },
      { id: 'shelving', label: 'Shelving' },
      { id: 'drawers', label: 'Drawers' },
      { id: 'hanging_module', label: 'Hanging Module' },
    ],
  },
  {
    id: 'openings',
    label: 'Openings',
    icon: '🪟',
    description: 'Doors, windows, bi-fold, sliding',
    subtypes: [
      { id: 'door', label: 'Doors' },
      { id: 'window', label: 'Windows' },
      { id: 'bi_fold', label: 'Bi-Fold' },
      { id: 'sliding', label: 'Sliding' },
    ],
  },
  {
    id: 'room_elements',
    label: 'Room Elements',
    icon: '🧱',
    description: 'Radiators, islands, columns, custom blocks',
    subtypes: [
      { id: 'radiator', label: 'Radiators' },
      { id: 'island', label: 'Islands' },
      { id: 'column', label: 'Columns' },
      { id: 'custom_block', label: 'Custom Blocks' },
      { id: 'worktop', label: 'Worktops' },
      { id: 'plinth', label: 'Plinths' },
      { id: 'cornice', label: 'Cornices' },
      { id: 'end_panel', label: 'End Panels' },
      { id: 'filler_panel', label: 'Filler Panels' },
      { id: 'pelmet', label: 'Pelmets' },
    ],
  },
  {
    id: 'appliances',
    label: 'Appliances',
    icon: '🔌',
    description: 'Ovens, hobs, fridges, dishwashers, extractors',
    subtypes: [
      { id: 'oven', label: 'Ovens' },
      { id: 'hob', label: 'Hobs' },
      { id: 'fridge', label: 'Fridges' },
      { id: 'dishwasher', label: 'Dishwashers' },
      { id: 'washing_machine', label: 'Washing Machines' },
      { id: 'microwave', label: 'Microwaves' },
      { id: 'extractor', label: 'Extractors' },
    ],
  },
  {
    id: 'hardware',
    label: 'Hardware & Fittings',
    icon: '🔩',
    description: 'Handles, hinges, and cabinet fittings',
    subtypes: [
      { id: 'handle', label: 'Handles' },
      { id: 'hinge', label: 'Hinges' },
    ],
  },
];

/** Human-readable labels for all subtypes */
export const SUBTYPE_LABELS: Record<AssetSubtype, string> = {
  // Kitchen
  base_unit: 'Base Unit',
  wall_unit: 'Wall Unit',
  tall_unit: 'Tall Unit',
  drawer_unit: 'Drawer Unit',
  corner_unit: 'Corner Unit',
  appliance_housing: 'Appliance Housing',
  // Wardrobe
  single: 'Single Wardrobe',
  double: 'Double Wardrobe',
  shelving: 'Shelving Unit',
  drawers: 'Drawer Module',
  hanging_module: 'Hanging Module',
  // Openings
  door: 'Door',
  window: 'Window',
  bi_fold: 'Bi-Fold Door',
  sliding: 'Sliding Door',
  // Room Elements
  radiator: 'Radiator',
  island: 'Island',
  column: 'Column',
  custom_block: 'Custom Block',
  worktop: 'Worktop',
  plinth: 'Plinth',
  cornice: 'Cornice',
  end_panel: 'End Panel',
  filler_panel: 'Filler Panel',
  pelmet: 'Pelmet',
  // Hardware
  handle: 'Handle',
  hinge: 'Hinge',
  // Appliances
  oven: 'Oven',
  hob: 'Hob',
  fridge: 'Fridge',
  dishwasher: 'Dishwasher',
  washing_machine: 'Washing Machine',
  microwave: 'Microwave',
  extractor: 'Extractor',
};

/** Placement rule labels */
export const PLACEMENT_LABELS: Record<PlacementRule, string> = {
  wall_only: 'Wall Only',
  floor: 'Floor Standing',
  wall_mounted: 'Wall Mounted',
  ceiling: 'Ceiling Mounted',
  free: 'Free Placement',
};

// ─── Editor Mode ─────────────────────────────────────────────────────────────

/** Layout editor sub-modes */
export type EditorMode =
  | 'floor_plan'      // Top-down 2D editing (default)
  | 'wall_edit'       // Edit walls, heights, angles
  | 'free_place'      // Islands, custom blocks — no wall constraint
  | 'opening_edit';   // Doors, windows placement

export const EDITOR_MODES: { id: EditorMode; label: string; icon: string; description: string }[] = [
  { id: 'floor_plan', label: 'Floor Plan', icon: '📐', description: 'Top-down layout editing' },
  { id: 'wall_edit', label: 'Wall Edit', icon: '🧱', description: 'Edit walls, heights, angles' },
  { id: 'free_place', label: 'Free Place', icon: '✋', description: 'Place islands and custom items' },
  { id: 'opening_edit', label: 'Openings', icon: '🪟', description: 'Position doors and windows' },
];

// ─── Editor Tab ──────────────────────────────────────────────────────────────

/** Main editor tabs — locked structure */
export type EditorTab =
  | 'overview'
  | 'plan'
  | 'elevation'
  | '3d'
  | 'layout'
  | 'scope';

export type ThreeDSubTab = 'planned' | 'scanned' | 'ar';

export const EDITOR_TABS: { id: EditorTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📋' },
  { id: 'plan', label: 'Plan', icon: '📐' },
  { id: 'elevation', label: 'Elevation', icon: '🏗️' },
  { id: '3d', label: '3D', icon: '🧊' },
  { id: 'layout', label: 'Layout', icon: '✏️' },
  { id: 'scope', label: 'Scope', icon: '📊' },
];

export const THREE_D_SUBTABS: { id: ThreeDSubTab; label: string; description: string }[] = [
  { id: 'planned', label: 'Planned', description: 'Clean design preview' },
  { id: 'scanned', label: 'Scanned', description: 'Captured room data' },
  { id: 'ar', label: 'AR View', description: 'Real-world overlay' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get all assets in a category */
export function filterByCategory(assets: WarehouseAsset[], category: AssetCategory): WarehouseAsset[] {
  return assets.filter((a) => a.category === category && a.enabled);
}

/** Get all assets matching a subtype */
export function filterBySubtype(assets: WarehouseAsset[], subtype: AssetSubtype): WarehouseAsset[] {
  return assets.filter((a) => a.subtype === subtype && a.enabled);
}

/** Search assets by name, tags, brand */
export function searchAssets(assets: WarehouseAsset[], query: string): WarehouseAsset[] {
  const q = query.toLowerCase().trim();
  if (!q) return assets.filter((a) => a.enabled);
  return assets.filter((a) => {
    if (!a.enabled) return false;
    if (a.name.toLowerCase().includes(q)) return true;
    if (a.metadata.brand?.toLowerCase().includes(q)) return true;
    if (a.metadata.tags?.some((t) => t.toLowerCase().includes(q))) return true;
    if (SUBTYPE_LABELS[a.subtype]?.toLowerCase().includes(q)) return true;
    return false;
  });
}
