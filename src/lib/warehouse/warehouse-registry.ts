// src/lib/warehouse/warehouse-registry.ts v1.0
//
// PURPOSE:
// Preset asset library for the TISSCA Warehouse.
// All system-provided components — kitchen units, wardrobes, openings,
// room elements, appliances — are defined here.
//
// Each asset follows the WarehouseAsset contract from warehouse-types.ts.
// The registry is the default palette; users can later import or scan their own.

import type { WarehouseAsset } from './warehouse-types';

// ─── Helper ──────────────────────────────────────────────────────────────────

let _seq = 0;
function wid(prefix: string): string {
  _seq++;
  return `wh-${prefix}-${_seq}`;
}

/** Standard non-resizable parametric rules */
const FIXED = {
  resizable: false as const,
};

/** Standard cabinet parametric rules (resizable width only) */
const CABINET_PARAM = {
  resizable: true as const,
  minWidth: 300,
  maxWidth: 1200,
  stepWidth: 50,
  minDepth: 300,
  maxDepth: 700,
  stepDepth: 10,
};

/** Standard tall parametric rules */
const TALL_PARAM = {
  resizable: true as const,
  minWidth: 400,
  maxWidth: 900,
  stepWidth: 50,
  minHeight: 1800,
  maxHeight: 2400,
  stepHeight: 50,
};

/** Standard side-attach connection */
const SIDE_CONNECT = {
  canAttachSide: true as const,
  canStack: false as const,
};

/** Free-standing (no connections) */
const NO_CONNECT = {
  canAttachSide: false as const,
  canStack: false as const,
};

// ─── Cabinetry Constants ─────────────────────────────────────────────────────

/** Standard panel / end panel thickness (mm) */
export const PANEL_THICKNESS_MM = 18;

/** Standard plinth height (mm) — matches coordinateUtils.PLINTH_HEIGHT_MM */
export const PLINTH_HEIGHT_MM = 150;

/** Standard plinth stock length (mm) */
export const PLINTH_STOCK_LENGTH_MM = 2400;

// ─── Design System Colours ───────────────────────────────────────────────────

const C = {
  // Kitchen
  baseUnit:     '#8FAABE',
  wallUnit:     '#A3B899',
  tallUnit:     '#C4A882',
  drawerUnit:   '#7EAAC0',
  cornerUnit:   '#96A8B4',
  appHousing:   '#B89E7B',
  // Wardrobe
  wardrobeSingle: '#B0A0C0',
  wardrobeDouble: '#B0A0C0',
  shelving:       '#A898B0',
  wDrawers:       '#9E90A8',
  hanging:        '#C0B0D0',
  // Openings
  door:    '#6B8F71',
  window:  '#7BA4C7',
  biFold:  '#5E8A66',
  sliding: '#5080A0',
  // Room Elements
  radiator: '#C0C0C0',
  island:   '#D4C4A0',
  column:   '#A0A0A0',
  custom:   '#C8C0B8',
  worktop:  '#B0A890',
  plinth:   '#A09080',
  cornice:  '#B8B0A0',
  endPanel: '#BEB0A0',
  filler:   '#C0B098',
  pelmet:   '#B0A898',
  // Hardware
  handle:   '#707070',
  hinge:    '#909090',
  // Appliances
  oven:       '#505050',
  hob:        '#484848',
  fridge:     '#E8E8E8',
  dishwasher: '#D0D0D0',
  washer:     '#D8D8D8',
  microwave:  '#606060',
  extractor:  '#888888',
};

// ─── Kitchen Assets ──────────────────────────────────────────────────────────

