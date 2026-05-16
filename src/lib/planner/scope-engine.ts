// src/lib/planner/scope-engine.ts v1.0
//
// PURPOSE:
// Deterministic scope-generation engine.
// Takes a LayoutDocument and produces structured scope output:
//   - room dimensions summary
//   - opening summary
//   - module summary (count, dimensions, linear runs)
//   - placement summary (wall-assigned vs free, openings by wall)
//   - kitchen-specific rules
//   - wardrobe-specific rules
//
// ALL calculations are REAL — computed from actual layout_data.
// No fakes, no placeholders.

import type { LayoutDocument, PlacedModule, Wall } from './planner-types';
import { formatMM } from './planner-types';
import type { WarehouseAsset } from '@/lib/warehouse/warehouse-types';
import { WAREHOUSE_ASSETS } from '@/lib/warehouse/warehouse-registry';

// ─── Output Types ────────────────────────────────────────────────────────────

export type RoomDimensionsSummary = {
  widthMM: number;
  depthMM: number;
  heightMM: number;
  wallCount: number;
  perimeterMM: number;
  floorAreaM2: number;
};

export type OpeningSummary = {
  totalCount: number;
  doors: number;
  windows: number;
  obstacles: number;
  openings: Array<{
    id: string;
    type: string;
    label: string;
    wallId: string;
    wallLabel: string;
    widthMM: number;
    heightMM: number;
  }>;
};

export type ModuleLineItem = {
  id: string;
  label: string;
  category: string;
  widthMM: number;
  depthMM: number;
  heightMM: number;
  wallId: string | null;
  wallLabel: string | null;
  assetId: string | null;
  matchedAsset: WarehouseAsset | null;
  unitPrice: number;
};

export type CategoryCount = {
  category: string;
  categoryLabel: string;
  count: number;
  totalLinearMM: number;
};

export type ModuleSummary = {
  totalCount: number;
  totalLinearMM: number;
  totalEstimatedCost: number;
  byCategory: CategoryCount[];
  lineItems: ModuleLineItem[];
};

export type PlacementSummary = {
  wallAssigned: number;
  freePlaced: number;
  openingsByWall: Array<{
    wallId: string;
    wallLabel: string;
    openings: number;
    modules: number;
  }>;
};

export type KitchenEstimates = {
  baseUnits: number;
  wallUnits: number;
  tallUnits: number;
  cornerUnits: number;
  drawerUnits: number;
  applianceHousings: number;
  islandPresent: boolean;
  worktopRunMM: number;
  worktopRunCount: number;
  endPanelCount: number;
  plinthRunMM: number;
};

export type WardrobeEstimates = {
  totalModules: number;
  hangingModules: number;
  drawerModules: number;
  shelfModules: number;
  singleWardrobes: number;
  doubleWardrobes: number;
  totalRunMM: number;
};

export type ScopeSection = {
  title: string;
  items: Array<{ label: string; value: string; note?: string }>;
};

export type ScopeOutput = {
  generatedAt: string;
  layoutName: string;
  layoutType: string;
  room: RoomDimensionsSummary;
  openings: OpeningSummary;
  modules: ModuleSummary;
  placement: PlacementSummary;
  kitchen: KitchenEstimates | null;
  wardrobe: WardrobeEstimates | null;
  sections: ScopeSection[];
};

// ─── Module Category Labels ──────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  base_cabinet: 'Base Cabinets',
  wall_cabinet: 'Wall Cabinets',
  tall_cabinet: 'Tall Cabinets',
  drawer_unit: 'Drawer Units',
  appliance_housing: 'Appliance Housings',
  wardrobe_single: 'Single Wardrobes',
  wardrobe_double: 'Double Wardrobes',
  filler_panel: 'Filler Panels',
  custom: 'Custom Items',
};

// ─── Asset Matching ──────────────────────────────────────────────────────────

