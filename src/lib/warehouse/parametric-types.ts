// src/lib/warehouse/parametric-types.ts
//
// Parametric cabinet/object specification for structured generation.
// Stored in warehouse_assets.planner_hints.cabinet_spec as jsonb.
//
// This is NOT a rendering engine. It is a structured description of an object's
// internal composition that can feed:
//   - 2D preview generation (SVG front/side elevation)
//   - planner_hints for the spatial engine
//   - future 3D mesh generation
//   - cross-platform rendering (web + iOS + Android)

// ─── Cabinet Types ───────────────────────────────────────────────────────────

export type CabinetType =
  | 'base_cabinet'
  | 'wall_cabinet'
  | 'tall_cabinet'
  | 'drawer_stack'
  | 'shelf_unit'
  | 'island'
  | 'wardrobe_section';

// ─── Sub-Specs ───────────────────────────────────────────────────────────────

export interface CarcassSpec {
  panelThickness: number;     // mm, default 18
  backPanelThickness: number; // mm, default 8
  hasBack: boolean;
}

export interface PlinthSpec {
  enabled: boolean;
  height: number;   // mm, default 150
  inset: number;    // mm from front face, default 50
  thickness: number; // mm, default 18
}

export type DoorStyle =
  | 'slab'
  | 'shaker'
  | 'raised_panel'
  | 'glass'
  | 'none';

export type HingeSide = 'left' | 'right' | 'both' | 'none';

export interface DoorsSpec {
  count: number;        // 0 = no doors
  style: DoorStyle;
  hingeSide: HingeSide; // 'both' = split pair
  gap: number;          // reveal gap in mm, default 2
}

export interface DrawersSpec {
  count: number;
  heights: number[];    // individual drawer front heights in mm
  gap: number;          // gap between drawers in mm, default 2
}

export interface ShelvesSpec {
  count: number;        // internal shelves (0 = hollow)
  adjustable: boolean;
  openFront: boolean;   // true = no doors covering these shelves
  thickness: number;    // shelf panel thickness in mm, default 18
}

export interface WorktopSpec {
  enabled: boolean;
  overhang: number;     // front/side overhang in mm, default 25
  thickness: number;    // worktop thickness in mm, default 40
}

export type HandleStyle =
  | 'bar'
  | 'knob'
  | 'cup'
  | 'j_pull'
  | 'integrated'
  | 'none';

export type HandlePosition = 'top' | 'center' | 'bottom';

export interface HandleSpec {
  style: HandleStyle;
  position: HandlePosition;
}

export interface DivisionsSpec {
  verticalDividers: number;   // creates columns
  horizontalDividers: number; // creates rows within columns
}

export interface FinishSpec {
  carcass: string;  // e.g. 'White Melamine'
  door: string;     // e.g. 'Anthracite Matt'
  worktop: string;  // e.g. 'Oak Laminate'
  edge: string;     // e.g. 'Matching ABS'
}

// ─── Core Spec ───────────────────────────────────────────────────────────────

export interface CabinetSpec {
  type: CabinetType;
  carcass: CarcassSpec;
  plinth: PlinthSpec;
  doors: DoorsSpec;
  drawers: DrawersSpec;
  shelves: ShelvesSpec;
  worktop: WorktopSpec;
  handle: HandleSpec;
  divisions: DivisionsSpec;
  finish: FinishSpec;
}

// ─── Defaults by Type ────────────────────────────────────────────────────────

const SHARED_CARCASS: CarcassSpec = {
  panelThickness: 18,
  backPanelThickness: 8,
  hasBack: true,
};

const SHARED_PLINTH: PlinthSpec = {
  enabled: true,
  height: 150,
  inset: 50,
  thickness: 18,
};

const NO_PLINTH: PlinthSpec = {
  enabled: false,
  height: 0,
  inset: 0,
  thickness: 0,
};

const DEFAULT_HANDLE: HandleSpec = {
  style: 'bar',
  position: 'top',
};

const NO_DIVISIONS: DivisionsSpec = {
  verticalDividers: 0,
  horizontalDividers: 0,
};

const DEFAULT_FINISH: FinishSpec = {
  carcass: 'White Melamine',
  door: 'White Melamine',
  worktop: '',
  edge: 'Matching ABS',
};

/**
 * Return a sensible default CabinetSpec for a given type.
 * Dimensions come from the editor's width/depth/height fields.
 */
