/**
 * Material Picker Modal
 * Searchable modal for selecting materials with variants
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Material, MaterialVariant } from '@/types/quotes';

interface MaterialPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  variants: MaterialVariant[];
  onSelect: (material: Material, variant?: MaterialVariant) => void;
  isLoading?: boolean;
}

export function MaterialPickerModal({
  isOpen,
  onClose,
  materials,
  variants,
  onSelect,
  isLoading = false,
}: MaterialPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(materials.map((m) => m.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    let filtered = materials;

    if (selectedCategory) {
      filtered = filtered.filter((m) => m.category === selectedCategory);
    }

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(lower));
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [materials, selectedCategory, searchQuery]);

  const getMaterialVariants = (materialId: string) => {
    return variants.filter((v) => v.material_id === materialId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Select Material</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search and Filters */}
          <div className="px-6 py-4 border-b border-gray-200 space-y-3 bg-gray-50">
            <input
              type="text"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCategory === null
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedCategory === cat
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Materials List */}
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-gray-500">Loading materials...</div>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-gray-500">No materials found</div>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {filteredMaterials.map((material) => {
                const matVariants = getMaterialVariants(material.id);
                const isExpanded = expandedMaterialId === material.id;
                const hasVariants = matVariants.length > 0;

                return (
                  <div key={material.id} className="border-b border-gray-100 last:border-b-0">
                    {/* Material Row */}
                    <div className="px-6 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{material.name}</div>
                          <div className="text-sm text-gray-500">
                            {material.unit} · {formatCurrency(material.default_price)}
                          </div>
                        </div>

                        {hasVariants ? (
                          <button
                            onClick={() =>
                              setExpandedMaterialId(
                                isExpanded ? null : material.id
                              )
                            }
                            className="text-gray-400 hover:text-gray-600 ml-4"
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        ) : (
                          <button
                            onClick={() => onSelect(material)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                          >
                            Select
                          </button>
                        )}
                      </div>

                      {/* No Variants Button */}
                      {!hasVariants && (
                        <div className="mt-2">
                          <button
                            onClick={() => onSelect(material)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            Select {material.name}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Variants List */}
                    {isExpanded && hasVariants && (
                      <div className="bg-gray-50 border-t border-gray-100">
                        {matVariants.map((variant) => (
                          <div
                            key={variant.id}
                            className="px-6 py-3 border-t border-gray-100 hover:bg-gray-100 transition-colors flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {variant.label}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatCurrency(variant.price_override || 0)}
                              </div>
                            </div>
                            <button
                              onClick={() => onSelect(material, variant)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                            >
                              Select
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