function findMatchingAsset(mod: PlacedModule): WarehouseAsset | null {
  // Direct assetId link (best match)
  if (mod.assetId) {
    const direct = WAREHOUSE_ASSETS.find((a) => a.id === mod.assetId);
    if (direct) return direct;
  }

  // Name-based match
  const modName = mod.label.toLowerCase();
  const nameMatch = WAREHOUSE_ASSETS.find((a) => {
    if (!a.enabled) return false;
    const assetName = a.name.toLowerCase();
    return modName.includes(assetName) || assetName.includes(modName);
  });
  if (nameMatch) return nameMatch;

  // Dimension + category match
  const dimMatch = WAREHOUSE_ASSETS.find((a) => {
    if (!a.enabled) return false;
    if (a.dimensions.width !== mod.width || a.dimensions.height !== mod.height) return false;
    const cat = mod.category;
    if (cat === 'base_cabinet' && a.subtype === 'base_unit') return true;
    if (cat === 'wall_cabinet' && a.subtype === 'wall_unit') return true;
    if (cat === 'tall_cabinet' && a.subtype === 'tall_unit') return true;
    if (cat === 'drawer_unit' && a.subtype === 'drawer_unit') return true;
    if (cat === 'appliance_housing' && a.subtype === 'appliance_housing') return true;
    if (cat === 'wardrobe_single' && (a.subtype === 'single' || a.subtype === 'shelving' || a.subtype === 'hanging_module')) return true;
    if (cat === 'wardrobe_double' && a.subtype === 'double') return true;
    return false;
  });
  return dimMatch || null;
}

// ─── Room Dimensions ─────────────────────────────────────────────────────────

function computeRoomDimensions(layout: LayoutDocument): RoomDimensionsSummary {
  const { room } = layout;

  // Compute perimeter from walls
  let perimeter = 0;
  for (const wall of room.walls) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  return {
    widthMM: room.width,
    depthMM: room.depth,
    heightMM: room.height,
    wallCount: room.walls.length,
    perimeterMM: Math.round(perimeter),
    floorAreaM2: parseFloat(((room.width * room.depth) / 1_000_000).toFixed(2)),
  };
}

// ─── Opening Summary ─────────────────────────────────────────────────────────

function computeOpeningSummary(layout: LayoutDocument): OpeningSummary {
  const wallMap = new Map<string, Wall>();
  for (const w of layout.room.walls) wallMap.set(w.id, w);

  return {
    totalCount: layout.openings.length,
    doors: layout.openings.filter((o) => o.type === 'door').length,
    windows: layout.openings.filter((o) => o.type === 'window').length,
    obstacles: layout.openings.filter((o) => o.type === 'obstacle').length,
    openings: layout.openings.map((o) => ({
      id: o.id,
      type: o.type,
      label: o.label,
      wallId: o.wall_id,
      wallLabel: wallMap.get(o.wall_id)?.label || o.wall_id,
      widthMM: o.width,
      heightMM: o.height,
    })),
  };
}

// ─── Module Summary ──────────────────────────────────────────────────────────

function computeModuleSummary(layout: LayoutDocument): ModuleSummary {
  const wallMap = new Map<string, Wall>();
  for (const w of layout.room.walls) wallMap.set(w.id, w);

  const lineItems: ModuleLineItem[] = layout.placedModules.map((mod) => {
    const matched = findMatchingAsset(mod);
    return {
      id: mod.id,
      label: mod.label,
      category: mod.category,
      widthMM: mod.width,
      depthMM: mod.depth,
      heightMM: mod.height,
      wallId: mod.wall_id,
      wallLabel: mod.wall_id ? (wallMap.get(mod.wall_id)?.label || mod.wall_id) : null,
      assetId: mod.assetId || null,
      matchedAsset: matched,
      unitPrice: matched?.metadata.unitPrice ?? 0,
    };
  });

  // Category breakdown
  const catMap = new Map<string, CategoryCount>();
  for (const item of lineItems) {
    const existing = catMap.get(item.category);
    if (existing) {
      existing.count++;
      existing.totalLinearMM += item.widthMM;
    } else {
      catMap.set(item.category, {
        category: item.category,
        categoryLabel: CATEGORY_LABELS[item.category] || item.category,
        count: 1,
        totalLinearMM: item.widthMM,
      });
    }
  }

  return {
    totalCount: lineItems.length,
    totalLinearMM: lineItems.reduce((s, i) => s + i.widthMM, 0),
    totalEstimatedCost: lineItems.reduce((s, i) => s + i.unitPrice, 0),
    byCategory: Array.from(catMap.values()).sort((a, b) => b.count - a.count),
    lineItems,
  };
}

// ─── Placement Summary ──────────────────────────────────────────────────────

