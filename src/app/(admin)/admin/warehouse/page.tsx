// src/app/(admin)/admin/warehouse/page.tsx
//
// Admin Warehouse Object Manager — lists all warehouse assets with create/edit actions.
// Admin-only (gated by /(admin) layout).

import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllWarehouseAssetsAdmin } from '@/lib/workspace-data';

export const metadata: Metadata = {
  title: 'Warehouse Objects',
};

/** Resolve a thumbnail_ref to a renderable URL via the storage proxy. */
function thumbnailUrl(ref: string): string {
  if (!ref) return '';
  if (ref.startsWith('http://') || ref.startsWith('https://')) return ref;
  return `/api/storage/${ref}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  kitchen: 'Kitchen',
  wardrobe: 'Wardrobe',
  openings: 'Openings',
  room_elements: 'Room Elements',
  appliances: 'Appliances',
  hardware: 'Hardware',
};

const CATEGORY_ICONS: Record<string, string> = {
  kitchen: '🍳',
  wardrobe: '🚪',
  openings: '🪟',
  room_elements: '🧱',
  appliances: '🔌',
  hardware: '🔩',
};

const SOURCE_BADGES: Record<string, { label: string; className: string }> = {
  systemPreset: { label: 'System', className: 'bg-blue-100 text-blue-700' },
  imported: { label: 'Imported', className: 'bg-emerald-100 text-emerald-700' },
  scannedCustom: { label: 'Scanned', className: 'bg-purple-100 text-purple-700' },
};

export default async function AdminWarehousePage() {
  const assets = await getAllWarehouseAssetsAdmin();

  // Group by category
  const grouped = assets.reduce<Record<string, typeof assets>>((acc, asset) => {
    const cat = asset.category || 'uncategorised';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(asset);
    return acc;
  }, {});

  const totalCount = assets.length;
  const categoryCount = Object.keys(grouped).length;
  const customCount = assets.filter((a) => a.source !== 'systemPreset').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Warehouse Objects</h2>
          <p className="text-gray-600 mt-1">
            Manage reusable planner objects shared across web, iOS, and Android.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/warehouse/import"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
          >
            <span className="text-lg">📦</span>
            Import Model
          </Link>
          <Link
            href="/admin/warehouse/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <span className="text-lg">+</span>
            New Object
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 font-medium">Total Objects</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 font-medium">Categories</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{categoryCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 font-medium">Custom Objects</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{customCount}</p>
        </div>
      </div>

      {/* Empty state */}
      {totalCount === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-4">📦</p>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No warehouse objects yet</h3>
          <p className="text-gray-500 mb-6">
            Create your first warehouse object to start building your reusable library.
          </p>
          <Link
            href="/admin/warehouse/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span className="text-lg">+</span>
            Create First Object
          </Link>
        </div>
      )}

      {/* Category groups */}
      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, items]) => (
          <div key={category} className="bg-white rounded-lg border border-gray-200">
            {/* Category header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <span className="text-xl">{CATEGORY_ICONS[category] || '📦'}</span>
              <h3 className="text-lg font-semibold text-gray-900">
                {CATEGORY_LABELS[category] || category}
              </h3>
              <span className="ml-auto text-sm text-gray-500">
                {items.length} {items.length === 1 ? 'object' : 'objects'}
              </span>
            </div>

            {/* Asset list */}
            <div className="divide-y divide-gray-50">
              {items.map((asset) => {
                const sourceBadge = SOURCE_BADGES[asset.source || 'imported'] || SOURCE_BADGES.imported;
                return (
                  <Link
                    key={asset.id}
                    href={`/admin/warehouse/${asset.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {asset.thumbnail_ref ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbnailUrl(asset.thumbnail_ref)}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-400 text-lg">
                          {CATEGORY_ICONS[asset.category] || '📦'}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {asset.name}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {asset.subtype?.replace(/_/g, ' ')} &middot;{' '}
                        {asset.width}×{asset.depth}×{asset.height}mm
                        {asset.material_name ? ` · ${asset.material_name}` : ''}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${sourceBadge.className}`}>
                        {sourceBadge.label}
                      </span>
                      {asset.placement_mode && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {asset.placement_mode}
                        </span>
                      )}
                    </div>

                    {/* Arrow */}
                    <span className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0">
                      →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
}
