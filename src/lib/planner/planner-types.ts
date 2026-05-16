// src/lib/planner/planner-types.ts v1.0
//
// PURPOSE:
// Core type definitions for the TISSCA Visual Planner (Room / Kitchen / Wardrobe).
// This is the canonical data model. ALL planner components and persistence use these types.
//
// ARCHITECTURE:
// The LayoutDocument is a versioned JSON document stored in room_layouts.layout_data (jsonb).
// It is the single source of truth for room geometry, openings, placed modules, and metadata.
//
// TWO INPUT MODES (same output model):
//   1. Manual room builder — user draws/defines room on website canvas → populates LayoutDocument
//   2. Scan import (FUTURE) — LiDAR scan from iPhone/iPad → parses point cloud → populates LayoutDocument
//
// FUTURE EXTENSIONS:
//   - 3D preview: LayoutDocument already contains height/depth data for 3D extrusion
//   - Worktop generation: iterate placed base cabinets on same wall run, compute continuous worktop
//   - Appliance cutouts: appliance modules have cutout dimensions → subtract from worktop geometry
//   - Elevation views: filter modules by wall_id → render orthographic elevation per wall
//   - Wardrobe internals: WardrobeConfig type can extend PlacedModule.config for shelves/rails/drawers
//   - Quote generation: iterate placedModules → generate quote line items with pricing from catalogue
//   - Export/share/print: serialize LayoutDocument → PDF/image/share link

// ─── Geometry Primitives ─────────────────────────────────────────────────────

/** 2D point in millimetres (mm). Origin is top-left of room bounding box. */
export type Point2D = {
  x: number;
  y: number;
};

/** Axis-aligned bounding box */
export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// ─── Room Definition ─────────────────────────────────────────────────────────

/** Wall segment defined by start→end points. Walls form the room perimeter. */
export type Wall = {
  id: string;
  /** Start point (mm from room origin) */
  start: Point2D;
  /** End point (mm from room origin) */
  end: Point2D;
  /** Wall thickness in mm (default 100mm) */
  thickness: number;
  /** Human label for the wall */
  label: string; // e.g. 'North', 'South', 'East', 'West', 'Wall A'
};

/**
 * Room shape definition.
 * Phase 1: rectangular rooms defined by width × depth.
 * FUTURE: polygon rooms (L-shape, U-shape) via arbitrary wall arrays.
 */
export type RoomShape = {
  /** Room type — 'rectangular' now, 'polygon' later */
  type: 'rectangular' | 'polygon';
  /** Room width in mm (for rectangular) */
  width: number;
  /** Room depth in mm (for rectangular) */
  depth: number;
  /** Room height in mm (floor to ceiling, for 3D/elevation later) */
  height: number;
  /** Wall segments — auto-generated for rectangular, manual for polygon */
  walls: Wall[];
};

// ─── Openings ────────────────────────────────────────────────────────────────

export type OpeningType = 'door' | 'window' | 'obstacle';

/** An opening (door/window/obstacle) placed on a wall */
export type Opening = {
  id: string;
  type: OpeningType;
  /** Which wall this opening sits on */
  wall_id: string;
  /** Label / name */
  label: string;
  /** Offset from wall start point in mm */
  offset: number;
  /** Opening width in mm */
  width: number;
  /** Opening height in mm (for elevation views / 3D) */
  height: number;
  /** Height from floor to bottom of opening in mm (sill height for windows) */
  elevation: number;
};

// ─── Module Catalogue ────────────────────────────────────────────────────────

/**
 * Module categories.
 * Kitchen modules, wardrobe modules, and generic placeholders.
 * Extensible — add new categories as the planner grows.
 */
export type ModuleCategory =
  | 'base_cabinet'
  | 'wall_cabinet'
  | 'tall_cabinet'
  | 'drawer_unit'
  | 'appliance_housing'
  | 'wardrobe_single'
  | 'wardrobe_double'
  | 'filler_panel'
  | 'end_panel'
  | 'custom';

/** A template module from the library palette (not yet placed in room) */
export type ModuleTemplate = {
  id: string;
  category: ModuleCategory;
  label: string;
  /** Default width in mm */
  defaultWidth: number;
  /** Default depth in mm */
  defaultDepth: number;
  /** Default height in mm */
  defaultHeight: number;
  /** Icon identifier for the palette */
  icon: string;
  /** Colour for canvas rendering */
  color: string;
  /** Can this module snap to walls? */
  wallSnap: boolean;
  /** Can this module be rotated? */
  rotatable: boolean;
};

