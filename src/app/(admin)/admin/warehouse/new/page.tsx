// src/app/(admin)/admin/warehouse/new/page.tsx
//
// Admin: Create a new warehouse object.

import type { Metadata } from 'next';
import Link from 'next/link';
import WarehouseObjectEditor from '@/components/admin/WarehouseObjectEditor';

export const metadata: Metadata = {
  title: 'New Warehouse Object',
};

export default function NewWarehouseObjectPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/warehouse" className="hover:text-blue-600 transition-colors">
          Warehouse
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">New Object</span>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900">Create Warehouse Object</h2>
        <p className="text-gray-600 mt-1">
          Define a new reusable object for the planner warehouse.
        </p>
      </div>

      <WarehouseObjectEditor asset={null} />
    </div>
  );
}
