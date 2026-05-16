// src/app/(admin)/admin/warehouse/[id]/page.tsx
//
// Admin: Edit an existing warehouse object.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWarehouseAssetById } from '@/lib/workspace-data';
import WarehouseObjectEditor from '@/components/admin/WarehouseObjectEditor';

export const metadata: Metadata = {
  title: 'Edit Warehouse Object',
};

interface Props {
  params: { id: string };
}

export default async function EditWarehouseObjectPage({ params }: Props) {
  const asset = await getWarehouseAssetById(params.id);

  if (!asset) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/warehouse" className="hover:text-blue-600 transition-colors">
          Warehouse
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-[200px]">{asset.name}</span>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900">Edit Warehouse Object</h2>
        <p className="text-gray-600 mt-1">
          Update structured metadata, dimensions, placement rules, and visual assets.
        </p>
      </div>

      <WarehouseObjectEditor asset={asset} />
    </div>
  );
}
