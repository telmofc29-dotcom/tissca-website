/**
 * Labour Picker Modal
 * Searchable modal for selecting labour rates
 */

'use client';

import React, { useState, useMemo } from 'react';
import { LabourRate } from '@/types/quotes';

interface LabourPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  labourRates: LabourRate[];
  onSelect: (labour: LabourRate) => void;
  isLoading?: boolean;
}

export function LabourPickerModal({
  isOpen,
  onClose,
  labourRates,
  onSelect,
  isLoading = false,
}: LabourPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLabour = useMemo(() => {
    if (!searchQuery) return labourRates;

    const lower = searchQuery.toLowerCase();
    return labourRates.filter((l) => l.trade.toLowerCase().includes(lower));
  }, [labourRates, searchQuery]);

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
          <h2 className="text-lg font-semibold text-gray-900">Select Labour</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <input
              type="text"
              placeholder="Search labour by trade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
          </div>

          {/* Labour List */}
          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-gray-500">Loading labour rates...</div>
            </div>
          ) : filteredLabour.length === 0 ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-gray-500">No labour rates found</div>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {filteredLabour.map((labour) => (
                <div
                  key={labour.id}
                  className="px-6 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{labour.trade}</div>
                      <div className="text-sm text-gray-500">
                        {labour.rate_type} · {formatCurrency(labour.price)} per{' '}
                        {labour.unit}
                      </div>
                    </div>
                    <button
                      onClick={() => onSelect(labour)}
                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors whitespace-nowrap"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