const KITCHEN_ASSETS: WarehouseAsset[] = [
  // Base Units
  {
    id: wid('kit'), name: 'Base Unit 500', category: 'kitchen', subtype: 'base_unit',
    dimensions: { width: 500, depth: 580, height: 870 },
    parametric: CABINET_PARAM,
    material: { name: 'Standard Laminate', type: 'laminate', color: C.baseUnit },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'base', '500'], unitPrice: 120, currency: 'GBP' },
    enabled: true, sortOrder: 1,
  },
  {
    id: wid('kit'), name: 'Base Unit 600', category: 'kitchen', subtype: 'base_unit',
    dimensions: { width: 600, depth: 580, height: 870 },
    parametric: CABINET_PARAM,
    material: { name: 'Standard Laminate', type: 'laminate', color: C.baseUnit },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'base', '600'], unitPrice: 140, currency: 'GBP' },
    enabled: true, sortOrder: 2,
  },
  {
    id: wid('kit'), name: 'Base Unit 800', category: 'kitchen', subtype: 'base_unit',
    dimensions: { width: 800, depth: 580, height: 870 },
    parametric: CABINET_PARAM,
    material: { name: 'Standard Laminate', type: 'laminate', color: C.baseUnit },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'base', '800'], unitPrice: 180, currency: 'GBP' },
    enabled: true, sortOrder: 3,
  },
  {
    id: wid('kit'), name: 'Base Unit 1000', category: 'kitchen', subtype: 'base_unit',
    dimensions: { width: 1000, depth: 580, height: 870 },
    parametric: CABINET_PARAM,
    material: { name: 'Standard Laminate', type: 'laminate', color: C.baseUnit },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'base', '1000'], unitPrice: 220, currency: 'GBP' },
    enabled: true, sortOrder: 4,
  },

  // Wall Units
  {
    id: wid('kit'), name: 'Wall Unit 500', category: 'kitchen', subtype: 'wall_unit',
    dimensions: { width: 500, depth: 330, height: 720 },
    parametric: { ...CABINET_PARAM, minDepth: 280, maxDepth: 400 },
    material: { name: 'Standard Laminate', type: 'laminate', color: C.wallUnit },
    placement: 'wall_mounted', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'wall', '500'], unitPrice: 95, currency: 'GBP' },
    enabled: true, sortOrder: 10,
  },
  {
    id: wid('kit'), name: 'Wall Unit 600', category: 'kitchen', subtype: 'wall_unit',
    dimensions: { width: 600, depth: 330, height: 720 },
    parametric: { ...CABINET_PARAM, minDepth: 280, maxDepth: 400 },
    material: { name: 'Standard Laminate', type: 'laminate', color: C.wallUnit },
    placement: 'wall_mounted', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'wall', '600'], unitPrice: 110, currency: 'GBP' },
    enabled: true, sortOrder: 11,
  },
  {
    id: wid('kit'), name: 'Wall Unit 800', category: 'kitchen', subtype: 'wall_unit',
    dimensions: { width: 800, depth: 330, height: 720 },
    parametric: { ...CABINET_PARAM, minDepth: 280, maxDepth: 400 },
    material: { name: 'Standard Laminate', type: 'laminate', color: C.wallUnit },
    placement: 'wall_mounted', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'wall', '800'], unitPrice: 130, currency: 'GBP' },
    enabled: true, sortOrder: 12,
  },

  // Tall Units
  {
    id: wid('kit'), name: 'Tall Unit 600', category: 'kitchen', subtype: 'tall_unit',
    dimensions: { width: 600, depth: 580, height: 2100 },
    parametric: TALL_PARAM,
    material: { name: 'Standard Laminate', type: 'laminate', color: C.tallUnit },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'tall', '600', 'larder'], unitPrice: 280, currency: 'GBP' },
    enabled: true, sortOrder: 20,
  },

  // Drawer Units
  {
    id: wid('kit'), name: 'Drawer Unit 500', category: 'kitchen', subtype: 'drawer_unit',
    dimensions: { width: 500, depth: 580, height: 870 },
    parametric: CABINET_PARAM,
    material: { name: 'Standard Laminate', type: 'laminate', color: C.drawerUnit },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'drawer', '500'], unitPrice: 160, currency: 'GBP' },
    enabled: true, sortOrder: 30,
  },
  {
    id: wid('kit'), name: 'Drawer Unit 600', category: 'kitchen', subtype: 'drawer_unit',
    dimensions: { width: 600, depth: 580, height: 870 },
    parametric: CABINET_PARAM,
    material: { name: 'Standard Laminate', type: 'laminate', color: C.drawerUnit },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'drawer', '600'], unitPrice: 175, currency: 'GBP' },
    enabled: true, sortOrder: 31,
  },

  // Corner Units
  {
    id: wid('kit'), name: 'Corner Base Unit', category: 'kitchen', subtype: 'corner_unit',
    dimensions: { width: 900, depth: 900, height: 870 },
    parametric: { resizable: true, minWidth: 800, maxWidth: 1100, stepWidth: 50, minDepth: 800, maxDepth: 1100, stepDepth: 50 },
    material: { name: 'Standard Laminate', type: 'laminate', color: C.cornerUnit },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'corner', 'base'], unitPrice: 260, currency: 'GBP' },
    enabled: true, sortOrder: 40,
  },
  {
    id: wid('kit'), name: 'Corner Wall Unit', category: 'kitchen', subtype: 'corner_unit',
    dimensions: { width: 600, depth: 600, height: 720 },
    parametric: { resizable: true, minWidth: 500, maxWidth: 800, stepWidth: 50, minDepth: 500, maxDepth: 800, stepDepth: 50 },
    material: { name: 'Standard Laminate', type: 'laminate', color: C.cornerUnit },
    placement: 'wall_mounted', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'corner', 'wall'], unitPrice: 160, currency: 'GBP' },
    enabled: true, sortOrder: 41,
  },

  // Appliance Housing
  {
    id: wid('kit'), name: 'Oven Housing 600', category: 'kitchen', subtype: 'appliance_housing',
    dimensions: { width: 600, depth: 580, height: 2100 },
    parametric: { resizable: false },
    material: { name: 'Standard Laminate', type: 'laminate', color: C.appHousing },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'appliance', 'oven', 'housing'], unitPrice: 320, currency: 'GBP' },
    enabled: true, sortOrder: 50,
  },
  {
    id: wid('kit'), name: 'Fridge Housing 600', category: 'kitchen', subtype: 'appliance_housing',
    dimensions: { width: 600, depth: 580, height: 2100 },
    parametric: { resizable: false },
    material: { name: 'Standard Laminate', type: 'laminate', color: C.appHousing },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['kitchen', 'appliance', 'fridge', 'housing'], unitPrice: 300, currency: 'GBP' },
    enabled: true, sortOrder: 51,
  },
];

