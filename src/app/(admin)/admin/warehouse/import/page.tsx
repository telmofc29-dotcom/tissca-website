// src/app/(admin)/admin/warehouse/import/page.tsx
//
// Admin: Import an external 3D model as a warehouse asset.
// Uses dynamic import to avoid SSR issues with Three.js.

import type { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ModelImporter = dynamic(
  () => import('@/components/admin/ModelImporter'),
  { ssr: false, loading: () => <div className="text-sm text-gray-400 py-8 text-center">Loading importer...</div> },
);

export const metadata: Metadata = {
  title: 'Import Model — Warehouse',
};

export default function ImportModelPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/warehouse" className="hover:text-blue-600 transition-colors">
          Warehouse
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Import Model</span>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900">Import External Model</h2>
        <p className="text-gray-600 mt-1">
          Upload an existing 3D model file and create a structured warehouse asset.
        </p>
      </div>

      <ModelImporter />
    </div>
  );
}
