// src/lib/warehouse/warehouse-overrides.ts
//
// LOCAL-FIRST warehouse override system.
//
// Users can customise warehouse items (prices, dimensions, labels, materials).
// Overrides are stored in localStorage, keyed by WarehouseAsset.id.
//
// The planner/inspector/pricing always work with "effective" items:
//   effectiveAsset = systemDefault + userOverride
//
// DESIGN:
//   - System defaults remain read-only in warehouse-registry.ts
//   - User overrides are JSON in localStorage under STORAGE_KEY
//   - On placement, effective values are COPIED into PlacedModule (snapshot)
//   - Old placed items do NOT change when warehouse defaults change later
//   - Future-safe: can sync overrides to server later without architecture change

import type { WarehouseAsset } from './warehouse-types';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Fields a user can override per warehouse item */
export type WarehouseItemOverride = {
  /** User-custom label */
  label?: string;
  /** Override dimensions (mm) */
  width?: number;
  depth?: number;
  height?: number;
  /** Override unit price in pence */
  unitPrice?: number;
  /** Override default material name */
  materialName?: string;
  /** Override default material type */
  materialType?: string;
  /** User can hide items they don't use */
  disabled?: boolean;
};

/** Map of assetId → user overrides */
export type WarehouseOverrideMap = Record<string, WarehouseItemOverride>;

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'tissca_warehouse_overrides';

/** Load all user overrides from localStorage */
export function loadOverrides(): WarehouseOverrideMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as WarehouseOverrideMap;
  } catch {
    return {};
  }
}

/** Save all overrides to localStorage */
export function saveOverrides(overrides: WarehouseOverrideMap): void {
  if (typeof window === 'undefined') return;
  try {
    // Remove empty overrides (no fields set)
    const cleaned: WarehouseOverrideMap = {};
    for (const [id, ov] of Object.entries(overrides)) {
      const nonEmpty = Object.entries(ov).filter(
        ([, v]) => v !== undefined && v !== null && v !== '',
      );
      if (nonEmpty.length > 0) {
        cleaned[id] = Object.fromEntries(nonEmpty) as WarehouseItemOverride;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // localStorage full or disabled — silent fail
  }
}

/** Get override for a single asset */
export function getOverride(assetId: string): WarehouseItemOverride | undefined {
  const all = loadOverrides();
  return all[assetId];
}

/** Set override for a single asset (merges with existing) */
export function setOverride(assetId: string, override: WarehouseItemOverride): void {
  const all = loadOverrides();
  all[assetId] = { ...(all[assetId] || {}), ...override };
  saveOverrides(all);
}

/** Remove all overrides for a single asset (reset to system default) */
export function clearOverride(assetId: string): void {
  const all = loadOverrides();
  delete all[assetId];
  saveOverrides(all);
}

/** Remove ALL user overrides */
export function clearAllOverrides(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}

// ─── Merge Logic ─────────────────────────────────────────────────────────────

/**
 * Apply user overrides to a single warehouse asset, producing the "effective" asset.
 * Returns a new object; does NOT mutate the original.
 */
export function applyOverride(
  asset: WarehouseAsset,
  override: WarehouseItemOverride | undefined,
): WarehouseAsset {
  if (!override) return asset;

  return {
    ...asset,
    name: override.label ?? asset.name,
    dimensions: {
      width: override.width ?? asset.dimensions.width,
      depth: override.depth ?? asset.dimensions.depth,
      height: override.height ?? asset.dimensions.height,
    },
    material: {
      ...asset.material,
      ...(override.materialName ? { name: override.materialName } : {}),
      ...(override.materialType
        ? { type: override.materialType as WarehouseAsset['material']['type'] }
        : {}),
    },
    metadata: {
      ...asset.metadata,
      ...(override.unitPrice !== undefined ? { unitPrice: override.unitPrice } : {}),
    },
    enabled: override.disabled !== undefined ? !override.disabled : asset.enabled,
  };
}

/**
 * Apply all user overrides to a full warehouse asset list.
 * Returns new array of effective assets.
 */
export function applyAllOverrides(assets: WarehouseAsset[]): WarehouseAsset[] {
  const overrides = loadOverrides();
  if (Object.keys(overrides).length === 0) return assets;
  return assets.map((a) => applyOverride(a, overrides[a.id]));
}

/**
 * Check if a warehouse asset has any user overrides.
 */
export function hasOverride(assetId: string): boolean {
  const all = loadOverrides();
  const ov = all[assetId];
  if (!ov) return false;
  return Object.values(ov).some((v) => v !== undefined && v !== null && v !== '');
}

/**
 * Get the number of assets with user overrides.
 */
export function getOverrideCount(): number {
  const all = loadOverrides();
  return Object.keys(all).length;
}