// ─── Placed Modules ──────────────────────────────────────────────────────────

/**
 * A module instance placed in the room.
 * References a template via category but stores its own dimensions/position
 * (user may have resized or repositioned).
 */
export type PlacedModule = {
  id: string;
  /** Category from the template */
  category: ModuleCategory;
  /** User-editable label */
  label: string;
  /** Position in room coordinates (mm, top-left corner of module) */
  position: Point2D;
  /** Current width in mm (may differ from template default) */
  width: number;
  /** Current depth in mm */
  depth: number;
  /** Current height in mm */
  height: number;
  /** Rotation in degrees (0, 90, 180, 270) */
  rotation: number;
  /** Which wall this module is snapped to (null = free-standing) */
  wall_id: string | null;
  /** Colour for canvas rendering */
  color: string;
  /** User notes */
  notes: string;
  /**
   * Stock dimensions from the warehouse asset this was placed from.
   * Represents the raw material before cutting.
   * When present, width/depth/height are the actual cut/used dimensions
   * and stockDimensions are the original purchased material.
   * Enables: cut lists, waste calculation, stock estimation, pricing.
   */
  stockDimensions?: {
    width: number;
    depth: number;
    height: number;
  };
  /**
   * FUTURE: Extended configuration for specific module types.
   * e.g. wardrobe internals (shelves, rails), appliance specs, handle style.
   */
  config?: Record<string, unknown>;
  /**
   * Optional reference to a WarehouseAsset.id.
   * Links this placed instance back to its source in the TISSCA Warehouse
   * for pricing, material lookups, and cross-platform sync.
   */
  assetId?: string;
  /** Unit price in pence (e.g. 15000 = £150.00). Falls back to category default when absent. */
  unitPrice?: number;
  /** Material type for this module (e.g. 'melamine', 'solid_wood', 'mdf', 'granite'). */
  materialType?: string;
};

// ─── Module Relationships ────────────────────────────────────────────────────

/**
 * Relationship types between placed modules.
 *
 * attached_to  — appliance sits on or in a cabinet/worktop (hob→worktop)
 * hosted_by    — module is housed inside another (oven→tall cabinet)
 * spans_over   — worktop runs across a set of base cabinets
 * grouped_with — arbitrary user or auto grouping (future)
 */
export type RelationshipType = 'attached_to' | 'hosted_by' | 'spans_over' | 'grouped_with';

/**
 * A directed relationship edge between two PlacedModules.
 * sourceId is the dependent module (e.g. hob),
 * targetId is the host/support (e.g. worktop or base cabinet).
 */
export type ModuleRelationship = {
  id: string;
  type: RelationshipType;
  sourceId: string;  // The module that depends on / attaches to the target
  targetId: string;  // The host / support module
  /** Whether the system auto-created this (true) or user explicitly set it */
  auto: boolean;
  /** Optional metadata — e.g. attachment offset, generated worktop thickness */
  meta?: Record<string, unknown>;
};

// ─── Layout Document ─────────────────────────────────────────────────────────

/**
 * The complete layout document.
 * Stored as JSON in room_layouts.layout_data (Supabase jsonb column).
 * This is the single canonical model — both manual builder and future scan import
 * produce this exact structure.
 */
export type LayoutDocument = {
  /** Schema version for forward-compatible migrations */
  version: number; // Currently 1
  /** Room geometry */
  room: RoomShape;
  /** Openings placed on walls */
  openings: Opening[];
  /** Modules placed in the room */
  placedModules: PlacedModule[];
  /** Relationship edges between placed modules */
  relationships: ModuleRelationship[];
  /** Canvas/view metadata */
  viewSettings: {
    /** Grid cell size in mm */
    gridSize: number;
    /** Show grid lines */
    showGrid: boolean;
    /** Show dimensions */
    showDimensions: boolean;
    /** Zoom level (1 = 100%) */
    zoom: number;
    /** Pan offset */
    panOffset: Point2D;
  };
  /**
   * FUTURE: Scan import provenance.
   * When a LiDAR scan populates this document, scanImport stores
   * the raw geometry and confidence data so the user can review/adjust.
   */
  scanImport?: {
    source: string; // 'lidar_iphone' | 'lidar_ipad' | 'arcore'
    importedAt: string; // ISO timestamp
    confidence: number; // 0-1
    rawGeometry?: unknown; // Original point cloud / mesh reference
  };
  /**
   * FUTURE: Custom scanned assets embedded in this layout.
   * When a user scans a real-world object (window, cabinet, etc.)
   * it becomes a reusable asset stored here before syncing to Warehouse.
   */
  scannedAssets?: {
    id: string;
    name: string;
    category: string;
    dimensions: { width: number; depth: number; height: number };
    scanSource: 'lidar_iphone' | 'lidar_ipad' | 'arcore' | 'photo';
    scannedAt: string;
    confidence: number;
    meshRef?: string; // Reference to stored mesh data
    thumbnailRef?: string;
  }[];
};