// ─── Wardrobe Assets ─────────────────────────────────────────────────────────

const WARDROBE_ASSETS: WarehouseAsset[] = [
  {
    id: wid('wrd'), name: 'Single Wardrobe 600', category: 'wardrobe', subtype: 'single',
    dimensions: { width: 600, depth: 580, height: 2100 },
    parametric: TALL_PARAM,
    material: { name: 'Melamine White', type: 'laminate', color: C.wardrobeSingle },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['wardrobe', 'single', '600'], unitPrice: 240, currency: 'GBP' },
    enabled: true, sortOrder: 1,
  },
  {
    id: wid('wrd'), name: 'Double Wardrobe 1200', category: 'wardrobe', subtype: 'double',
    dimensions: { width: 1200, depth: 580, height: 2100 },
    parametric: { ...TALL_PARAM, minWidth: 900, maxWidth: 1800 },
    material: { name: 'Melamine White', type: 'laminate', color: C.wardrobeDouble },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['wardrobe', 'double', '1200'], unitPrice: 420, currency: 'GBP' },
    enabled: true, sortOrder: 2,
  },
  {
    id: wid('wrd'), name: 'Shelving Module 600', category: 'wardrobe', subtype: 'shelving',
    dimensions: { width: 600, depth: 400, height: 2100 },
    parametric: TALL_PARAM,
    material: { name: 'Melamine White', type: 'laminate', color: C.shelving },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['wardrobe', 'shelving', '600'], unitPrice: 200, currency: 'GBP' },
    enabled: true, sortOrder: 3,
  },
  {
    id: wid('wrd'), name: 'Drawer Tower 600', category: 'wardrobe', subtype: 'drawers',
    dimensions: { width: 600, depth: 500, height: 1100 },
    parametric: { resizable: true, minWidth: 400, maxWidth: 800, stepWidth: 50 },
    material: { name: 'Melamine White', type: 'laminate', color: C.wDrawers },
    placement: 'wall_only', connection: { canAttachSide: true, canStack: true }, source: 'systemPreset',
    metadata: { tags: ['wardrobe', 'drawers', '600'], unitPrice: 190, currency: 'GBP' },
    enabled: true, sortOrder: 4,
  },
  {
    id: wid('wrd'), name: 'Hanging Module 800', category: 'wardrobe', subtype: 'hanging_module',
    dimensions: { width: 800, depth: 580, height: 2100 },
    parametric: { ...TALL_PARAM, minWidth: 600, maxWidth: 1200 },
    material: { name: 'Melamine White', type: 'laminate', color: C.hanging },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['wardrobe', 'hanging', '800', 'rail'], unitPrice: 260, currency: 'GBP' },
    enabled: true, sortOrder: 5,
  },
];

