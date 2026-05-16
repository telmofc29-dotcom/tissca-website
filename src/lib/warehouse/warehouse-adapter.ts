// src/lib/warehouse/warehouse-adapter.ts
//
// Hybrid warehouse adapter — merges static preset registry with Supabase records.
//
// Strategy:
// 1. Static presets from warehouse-registry.ts are always available (offline-safe)
// 2. When Supabase data is loaded, user/workspace custom assets are merged in
// 3. Supabase system presets override static ones if they have the same name+category
// 4. Source is tracked so UI can distinguish system vs custom vs scanned
//
// This adapter ensures:
// - Existing static warehouse data is NEVER lost
// - Custom Supabase records are layered on top
// - The WarehouseAsset shape is consistent everywhere

import type { WarehouseAsset, AssetCategory, AssetSubtype, PlacementRule, AssetSource } from './warehouse-types';
import { WAREHOUSE_ASSETS } from './warehouse-registry';
import type { WarehouseAssetRow } from '@/lib/workspace-data';

// ─── Row → WarehouseAsset conversion ─────────────────────────────────────────

/**
 * Derive client-side PlacementRule from real production columns.
 */
function derivePlacement(row: WarehouseAssetRow): PlacementRule {
  if (row.is_wall_mounted) return 'wall_mounted';
  if (row.is_freestanding) return 'floor';
  // placement_mode from production ('wall', 'floor', 'ceiling', 'free')
  const pm = row.placement_mode;
  if (pm === 'wall') return 'wall_only';
  if (pm === 'floor') return 'floor';
  if (pm === 'ceiling') return 'ceiling';
  if (pm === 'free') return 'free';
  if (pm === 'wall_mounted') return 'wall_mounted';
  if (pm === 'wall_only') return 'wall_only';
  return 'wall_only'; // safe default for kitchen cabinets
}

/**
 * Convert a Supabase warehouse_assets row to the canonical WarehouseAsset shape.
 *
 * Production columns that have no direct counterpart in WarehouseAsset are packed
 * into planner_hints jsonb so no data is lost during round-trips.
 */
export function rowToAsset(row: WarehouseAssetRow): WarehouseAsset {
  const hints = (row.planner_hints ?? {}) as Record<string, unknown>;

  return {
    id: row.id,
    name: row.name,
    category: row.category as AssetCategory,
    subtype: row.subtype as AssetSubtype,
    dimensions: {
      width: row.width,
      depth: row.depth,
      height: row.height,
    },
    parametric: {
      resizable: !!(hints.parametric as Record<string, unknown>)?.resizable,
      ...((hints.parametric as Record<string, unknown>) ?? {}),
    },
    material: {
      name: row.material_name || 'Standard',
      type: ((hints.material_type as string) || 'laminate') as WarehouseAsset['material']['type'],
      color: ((hints.material_color as string) || '#8FAABE'),
      textureRef: (hints.texture_ref as string) ?? undefined,
    },
    placement: derivePlacement(row),
    connection: {
      canAttachSide: !!(hints.connection as Record<string, unknown>)?.canAttachSide,
      canStack: !!(hints.connection as Record<string, unknown>)?.canStack,
      connectsTo: (hints.connection as Record<string, unknown>)?.connectsTo as AssetSubtype[] | undefined,
      requiredGap: (hints.connection as Record<string, unknown>)?.requiredGap as number | undefined,
    },
    source: row.source as AssetSource,
    preview: row.thumbnail_ref ?? undefined,
    metadata: {
      brand: (hints.brand as string) ?? undefined,
      model: (hints.model as string) ?? undefined,
      notes: row.notes ?? undefined,
      unitPrice: (hints.unit_price as number) ?? undefined,
      currency: (hints.currency as string) ?? undefined,
      tags: (hints.tags as string[]) ?? undefined,
    },
    cabinetSpec: hints.cabinet_spec ?? undefined,
    shapeEditor: hints.shape_editor ?? undefined,
    enabled: true, // production has no 'enabled' column — always visible
    sortOrder: (hints.sort_order as number) ?? 0,
  };
}