// ─── Database Row ────────────────────────────────────────────────────────────

/** Row shape matching the room_layouts Supabase table */
export type RoomLayoutRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  layout_type: string;
  status: string;
  layout_data: LayoutDocument;
  lead_id: string | null;
  job_id: string | null;
  quote_id: string | null;
  scan_source: string | null;
  scan_metadata: Record<string, unknown> | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

/** Input for creating a layout */
export type CreateLayoutInput = {
  name: string;
  description?: string;
  layout_type?: string;
  layout_data: LayoutDocument;
  lead_id?: string;
  job_id?: string;
};

/** Input for updating a layout */
export type UpdateLayoutInput = {
  name?: string;
  description?: string;
  layout_type?: string;
  status?: string;
  layout_data?: LayoutDocument;
  lead_id?: string | null;
  job_id?: string | null;
  quote_id?: string | null;
};

// ─── Default Values ──────────────────────────────────────────────────────────

export function createDefaultRoom(): RoomShape {
  const width = 3600; // 3.6m default kitchen
  const depth = 3000; // 3.0m
  const height = 2400; // 2.4m standard ceiling
  const thickness = 100;
  return {
    type: 'rectangular',
    width,
    depth,
    height,
    walls: [
      { id: 'wall-north', start: { x: 0, y: 0 }, end: { x: width, y: 0 }, thickness, label: 'North' },
      { id: 'wall-east', start: { x: width, y: 0 }, end: { x: width, y: depth }, thickness, label: 'East' },
      { id: 'wall-south', start: { x: width, y: depth }, end: { x: 0, y: depth }, thickness, label: 'South' },
      { id: 'wall-west', start: { x: 0, y: depth }, end: { x: 0, y: 0 }, thickness, label: 'West' },
    ],
  };
}

export function createDefaultLayoutDocument(): LayoutDocument {
  return {
    version: 1,
    room: createDefaultRoom(),
    openings: [],
    placedModules: [],
    relationships: [],
    viewSettings: {
      gridSize: 100, // 100mm grid
      showGrid: true,
      showDimensions: true,
      zoom: 1,
      panOffset: { x: 0, y: 0 },
    },
  };
}

// ─── Module Library (Default Palette) ────────────────────────────────────────