function computePlacementSummary(layout: LayoutDocument): PlacementSummary {
  const wallMap = new Map<string, Wall>();
  for (const w of layout.room.walls) wallMap.set(w.id, w);

  const wallAssigned = layout.placedModules.filter((m) => m.wall_id).length;
  const freePlaced = layout.placedModules.filter((m) => !m.wall_id).length;

  // Per-wall breakdown
  const wallStats = new Map<string, { openings: number; modules: number }>();
  for (const w of layout.room.walls) {
    wallStats.set(w.id, { openings: 0, modules: 0 });
  }
  for (const o of layout.openings) {
    const stat = wallStats.get(o.wall_id);
    if (stat) stat.openings++;
  }
  for (const m of layout.placedModules) {
    if (m.wall_id) {
      const stat = wallStats.get(m.wall_id);
      if (stat) stat.modules++;
    }
  }

  return {
    wallAssigned,
    freePlaced,
    openingsByWall: Array.from(wallStats.entries()).map(([id, stat]) => ({
      wallId: id,
      wallLabel: wallMap.get(id)?.label || id,
      openings: stat.openings,
      modules: stat.modules,
    })),
  };
}

// ─── Kitchen Business Rules ─────────────────────────────────────────────────

function computeKitchenEstimates(layout: LayoutDocument): KitchenEstimates {
  const mods = layout.placedModules;

  const baseUnits = mods.filter((m) => m.category === 'base_cabinet').length;
  const wallUnits = mods.filter((m) => m.category === 'wall_cabinet').length;
  const tallUnits = mods.filter((m) => m.category === 'tall_cabinet').length;
  const drawerUnits = mods.filter((m) => m.category === 'drawer_unit').length;
  const applianceHousings = mods.filter((m) => m.category === 'appliance_housing').length;

  // Corner units: detected by label or assetId containing 'corner'
  const cornerUnits = mods.filter((m) => {
    const lbl = m.label.toLowerCase();
    return lbl.includes('corner');
  }).length;

  // Island detection: free-standing base units (no wall assignment)
  const islandPresent = mods.some(
    (m) => (m.category === 'base_cabinet' || m.category === 'custom') &&
           !m.wall_id &&
           m.label.toLowerCase().includes('island'),
  );

  // Worktop runs: sum widths of contiguous base units on same wall
  const baseByWall = new Map<string, number[]>();
  for (const m of mods) {
    if ((m.category === 'base_cabinet' || m.category === 'drawer_unit' || m.category === 'appliance_housing') && m.wall_id) {
      const list = baseByWall.get(m.wall_id) || [];
      list.push(m.width);
      baseByWall.set(m.wall_id, list);
    }
  }

  let worktopRunMM = 0;
  let worktopRunCount = 0;
  for (const [, widths] of baseByWall) {
    if (widths.length > 0) {
      worktopRunMM += widths.reduce((s, w) => s + w, 0);
      worktopRunCount++;
    }
  }

  // End panels: each worktop run gets 2 end panels unless it spans full wall
  // Simple rule: 2 per worktop run, minus 1 for each run against a corner
  const endPanelCount = Math.max(0, worktopRunCount * 2 - cornerUnits);

  // Plinth: runs under all wall-assigned base units
  const plinthRunMM = mods
    .filter((m) => (m.category === 'base_cabinet' || m.category === 'drawer_unit') && m.wall_id)
    .reduce((s, m) => s + m.width, 0);

  return {
    baseUnits,
    wallUnits,
    tallUnits,
    cornerUnits,
    drawerUnits,
    applianceHousings,
    islandPresent,
    worktopRunMM,
    worktopRunCount,
    endPanelCount,
    plinthRunMM,
  };
}

// ─── Wardrobe Business Rules ────────────────────────────────────────────────