/**
 * Convert a WarehouseAsset to the Supabase row shape (for seeding/sync).
 *
 * Rich client-side fields that don't have direct production columns
 * are packed into planner_hints jsonb.
 */
export function assetToRow(
  asset: WarehouseAsset,
  ownerId: string | null,
): Omit<WarehouseAssetRow, 'id' | 'created_at' | 'updated_at'> {
  const placementMode =
    asset.placement === 'wall_only' ? 'wall'
    : asset.placement === 'wall_mounted' ? 'wall_mounted'
    : asset.placement === 'floor' ? 'floor'
    : asset.placement === 'ceiling' ? 'ceiling'
    : 'free';

  return {
    owner_id: ownerId,
    name: asset.name,
    category: asset.category,
    subtype: asset.subtype,
    width: asset.dimensions.width,
    depth: asset.dimensions.depth,
    height: asset.dimensions.height,
    material_name: asset.material.name,
    is_freestanding: asset.placement === 'floor',
    is_wall_mounted: asset.placement === 'wall_mounted',
    placement_mode: placementMode,
    front_clearance: 0,
    compatible_room_types: null,
    requires_services: null,
    planner_hints: {
      parametric: asset.parametric,
      material_type: asset.material.type,
      material_color: asset.material.color,
      texture_ref: asset.material.textureRef ?? null,
      connection: asset.connection,
      brand: asset.metadata.brand ?? null,
      model: asset.metadata.model ?? null,
      unit_price: asset.metadata.unitPrice ?? null,
      currency: asset.metadata.currency ?? null,
      tags: asset.metadata.tags ?? [],
      sort_order: asset.sortOrder,
      ...(asset.cabinetSpec ? { cabinet_spec: asset.cabinetSpec } : {}),
      ...(asset.shapeEditor ? { shape_editor: asset.shapeEditor } : {}),
    },
    source: asset.source,
    source_platform: 'web',
    thumbnail_ref: asset.preview ?? null,
    notes: asset.metadata.notes ?? null,
    sync_version: 1,
    last_modified_platform: 'web',
  };
}

// ─── Merge logic ─────────────────────────────────────────────────────────────

/**
 * Merge static presets with Supabase rows.
 *
 * Rules:
 * - Static presets are included by default
 * - Supabase rows with source='systemPreset' and matching name+category
 *   override the static version (allows admin edits of presets)
 * - Supabase rows with source='imported' or 'scannedCustom' are added
 * - Duplicates are resolved by preferring Supabase (it's the authoritative store)
 */
export function mergeWarehouseAssets(
  supabaseRows: WarehouseAssetRow[],
): WarehouseAsset[] {
  const result: WarehouseAsset[] = [];

  // Build a lookup of Supabase system presets by name+category
  const supabasePresetKeys = new Set<string>();
  const supabaseAssets: WarehouseAsset[] = [];

  for (const row of supabaseRows) {
    const asset = rowToAsset(row);
    supabaseAssets.push(asset);
    if (row.source === 'systemPreset') {
      supabasePresetKeys.add(`${row.category}::${row.name}`);
    }
  }

  // Add static presets that aren't overridden by Supabase
  for (const preset of WAREHOUSE_ASSETS) {
    const key = `${preset.category}::${preset.name}`;
    if (!supabasePresetKeys.has(key)) {
      result.push(preset);
    }
  }

  // Add all Supabase assets
  result.push(...supabaseAssets);

  // Sort: by category, then sortOrder, then name
  result.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });

  return result;
}

/**
 * Get the full warehouse catalogue.
 * When no Supabase data is available, falls back to static presets only.
 */
export function getStaticWarehouse(): WarehouseAsset[] {
  return [...WAREHOUSE_ASSETS];
}