export const MODULE_TEMPLATES: ModuleTemplate[] = [
  // Kitchen — Base
  { id: 'tpl-base-500', category: 'base_cabinet', label: 'Base Cabinet 500', defaultWidth: 500, defaultDepth: 580, defaultHeight: 870, icon: 'cabinet', color: '#a3c4f3', wallSnap: true, rotatable: true },
  { id: 'tpl-base-600', category: 'base_cabinet', label: 'Base Cabinet 600', defaultWidth: 600, defaultDepth: 580, defaultHeight: 870, icon: 'cabinet', color: '#a3c4f3', wallSnap: true, rotatable: true },
  { id: 'tpl-base-800', category: 'base_cabinet', label: 'Base Cabinet 800', defaultWidth: 800, defaultDepth: 580, defaultHeight: 870, icon: 'cabinet', color: '#a3c4f3', wallSnap: true, rotatable: true },
  { id: 'tpl-base-1000', category: 'base_cabinet', label: 'Base Cabinet 1000', defaultWidth: 1000, defaultDepth: 580, defaultHeight: 870, icon: 'cabinet', color: '#a3c4f3', wallSnap: true, rotatable: true },

  // Kitchen — Wall
  { id: 'tpl-wall-500', category: 'wall_cabinet', label: 'Wall Cabinet 500', defaultWidth: 500, defaultDepth: 330, defaultHeight: 720, icon: 'cabinet-wall', color: '#b5e48c', wallSnap: true, rotatable: true },
  { id: 'tpl-wall-600', category: 'wall_cabinet', label: 'Wall Cabinet 600', defaultWidth: 600, defaultDepth: 330, defaultHeight: 720, icon: 'cabinet-wall', color: '#b5e48c', wallSnap: true, rotatable: true },
  { id: 'tpl-wall-800', category: 'wall_cabinet', label: 'Wall Cabinet 800', defaultWidth: 800, defaultDepth: 330, defaultHeight: 720, icon: 'cabinet-wall', color: '#b5e48c', wallSnap: true, rotatable: true },

  // Kitchen — Tall
  { id: 'tpl-tall-600', category: 'tall_cabinet', label: 'Tall Cabinet 600', defaultWidth: 600, defaultDepth: 580, defaultHeight: 2100, icon: 'cabinet-tall', color: '#f9c74f', wallSnap: true, rotatable: true },

  // Kitchen — Drawer
  { id: 'tpl-drawer-500', category: 'drawer_unit', label: 'Drawer Unit 500', defaultWidth: 500, defaultDepth: 580, defaultHeight: 870, icon: 'drawer', color: '#90dbf4', wallSnap: true, rotatable: true },
  { id: 'tpl-drawer-600', category: 'drawer_unit', label: 'Drawer Unit 600', defaultWidth: 600, defaultDepth: 580, defaultHeight: 870, icon: 'drawer', color: '#90dbf4', wallSnap: true, rotatable: true },

  // Kitchen — Appliance
  { id: 'tpl-appliance-600', category: 'appliance_housing', label: 'Appliance Housing 600', defaultWidth: 600, defaultDepth: 580, defaultHeight: 870, icon: 'appliance', color: '#f8961e', wallSnap: true, rotatable: true },

  // Wardrobe
  { id: 'tpl-wardrobe-single', category: 'wardrobe_single', label: 'Wardrobe Single 600', defaultWidth: 600, defaultDepth: 580, defaultHeight: 2100, icon: 'wardrobe', color: '#cdb4db', wallSnap: true, rotatable: true },
  { id: 'tpl-wardrobe-double', category: 'wardrobe_double', label: 'Wardrobe Double 1200', defaultWidth: 1200, defaultDepth: 580, defaultHeight: 2100, icon: 'wardrobe', color: '#cdb4db', wallSnap: true, rotatable: true },

  // Filler / Panel
  { id: 'tpl-filler-50', category: 'filler_panel', label: 'Filler Panel 50', defaultWidth: 50, defaultDepth: 580, defaultHeight: 870, icon: 'panel', color: '#d4a373', wallSnap: true, rotatable: true },
  { id: 'tpl-filler-100', category: 'filler_panel', label: 'Filler Panel 100', defaultWidth: 100, defaultDepth: 580, defaultHeight: 870, icon: 'panel', color: '#d4a373', wallSnap: true, rotatable: true },

  // End Panels
  { id: 'tpl-end-panel-base', category: 'end_panel', label: 'Base End Panel', defaultWidth: 18, defaultDepth: 580, defaultHeight: 870, icon: 'panel', color: '#BEB0A0', wallSnap: true, rotatable: true },
  { id: 'tpl-end-panel-wall', category: 'end_panel', label: 'Wall End Panel', defaultWidth: 18, defaultDepth: 330, defaultHeight: 720, icon: 'panel', color: '#BEB0A0', wallSnap: true, rotatable: true },
  { id: 'tpl-end-panel-tall', category: 'end_panel', label: 'Tall End Panel', defaultWidth: 18, defaultDepth: 580, defaultHeight: 2100, icon: 'panel', color: '#BEB0A0', wallSnap: true, rotatable: true },
];

/** Human-readable labels for module categories */
export const MODULE_CATEGORY_LABELS: Record<ModuleCategory, string> = {
  base_cabinet: 'Base Cabinets',
  wall_cabinet: 'Wall Cabinets',
  tall_cabinet: 'Tall Cabinets',
  drawer_unit: 'Drawer Units',
  appliance_housing: 'Appliance Housing',
  wardrobe_single: 'Wardrobe (Single)',
  wardrobe_double: 'Wardrobe (Double)',
  filler_panel: 'Fillers & Panels',
  end_panel: 'End Panels',
  custom: 'Custom',
};