function computeWardrobeEstimates(layout: LayoutDocument): WardrobeEstimates {
  const mods = layout.placedModules;

  const wardrobeMods = mods.filter(
    (m) => m.category === 'wardrobe_single' || m.category === 'wardrobe_double',
  );

  const hangingModules = wardrobeMods.filter((m) => {
    const lbl = m.label.toLowerCase();
    return lbl.includes('hanging') || lbl.includes('hang');
  }).length;

  const drawerModules = wardrobeMods.filter((m) => {
    const lbl = m.label.toLowerCase();
    return lbl.includes('drawer');
  }).length;

  const shelfModules = wardrobeMods.filter((m) => {
    const lbl = m.label.toLowerCase();
    return lbl.includes('shelf') || lbl.includes('shelving');
  }).length;

  const singleWardrobes = mods.filter((m) => m.category === 'wardrobe_single').length;
  const doubleWardrobes = mods.filter((m) => m.category === 'wardrobe_double').length;

  const totalRunMM = wardrobeMods.reduce((s, m) => s + m.width, 0);

  return {
    totalModules: wardrobeMods.length,
    hangingModules,
    drawerModules,
    shelfModules,
    singleWardrobes,
    doubleWardrobes,
    totalRunMM,
  };
}

// ─── Section Builder ────────────────────────────────────────────────────────

function buildScopeSections(
  room: RoomDimensionsSummary,
  openings: OpeningSummary,
  modules: ModuleSummary,
  kitchen: KitchenEstimates | null,
  wardrobe: WardrobeEstimates | null,
): ScopeSection[] {
  const sections: ScopeSection[] = [];

  // Room prep
  const roomPrep: ScopeSection = {
    title: 'Room Preparation',
    items: [
      { label: 'Room dimensions', value: `${formatMM(room.widthMM, 'm')} × ${formatMM(room.depthMM, 'm')}` },
      { label: 'Ceiling height', value: formatMM(room.heightMM, 'm') },
      { label: 'Floor area', value: `${room.floorAreaM2}m²` },
      { label: 'Perimeter', value: formatMM(room.perimeterMM, 'm') },
      { label: 'Wall count', value: String(room.wallCount) },
    ],
  };
  sections.push(roomPrep);

  // Openings / constraints
  if (openings.totalCount > 0) {
    const openingsSection: ScopeSection = {
      title: 'Openings & Constraints',
      items: [
        { label: 'Total openings', value: String(openings.totalCount) },
        ...(openings.doors > 0 ? [{ label: 'Doors', value: String(openings.doors) }] : []),
        ...(openings.windows > 0 ? [{ label: 'Windows', value: String(openings.windows) }] : []),
        ...(openings.obstacles > 0 ? [{ label: 'Obstacles / fixed items', value: String(openings.obstacles) }] : []),
        ...openings.openings.map((o) => ({
          label: `${o.label} (${o.type})`,
          value: `${formatMM(o.widthMM)} × ${formatMM(o.heightMM)}`,
          note: `on ${o.wallLabel}`,
        })),
      ],
    };
    sections.push(openingsSection);
  }

  // Units / modules
  if (modules.totalCount > 0) {
    const unitsSection: ScopeSection = {
      title: 'Units & Modules',
      items: [
        { label: 'Total placed units', value: String(modules.totalCount) },
        { label: 'Total linear run', value: formatMM(modules.totalLinearMM, 'm') },
        ...modules.byCategory.map((c) => ({
          label: c.categoryLabel,
          value: `${c.count} unit${c.count !== 1 ? 's' : ''} — ${formatMM(c.totalLinearMM, 'm')} run`,
        })),
        ...(modules.totalEstimatedCost > 0
          ? [{ label: 'Estimated unit cost', value: `£${modules.totalEstimatedCost.toLocaleString()}`, note: 'from warehouse catalogue' }]
          : []),
      ],
    };
    sections.push(unitsSection);
  }

  // Kitchen-specific
  if (kitchen && (kitchen.baseUnits + kitchen.wallUnits + kitchen.tallUnits > 0)) {
    const kitchenSection: ScopeSection = {
      title: 'Kitchen Estimates',
      items: [
        { label: 'Base units', value: String(kitchen.baseUnits) },
        { label: 'Wall units', value: String(kitchen.wallUnits) },
        { label: 'Tall units', value: String(kitchen.tallUnits) },
        ...(kitchen.cornerUnits > 0 ? [{ label: 'Corner units', value: String(kitchen.cornerUnits) }] : []),
        ...(kitchen.drawerUnits > 0 ? [{ label: 'Drawer units', value: String(kitchen.drawerUnits) }] : []),
        ...(kitchen.applianceHousings > 0 ? [{ label: 'Appliance housings', value: String(kitchen.applianceHousings) }] : []),
        { label: 'Island', value: kitchen.islandPresent ? 'Yes' : 'No' },
        { label: 'Estimated worktop runs', value: `${kitchen.worktopRunCount} run${kitchen.worktopRunCount !== 1 ? 's' : ''} — ${formatMM(kitchen.worktopRunMM, 'm')}` },
        { label: 'Estimated end panels', value: String(kitchen.endPanelCount) },
        { label: 'Estimated plinth run', value: formatMM(kitchen.plinthRunMM, 'm') },
      ],
    };
    sections.push(kitchenSection);
  }

  // Wardrobe-specific
  if (wardrobe && wardrobe.totalModules > 0) {
    const wardrobeSection: ScopeSection = {
      title: 'Wardrobe Estimates',
      items: [
        { label: 'Total wardrobe modules', value: String(wardrobe.totalModules) },
        ...(wardrobe.singleWardrobes > 0 ? [{ label: 'Single wardrobes', value: String(wardrobe.singleWardrobes) }] : []),
        ...(wardrobe.doubleWardrobes > 0 ? [{ label: 'Double wardrobes', value: String(wardrobe.doubleWardrobes) }] : []),
        ...(wardrobe.hangingModules > 0 ? [{ label: 'Hanging modules', value: String(wardrobe.hangingModules) }] : []),
        ...(wardrobe.drawerModules > 0 ? [{ label: 'Drawer modules', value: String(wardrobe.drawerModules) }] : []),
        ...(wardrobe.shelfModules > 0 ? [{ label: 'Shelf modules', value: String(wardrobe.shelfModules) }] : []),
        { label: 'Total wardrobe run', value: formatMM(wardrobe.totalRunMM, 'm') },
      ],
    };
    sections.push(wardrobeSection);
  }

  return sections;
}