export function defaultCabinetSpec(type: CabinetType): CabinetSpec {
  switch (type) {
    case 'base_cabinet':
      return {
        type,
        carcass: SHARED_CARCASS,
        plinth: SHARED_PLINTH,
        doors: { count: 1, style: 'slab', hingeSide: 'left', gap: 2 },
        drawers: { count: 0, heights: [], gap: 2 },
        shelves: { count: 1, adjustable: true, openFront: false, thickness: 18 },
        worktop: { enabled: true, overhang: 25, thickness: 40 },
        handle: DEFAULT_HANDLE,
        divisions: NO_DIVISIONS,
        finish: { ...DEFAULT_FINISH, worktop: 'Laminate' },
      };

    case 'wall_cabinet':
      return {
        type,
        carcass: SHARED_CARCASS,
        plinth: NO_PLINTH,
        doors: { count: 1, style: 'slab', hingeSide: 'left', gap: 2 },
        drawers: { count: 0, heights: [], gap: 2 },
        shelves: { count: 2, adjustable: true, openFront: false, thickness: 18 },
        worktop: { enabled: false, overhang: 0, thickness: 0 },
        handle: { style: 'bar', position: 'bottom' },
        divisions: NO_DIVISIONS,
        finish: DEFAULT_FINISH,
      };

    case 'tall_cabinet':
      return {
        type,
        carcass: SHARED_CARCASS,
        plinth: SHARED_PLINTH,
        doors: { count: 2, style: 'slab', hingeSide: 'left', gap: 2 },
        drawers: { count: 0, heights: [], gap: 2 },
        shelves: { count: 4, adjustable: true, openFront: false, thickness: 18 },
        worktop: { enabled: false, overhang: 0, thickness: 0 },
        handle: DEFAULT_HANDLE,
        divisions: NO_DIVISIONS,
        finish: DEFAULT_FINISH,
      };

    case 'drawer_stack':
      return {
        type,
        carcass: SHARED_CARCASS,
        plinth: SHARED_PLINTH,
        doors: { count: 0, style: 'none', hingeSide: 'none', gap: 0 },
        drawers: { count: 4, heights: [140, 140, 200, 280], gap: 2 },
        shelves: { count: 0, adjustable: false, openFront: false, thickness: 18 },
        worktop: { enabled: true, overhang: 25, thickness: 40 },
        handle: { style: 'bar', position: 'center' },
        divisions: NO_DIVISIONS,
        finish: { ...DEFAULT_FINISH, worktop: 'Laminate' },
      };

    case 'shelf_unit':
      return {
        type,
        carcass: SHARED_CARCASS,
        plinth: SHARED_PLINTH,
        doors: { count: 0, style: 'none', hingeSide: 'none', gap: 0 },
        drawers: { count: 0, heights: [], gap: 2 },
        shelves: { count: 3, adjustable: true, openFront: true, thickness: 18 },
        worktop: { enabled: false, overhang: 0, thickness: 0 },
        handle: { style: 'none', position: 'center' },
        divisions: NO_DIVISIONS,
        finish: DEFAULT_FINISH,
      };

    case 'island':
      return {
        type,
        carcass: SHARED_CARCASS,
        plinth: SHARED_PLINTH,
        doors: { count: 2, style: 'slab', hingeSide: 'both', gap: 2 },
        drawers: { count: 2, heights: [140, 200], gap: 2 },
        shelves: { count: 1, adjustable: true, openFront: false, thickness: 18 },
        worktop: { enabled: true, overhang: 40, thickness: 40 },
        handle: DEFAULT_HANDLE,
        divisions: { verticalDividers: 1, horizontalDividers: 0 },
        finish: { ...DEFAULT_FINISH, worktop: 'Stone' },
      };

    case 'wardrobe_section':
      return {
        type,
        carcass: { ...SHARED_CARCASS, panelThickness: 18 },
        plinth: SHARED_PLINTH,
        doors: { count: 1, style: 'slab', hingeSide: 'left', gap: 2 },
        drawers: { count: 0, heights: [], gap: 2 },
        shelves: { count: 1, adjustable: true, openFront: false, thickness: 18 },
        worktop: { enabled: false, overhang: 0, thickness: 0 },
        handle: DEFAULT_HANDLE,
        divisions: NO_DIVISIONS,
        finish: DEFAULT_FINISH,
      };
  }
}

// ─── Subtype → CabinetType mapping ──────────────────────────────────────────

/** Map editor subtypes to parametric cabinet types, or null if not parametric. */
export function subtypeToCabinetType(
  category: string,
  subtype: string,
): CabinetType | null {
  if (category === 'kitchen') {
    switch (subtype) {
      case 'base_unit': return 'base_cabinet';
      case 'wall_unit': return 'wall_cabinet';
      case 'tall_unit': return 'tall_cabinet';
      case 'drawer_unit': return 'drawer_stack';
      case 'corner_unit': return 'base_cabinet'; // corner uses base shape
      case 'appliance_housing': return 'tall_cabinet'; // housing is a tall variant
      default: return null;
    }
  }
  if (category === 'wardrobe') {
    switch (subtype) {
      case 'single':
      case 'double':
      case 'hanging_module':
        return 'wardrobe_section';
      case 'shelving': return 'shelf_unit';
      case 'drawers': return 'drawer_stack';
      default: return null;
    }
  }
  if (category === 'room_elements') {
    if (subtype === 'island') return 'island';
    return null;
  }
  return null;
}

/** Check if a category+subtype supports the parametric builder. */
export function isParametricEligible(category: string, subtype: string): boolean {
  return subtypeToCabinetType(category, subtype) !== null;
}