/**
 * Default unit prices per category in pence.
 * Used when a placed module has no explicit unitPrice set.
 */
export const MODULE_DEFAULT_PRICES: Record<ModuleCategory, number> = {
  base_cabinet: 15000,      // £150
  wall_cabinet: 12000,      // £120
  tall_cabinet: 28000,      // £280
  drawer_unit: 18000,       // £180
  appliance_housing: 22000, // £220
  wardrobe_single: 25000,   // £250
  wardrobe_double: 40000,   // £400
  filler_panel: 3500,       // £35
  end_panel: 4500,          // £45
  custom: 10000,            // £100
};

/** Layout type labels */
export const LAYOUT_TYPE_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  wardrobe: 'Wardrobe',
  bathroom: 'Bathroom',
  utility: 'Utility Room',
  general: 'General',
};

/** Layout status labels */
export const LAYOUT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _nextId = 0;
export function generateId(prefix: string = 'item'): string {
  _nextId++;
  return `${prefix}-${Date.now()}-${_nextId}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Convert mm to display string (e.g. 3600 → "3600mm" or "3.6m") */
export function formatMM(mm: number, unit: 'mm' | 'm' = 'mm'): string {
  if (unit === 'm') return `${(mm / 1000).toFixed(2)}m`;
  return `${mm}mm`;
}

/** Build walls for a rectangular room */
export function buildRectangularWalls(width: number, depth: number, thickness = 100): Wall[] {
  return [
    { id: 'wall-north', start: { x: 0, y: 0 }, end: { x: width, y: 0 }, thickness, label: 'North' },
    { id: 'wall-east', start: { x: width, y: 0 }, end: { x: width, y: depth }, thickness, label: 'East' },
    { id: 'wall-south', start: { x: width, y: depth }, end: { x: 0, y: depth }, thickness, label: 'South' },
    { id: 'wall-west', start: { x: 0, y: depth }, end: { x: 0, y: 0 }, thickness, label: 'West' },
  ];
}

// ─── Shape Presets ───────────────────────────────────────────────────────────

export type RoomShapePreset = 'rectangle' | 'l-shape' | 'u-shape' | 'custom';

export const ROOM_SHAPE_LABELS: Record<RoomShapePreset, string> = {
  rectangle: 'Rectangle',
  'l-shape': 'L-Shape',
  'u-shape': 'U-Shape',
  custom: 'Custom',
};

export const ROOM_SHAPE_DESCRIPTIONS: Record<RoomShapePreset, string> = {
  rectangle: 'Simple rectangular room',
  'l-shape': 'L-shaped room with one corner cutout',
  'u-shape': 'U-shaped room with two wing arms',
  custom: 'Start with a rectangle, edit walls freely',
};

/**
 * Build walls for an L-shaped room.
 * The cutout is removed from the bottom-right corner.
 *
 *   ┌──────────────── mainWidth ────────────────┐
 *   │                                            │
 *   │               mainDepth                    │
 *   │                                            │
 *   │                   ┌────── cutoutWidth ─────┘
 *   │                   │         cutoutDepth
 *   └───────────────────┘
 */
export function buildLShapeWalls(
  mainWidth: number,
  mainDepth: number,
  cutoutWidth: number,
  cutoutDepth: number,
  thickness = 100,
): Wall[] {
  const cw = Math.min(cutoutWidth, mainWidth - 200);
  const cd = Math.min(cutoutDepth, mainDepth - 200);
  const innerX = mainWidth - cw;
  const innerY = mainDepth - cd;

  return [
    { id: 'wall-1', start: { x: 0, y: 0 }, end: { x: mainWidth, y: 0 }, thickness, label: 'Wall 1 (Top)' },
    { id: 'wall-2', start: { x: mainWidth, y: 0 }, end: { x: mainWidth, y: innerY }, thickness, label: 'Wall 2 (Right upper)' },
    { id: 'wall-3', start: { x: mainWidth, y: innerY }, end: { x: innerX, y: innerY }, thickness, label: 'Wall 3 (Inner horizontal)' },
    { id: 'wall-4', start: { x: innerX, y: innerY }, end: { x: innerX, y: mainDepth }, thickness, label: 'Wall 4 (Inner vertical)' },
    { id: 'wall-5', start: { x: innerX, y: mainDepth }, end: { x: 0, y: mainDepth }, thickness, label: 'Wall 5 (Bottom)' },
    { id: 'wall-6', start: { x: 0, y: mainDepth }, end: { x: 0, y: 0 }, thickness, label: 'Wall 6 (Left)' },
  ];
}

/**
 * Build walls for a U-shaped room.
 * Two wings extend downward from the main run.
 *
 *   ┌──── leftWing ────┐                  ┌──── rightWing ────┐
 *   │                   │   inner width    │                    │
 *   │   wingDepth       │                  │     wingDepth      │
 *   │                   └──────────────────┘                    │
 *   │                          width                            │
 *   └──────────────────────────────────────────────────────────┘
 */
export function buildUShapeWalls(
  width: number,
  depth: number,
  leftWingWidth: number,
  rightWingWidth: number,
  wingDepth: number,
  thickness = 100,
): Wall[] {
  const lw = Math.min(leftWingWidth, width / 3);
  const rw = Math.min(rightWingWidth, width / 3);
  const wd = Math.min(wingDepth, depth - 200);
  const innerTop = depth - wd;

  return [
    { id: 'wall-1', start: { x: 0, y: 0 }, end: { x: width, y: 0 }, thickness, label: 'Wall 1 (Bottom)' },
    { id: 'wall-2', start: { x: width, y: 0 }, end: { x: width, y: depth }, thickness, label: 'Wall 2 (Right outer)' },
    { id: 'wall-3', start: { x: width, y: depth }, end: { x: width - rw, y: depth }, thickness, label: 'Wall 3 (Top right)' },
    { id: 'wall-4', start: { x: width - rw, y: depth }, end: { x: width - rw, y: innerTop }, thickness, label: 'Wall 4 (Right wing inner)' },
    { id: 'wall-5', start: { x: width - rw, y: innerTop }, end: { x: lw, y: innerTop }, thickness, label: 'Wall 5 (Inner top)' },
    { id: 'wall-6', start: { x: lw, y: innerTop }, end: { x: lw, y: depth }, thickness, label: 'Wall 6 (Left wing inner)' },
    { id: 'wall-7', start: { x: lw, y: depth }, end: { x: 0, y: depth }, thickness, label: 'Wall 7 (Top left)' },
    { id: 'wall-8', start: { x: 0, y: depth }, end: { x: 0, y: 0 }, thickness, label: 'Wall 8 (Left outer)' },
  ];
}

/** Build a room shape from a preset with given dimensions */
export function buildRoomFromPreset(
  preset: RoomShapePreset,
  width: number,
  depth: number,
  height: number,
  extraDims?: {
    cutoutWidth?: number;
    cutoutDepth?: number;
    leftWingWidth?: number;
    rightWingWidth?: number;
    wingDepth?: number;
  },
): RoomShape {
  switch (preset) {
    case 'l-shape':
      return {
        type: 'polygon',
        width,
        depth,
        height,
        walls: buildLShapeWalls(
          width,
          depth,
          extraDims?.cutoutWidth ?? Math.round(width * 0.4),
          extraDims?.cutoutDepth ?? Math.round(depth * 0.4),
        ),
      };
    case 'u-shape':
      return {
        type: 'polygon',
        width,
        depth,
        height,
        walls: buildUShapeWalls(
          width,
          depth,
          extraDims?.leftWingWidth ?? Math.round(width * 0.25),
          extraDims?.rightWingWidth ?? Math.round(width * 0.25),
          extraDims?.wingDepth ?? Math.round(depth * 0.5),
        ),
      };
    case 'rectangle':
    case 'custom':
    default:
      return {
        type: preset === 'custom' ? 'polygon' : 'rectangular',
        width,
        depth,
        height,
        walls: buildRectangularWalls(width, depth),
      };
  }
}

/** Create a layout document from a shape preset */
export function createLayoutDocumentFromPreset(
  preset: RoomShapePreset,
  width: number,
  depth: number,
  height: number,
  extraDims?: {
    cutoutWidth?: number;
    cutoutDepth?: number;
    leftWingWidth?: number;
    rightWingWidth?: number;
    wingDepth?: number;
  },
): LayoutDocument {
  return {
    version: 1,
    room: buildRoomFromPreset(preset, width, depth, height, extraDims),
    openings: [],
    placedModules: [],
    relationships: [],
    viewSettings: {
      gridSize: 100,
      showGrid: true,
      showDimensions: true,
      zoom: 1,
      panOffset: { x: 0, y: 0 },
    },
  };
}