// ─── Openings Assets ─────────────────────────────────────────────────────────

const OPENINGS_ASSETS: WarehouseAsset[] = [
  {
    id: wid('opn'), name: 'Standard Door 800', category: 'openings', subtype: 'door',
    dimensions: { width: 800, depth: 100, height: 2050 },
    parametric: { resizable: true, minWidth: 600, maxWidth: 1000, stepWidth: 50 },
    material: { name: 'Painted Wood', type: 'wood', color: C.door },
    placement: 'wall_only', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['opening', 'door', 'standard'], unitPrice: 180, currency: 'GBP' },
    enabled: true, sortOrder: 1,
  },
  {
    id: wid('opn'), name: 'Standard Door 900', category: 'openings', subtype: 'door',
    dimensions: { width: 900, depth: 100, height: 2050 },
    parametric: { resizable: true, minWidth: 600, maxWidth: 1000, stepWidth: 50 },
    material: { name: 'Painted Wood', type: 'wood', color: C.door },
    placement: 'wall_only', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['opening', 'door', 'standard', '900'], unitPrice: 200, currency: 'GBP' },
    enabled: true, sortOrder: 2,
  },
  {
    id: wid('opn'), name: 'Window 1200×1000', category: 'openings', subtype: 'window',
    dimensions: { width: 1200, depth: 100, height: 1000 },
    parametric: { resizable: true, minWidth: 600, maxWidth: 2400, stepWidth: 100, minHeight: 400, maxHeight: 1800, stepHeight: 100 },
    material: { name: 'uPVC White', type: 'other', color: C.window },
    placement: 'wall_only', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['opening', 'window', '1200'], unitPrice: 350, currency: 'GBP' },
    enabled: true, sortOrder: 10,
  },
  {
    id: wid('opn'), name: 'Window 900×600', category: 'openings', subtype: 'window',
    dimensions: { width: 900, depth: 100, height: 600 },
    parametric: { resizable: true, minWidth: 400, maxWidth: 2400, stepWidth: 100, minHeight: 300, maxHeight: 1800, stepHeight: 100 },
    material: { name: 'uPVC White', type: 'other', color: C.window },
    placement: 'wall_only', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['opening', 'window', '900'], unitPrice: 280, currency: 'GBP' },
    enabled: true, sortOrder: 11,
  },
  {
    id: wid('opn'), name: 'Bi-Fold Door 1800', category: 'openings', subtype: 'bi_fold',
    dimensions: { width: 1800, depth: 100, height: 2100 },
    parametric: { resizable: true, minWidth: 1200, maxWidth: 3600, stepWidth: 200 },
    material: { name: 'Aluminium', type: 'metal', color: C.biFold },
    placement: 'wall_only', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['opening', 'bi-fold', 'patio'], unitPrice: 1200, currency: 'GBP' },
    enabled: true, sortOrder: 20,
  },
  {
    id: wid('opn'), name: 'Sliding Door 1500', category: 'openings', subtype: 'sliding',
    dimensions: { width: 1500, depth: 100, height: 2100 },
    parametric: { resizable: true, minWidth: 1000, maxWidth: 3000, stepWidth: 100 },
    material: { name: 'Aluminium', type: 'metal', color: C.sliding },
    placement: 'wall_only', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['opening', 'sliding', 'patio'], unitPrice: 900, currency: 'GBP' },
    enabled: true, sortOrder: 21,
  },
];

// ─── Room Elements ───────────────────────────────────────────────────────────