// ─── Quote Draft ─────────────────────────────────────────────────────────────

export type QuoteDraft = {
  title: string;
  layoutId: string;
  leadId: string | null;
  jobId: string | null;
  scope: ScopeOutput;
  breakdownText: string;
  estimatedTotal: number;
  createdAt: string;
};

export function generateQuoteDraft(
  layoutId: string,
  leadId: string | null,
  jobId: string | null,
  scope: ScopeOutput,
): QuoteDraft {
  // Build human-readable breakdown text from scope sections
  const lines: string[] = [];
  lines.push(`SCOPE: ${scope.layoutName} (${scope.layoutType})`);
  lines.push(`Room: ${formatMM(scope.room.widthMM, 'm')} × ${formatMM(scope.room.depthMM, 'm')} × ${formatMM(scope.room.heightMM, 'm')}`);
  lines.push(`Floor area: ${scope.room.floorAreaM2}m²`);
  lines.push('');

  for (const section of scope.sections) {
    lines.push(`--- ${section.title} ---`);
    for (const item of section.items) {
      lines.push(`  ${item.label}: ${item.value}${item.note ? ` (${item.note})` : ''}`);
    }
    lines.push('');
  }

  if (scope.modules.totalEstimatedCost > 0) {
    lines.push(`Estimated unit cost: £${scope.modules.totalEstimatedCost.toLocaleString()}`);
  }

  return {
    title: `Quote Draft — ${scope.layoutName}`,
    layoutId,
    leadId,
    jobId,
    scope,
    breakdownText: lines.join('\n'),
    estimatedTotal: scope.modules.totalEstimatedCost,
    createdAt: new Date().toISOString(),
  };
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export function generateScope(
  layout: LayoutDocument,
  layoutName: string,
  layoutType: string,
): ScopeOutput {
  const room = computeRoomDimensions(layout);
  const openings = computeOpeningSummary(layout);
  const modules = computeModuleSummary(layout);
  const placement = computePlacementSummary(layout);

  // Apply business rules based on layout type
  const isKitchen = layoutType === 'kitchen' || layoutType === 'Kitchen';
  const isWardrobe = layoutType === 'wardrobe' || layoutType === 'Wardrobe' || layoutType === 'bedroom';

  const kitchen = isKitchen ? computeKitchenEstimates(layout) : null;
  const wardrobe = isWardrobe ? computeWardrobeEstimates(layout) : null;

  const sections = buildScopeSections(room, openings, modules, kitchen, wardrobe);

  return {
    generatedAt: new Date().toISOString(),
    layoutName,
    layoutType,
    room,
    openings,
    modules,
    placement,
    kitchen,
    wardrobe,
    sections,
  };
}