const ROOM_ELEMENT_ASSETS: WarehouseAsset[] = [
  {
    id: wid('elm'), name: 'Radiator 1000', category: 'room_elements', subtype: 'radiator',
    dimensions: { width: 1000, depth: 100, height: 600 },
    parametric: { resizable: true, minWidth: 400, maxWidth: 2000, stepWidth: 100 },
    material: { name: 'Steel White', type: 'metal', color: C.radiator },
    placement: 'wall_only', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['room', 'radiator', 'heating'], unitPrice: 80, currency: 'GBP' },
    enabled: true, sortOrder: 1,
  },
  {
    id: wid('elm'), name: 'Kitchen Island 1200×600', category: 'room_elements', subtype: 'island',
    dimensions: { width: 1200, depth: 600, height: 870 },
    parametric: { resizable: true, minWidth: 800, maxWidth: 2400, stepWidth: 100, minDepth: 500, maxDepth: 1000, stepDepth: 100 },
    material: { name: 'Natural Oak', type: 'wood', color: C.island },
    placement: 'floor', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['room', 'island', 'kitchen'], unitPrice: 600, currency: 'GBP' },
    enabled: true, sortOrder: 10,
  },
  {
    id: wid('elm'), name: 'Column 300×300', category: 'room_elements', subtype: 'column',
    dimensions: { width: 300, depth: 300, height: 2400 },
    parametric: { resizable: true, minWidth: 150, maxWidth: 600, stepWidth: 50 },
    material: { name: 'Concrete', type: 'stone', color: C.column },
    placement: 'floor', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['room', 'column', 'structural'] },
    enabled: true, sortOrder: 20,
  },
  {
    id: wid('elm'), name: 'Custom Block', category: 'room_elements', subtype: 'custom_block',
    dimensions: { width: 500, depth: 500, height: 500 },
    parametric: { resizable: true, minWidth: 100, maxWidth: 3000, stepWidth: 50, minDepth: 100, maxDepth: 3000, stepDepth: 50, minHeight: 100, maxHeight: 3000, stepHeight: 50 },
    material: { name: 'Custom', type: 'other', color: C.custom },
    placement: 'free', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['room', 'custom', 'block'], notes: 'Fully resizable block — use for any object' },
    enabled: true, sortOrder: 30,
  },
  {
    id: wid('elm'), name: 'Worktop Section', category: 'room_elements', subtype: 'worktop',
    dimensions: { width: 600, depth: 640, height: 40 },
    parametric: { resizable: true, minWidth: 300, maxWidth: 4000, stepWidth: 50, minDepth: 580, maxDepth: 900, stepDepth: 10 },
    material: { name: 'Quartz', type: 'stone', color: C.worktop },
    placement: 'wall_only', connection: { canAttachSide: true, canStack: false }, source: 'systemPreset',
    metadata: { tags: ['room', 'worktop', 'kitchen'], unitPrice: 150, currency: 'GBP', notes: 'Per linear metre' },
    enabled: true, sortOrder: 40,
  },
];

// ─── Appliances ──────────────────────────────────────────────────────────────

const APPLIANCE_ASSETS: WarehouseAsset[] = [
  {
    id: wid('app'), name: 'Built-in Oven', category: 'appliances', subtype: 'oven',
    dimensions: { width: 600, depth: 560, height: 595 },
    parametric: FIXED,
    material: { name: 'Stainless Steel', type: 'metal', color: C.oven },
    placement: 'wall_only', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['appliance', 'oven', 'built-in'], unitPrice: 400, currency: 'GBP' },
    enabled: true, sortOrder: 1,
  },
  {
    id: wid('app'), name: 'Gas Hob 600', category: 'appliances', subtype: 'hob',
    dimensions: { width: 600, depth: 520, height: 50 },
    parametric: FIXED,
    material: { name: 'Tempered Glass', type: 'glass', color: C.hob },
    placement: 'wall_only', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['appliance', 'hob', 'gas'], unitPrice: 250, currency: 'GBP' },
    enabled: true, sortOrder: 2,
  },
  {
    id: wid('app'), name: 'Integrated Fridge', category: 'appliances', subtype: 'fridge',
    dimensions: { width: 600, depth: 560, height: 1770 },
    parametric: FIXED,
    material: { name: 'Painted Steel', type: 'metal', color: C.fridge },
    placement: 'wall_only', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['appliance', 'fridge', 'integrated'], unitPrice: 500, currency: 'GBP' },
    enabled: true, sortOrder: 3,
  },
  {
    id: wid('app'), name: 'Dishwasher 600', category: 'appliances', subtype: 'dishwasher',
    dimensions: { width: 600, depth: 580, height: 820 },
    parametric: FIXED,
    material: { name: 'Stainless Steel', type: 'metal', color: C.dishwasher },
    placement: 'wall_only', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['appliance', 'dishwasher'], unitPrice: 350, currency: 'GBP' },
    enabled: true, sortOrder: 4,
  },
  {
    id: wid('app'), name: 'Washing Machine', category: 'appliances', subtype: 'washing_machine',
    dimensions: { width: 600, depth: 600, height: 850 },
    parametric: FIXED,
    material: { name: 'Painted Steel', type: 'metal', color: C.washer },
    placement: 'wall_only', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['appliance', 'washing', 'laundry'], unitPrice: 380, currency: 'GBP' },
    enabled: true, sortOrder: 5,
  },
  {
    id: wid('app'), name: 'Microwave 500', category: 'appliances', subtype: 'microwave',
    dimensions: { width: 500, depth: 400, height: 310 },
    parametric: FIXED,
    material: { name: 'Stainless Steel', type: 'metal', color: C.microwave },
    placement: 'wall_mounted', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['appliance', 'microwave'], unitPrice: 120, currency: 'GBP' },
    enabled: true, sortOrder: 6,
  },
  {
    id: wid('app'), name: 'Cooker Hood 600', category: 'appliances', subtype: 'extractor',
    dimensions: { width: 600, depth: 500, height: 150 },
    parametric: { resizable: true, minWidth: 500, maxWidth: 900, stepWidth: 100 },
    material: { name: 'Stainless Steel', type: 'metal', color: C.extractor },
    placement: 'wall_mounted', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['appliance', 'extractor', 'hood', 'cooker'], unitPrice: 200, currency: 'GBP' },
    enabled: true, sortOrder: 7,
  },
];

// ─── Finishing Components ─────────────────────────────────────────────────────

/** Panel parametric: width fixed per variant, height resizable */
const PANEL_PARAM = {
  resizable: true as const,
  minHeight: 100,
  maxHeight: 2400,
  stepHeight: 10,
};

/** Linear trim parametric (plinth, cornice, pelmet) — length resizable */
const TRIM_PARAM = {
  resizable: true as const,
  minWidth: 100,
  maxWidth: 4000,
  stepWidth: 50,
};

const FINISHING_ASSETS: WarehouseAsset[] = [
  // ── End Panels ─────────────────────────────────────────────────────────
  // Stock dimensions = supplier sheet size (what is purchased).
  // Editor auto-fits depth & height to match adjacent cabinet on placement.
  {
    id: wid('fin'), name: 'Base End Panel', category: 'room_elements', subtype: 'end_panel',
    dimensions: { width: PANEL_THICKNESS_MM, depth: 600, height: 900 },
    parametric: { ...PANEL_PARAM, minDepth: 200, maxDepth: 700, stepDepth: 5 },
    material: { name: 'Matching Laminate', type: 'laminate', color: C.endPanel },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['finishing', 'end-panel', 'base', '18mm'], unitPrice: 35, currency: 'GBP', notes: '18mm stock panel 600×900 — cut to match cabinet depth & height' },
    autoFit: ['match_adjacent_depth', 'match_adjacent_height'],
    enabled: true, sortOrder: 50,
  },
  {
    id: wid('fin'), name: 'Wall End Panel', category: 'room_elements', subtype: 'end_panel',
    dimensions: { width: PANEL_THICKNESS_MM, depth: 340, height: 740 },
    parametric: { ...PANEL_PARAM, minDepth: 200, maxDepth: 400, stepDepth: 5 },
    material: { name: 'Matching Laminate', type: 'laminate', color: C.endPanel },
    placement: 'wall_mounted', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['finishing', 'end-panel', 'wall', '18mm'], unitPrice: 28, currency: 'GBP', notes: '18mm stock panel 340×740 — cut to match wall cabinet depth & height' },
    autoFit: ['match_adjacent_depth', 'match_adjacent_height'],
    enabled: true, sortOrder: 51,
  },
  {
    id: wid('fin'), name: 'Tall End Panel', category: 'room_elements', subtype: 'end_panel',
    dimensions: { width: PANEL_THICKNESS_MM, depth: 600, height: 2400 },
    parametric: { ...PANEL_PARAM, minDepth: 200, maxDepth: 700, stepDepth: 5 },
    material: { name: 'Matching Laminate', type: 'laminate', color: C.endPanel },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['finishing', 'end-panel', 'tall', '18mm'], unitPrice: 55, currency: 'GBP', notes: '18mm stock panel 600×2400 — cut to match tall cabinet depth & height' },
    autoFit: ['match_adjacent_depth', 'match_adjacent_height'],
    enabled: true, sortOrder: 52,
  },

  // ── Filler Panels ──────────────────────────────────────────────────────
  {
    id: wid('fin'), name: 'Filler Panel 50', category: 'room_elements', subtype: 'filler_panel',
    dimensions: { width: 50, depth: PANEL_THICKNESS_MM, height: 900 },
    parametric: { resizable: true, minWidth: 5, maxWidth: 150, stepWidth: 1, minHeight: 100, maxHeight: 2400, stepHeight: 5 },
    material: { name: 'Matching Laminate', type: 'laminate', color: C.filler },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['finishing', 'filler', '50mm', 'infill'], unitPrice: 12, currency: 'GBP', notes: 'Fills gap between cabinet and wall/appliance' },
    autoFit: ['fill_gap', 'match_adjacent_height'],
    enabled: true, sortOrder: 55,
  },
  {
    id: wid('fin'), name: 'Filler Panel 100', category: 'room_elements', subtype: 'filler_panel',
    dimensions: { width: 100, depth: PANEL_THICKNESS_MM, height: 900 },
    parametric: { resizable: true, minWidth: 5, maxWidth: 200, stepWidth: 1, minHeight: 100, maxHeight: 2400, stepHeight: 5 },
    material: { name: 'Matching Laminate', type: 'laminate', color: C.filler },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['finishing', 'filler', '100mm', 'infill'], unitPrice: 15, currency: 'GBP', notes: 'Fills gap between cabinet and wall/appliance' },
    autoFit: ['fill_gap', 'match_adjacent_height'],
    enabled: true, sortOrder: 56,
  },
  {
    id: wid('fin'), name: 'Filler Panel 150', category: 'room_elements', subtype: 'filler_panel',
    dimensions: { width: 150, depth: PANEL_THICKNESS_MM, height: 900 },
    parametric: { resizable: true, minWidth: 5, maxWidth: 300, stepWidth: 1, minHeight: 100, maxHeight: 2400, stepHeight: 5 },
    material: { name: 'Matching Laminate', type: 'laminate', color: C.filler },
    placement: 'wall_only', connection: SIDE_CONNECT, source: 'systemPreset',
    metadata: { tags: ['finishing', 'filler', '150mm', 'infill'], unitPrice: 18, currency: 'GBP', notes: 'Fills gap between cabinet and wall/appliance' },
    autoFit: ['fill_gap', 'match_adjacent_height'],
    enabled: true, sortOrder: 57,
  },

  // ── Plinth (Kick Board) ────────────────────────────────────────────────
  {
    id: wid('fin'), name: 'Plinth 2400', category: 'room_elements', subtype: 'plinth',
    dimensions: { width: PLINTH_STOCK_LENGTH_MM, depth: PANEL_THICKNESS_MM, height: PLINTH_HEIGHT_MM },
    parametric: TRIM_PARAM,
    material: { name: 'Matching Laminate', type: 'laminate', color: C.plinth },
    placement: 'wall_only', connection: { canAttachSide: true, canStack: false }, source: 'systemPreset',
    metadata: { tags: ['finishing', 'plinth', 'kick-board', '2400mm'], unitPrice: 22, currency: 'GBP', notes: '150mm high × 18mm thick — stock length 2400mm, cut to fit' },
    autoFit: ['run_length'],
    enabled: true, sortOrder: 60,
  },

  // ── Cornice ────────────────────────────────────────────────────────────
  {
    id: wid('fin'), name: 'Cornice 3000', category: 'room_elements', subtype: 'cornice',
    dimensions: { width: 3000, depth: 30, height: 40 },
    parametric: TRIM_PARAM,
    material: { name: 'Matching Laminate', type: 'laminate', color: C.cornice },
    placement: 'wall_mounted', connection: { canAttachSide: true, canStack: false }, source: 'systemPreset',
    metadata: { tags: ['finishing', 'cornice', 'trim', 'top'], unitPrice: 28, currency: 'GBP', notes: 'Decorative moulding fitted above wall cabinets' },
    autoFit: ['run_length'],
    enabled: true, sortOrder: 65,
  },

  // ── Pelmet ─────────────────────────────────────────────────────────────
  {
    id: wid('fin'), name: 'Pelmet 3000', category: 'room_elements', subtype: 'pelmet',
    dimensions: { width: 3000, depth: PANEL_THICKNESS_MM, height: 40 },
    parametric: TRIM_PARAM,
    material: { name: 'Matching Laminate', type: 'laminate', color: C.pelmet },
    placement: 'wall_mounted', connection: { canAttachSide: true, canStack: false }, source: 'systemPreset',
    metadata: { tags: ['finishing', 'pelmet', 'trim', 'under-cabinet', 'light-pelmet'], unitPrice: 24, currency: 'GBP', notes: 'Fitted under wall cabinets — conceals lighting strip' },
    autoFit: ['run_length'],
    enabled: true, sortOrder: 66,
  },
];

// ─── Hardware & Fittings ─────────────────────────────────────────────────────

const HARDWARE_ASSETS: WarehouseAsset[] = [
  {
    id: wid('hdw'), name: 'Bar Handle 160mm', category: 'hardware', subtype: 'handle',
    dimensions: { width: 160, depth: 35, height: 12 },
    parametric: FIXED,
    material: { name: 'Brushed Nickel', type: 'metal', color: C.handle },
    placement: 'free', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['hardware', 'handle', 'bar', '160mm', 'brushed-nickel'], unitPrice: 4, currency: 'GBP', notes: 'Per unit — typically 1 per door, 1 per drawer' },
    enabled: true, sortOrder: 1,
  },
  {
    id: wid('hdw'), name: 'Bar Handle 320mm', category: 'hardware', subtype: 'handle',
    dimensions: { width: 320, depth: 35, height: 12 },
    parametric: FIXED,
    material: { name: 'Brushed Nickel', type: 'metal', color: C.handle },
    placement: 'free', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['hardware', 'handle', 'bar', '320mm', 'brushed-nickel'], unitPrice: 6, currency: 'GBP', notes: 'Per unit — larger drawers and tall doors' },
    enabled: true, sortOrder: 2,
  },
  {
    id: wid('hdw'), name: 'Knob Handle', category: 'hardware', subtype: 'handle',
    dimensions: { width: 32, depth: 32, height: 25 },
    parametric: FIXED,
    material: { name: 'Brushed Chrome', type: 'metal', color: C.handle },
    placement: 'free', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['hardware', 'handle', 'knob', 'chrome'], unitPrice: 3, currency: 'GBP', notes: 'Per unit — classic round knob' },
    enabled: true, sortOrder: 3,
  },
  {
    id: wid('hdw'), name: 'Soft-Close Hinge', category: 'hardware', subtype: 'hinge',
    dimensions: { width: 48, depth: 12, height: 70 },
    parametric: FIXED,
    material: { name: 'Nickel Plated Steel', type: 'metal', color: C.hinge },
    placement: 'free', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['hardware', 'hinge', 'soft-close', 'clip-on'], unitPrice: 3, currency: 'GBP', notes: 'Per unit — 2 per small door, 3 per tall door' },
    enabled: true, sortOrder: 10,
  },
  {
    id: wid('hdw'), name: '170° Hinge', category: 'hardware', subtype: 'hinge',
    dimensions: { width: 48, depth: 14, height: 72 },
    parametric: FIXED,
    material: { name: 'Nickel Plated Steel', type: 'metal', color: C.hinge },
    placement: 'free', connection: NO_CONNECT, source: 'systemPreset',
    metadata: { tags: ['hardware', 'hinge', '170-degree', 'wide-angle'], unitPrice: 5, currency: 'GBP', notes: 'Per unit — corner and bi-fold applications' },
    enabled: true, sortOrder: 11,
  },
];

// ─── Full Registry ───────────────────────────────────────────────────────────

/**
 * Complete warehouse: all system preset assets.
 * Immutable source — consumers should clone if they need to mutate.
 */
export const WAREHOUSE_ASSETS: readonly WarehouseAsset[] = Object.freeze([
  ...KITCHEN_ASSETS,
  ...WARDROBE_ASSETS,
  ...OPENINGS_ASSETS,
  ...ROOM_ELEMENT_ASSETS,
  ...APPLIANCE_ASSETS,
  ...FINISHING_ASSETS,
  ...HARDWARE_ASSETS,
]);

/** Quick lookup by ID */
const _byId = new Map<string, WarehouseAsset>();
WAREHOUSE_ASSETS.forEach((a) => _byId.set(a.id, a));

/** Get a single asset by its warehouse ID */
export function getAssetById(id: string): WarehouseAsset | undefined {
  return _byId.get(id);
}

/** Get count of assets per category */
export function getAssetCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of WAREHOUSE_ASSETS) {
    if (!a.enabled) continue;
    counts[a.category] = (counts[a.category] || 0) + 1;
    counts[`${a.category}:${a.subtype}`] = (counts[`${a.category}:${a.subtype}`] || 0) + 1;
  }
  return counts;
}
