/**
 * Quote Items Table
 * Middle section showing line items with edit/delete functionality
 */

'use client';

import React, { useState } from 'react';
import { QuoteItem } from '@/types/quotes';

export interface QuoteLineItem extends Partial<QuoteItem> {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total?: number;
  item_type: 'material' | 'labour' | 'custom';
  is_locked?: boolean;
}

interface QuoteItemsTableProps {
  items: QuoteLineItem[];
  onAddMaterial: () => void;
  onAddLabour: () => void;
  onAddCustom: () => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem?: (itemId: string, updates: Partial<QuoteLineItem>) => void;
  isLoading?: boolean;
}

export function QuoteItemsTable({
  items,
  onAddMaterial,
  onAddLabour,
  onAddCustom,
  onDeleteItem,
  onUpdateItem,
  isLoading = false,
}: QuoteItemsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<QuoteLineItem>>({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleEditStart = (item: QuoteLineItem) => {
    setEditingId(item.id || '');
    setEditValues({
      quantity: item.quantity,
      unit_price: item.unit_price,
    });
  };

  const handleEditSave = async (itemId: string) => {
    if (onUpdateItem) {
      await onUpdateItem(itemId, editValues);
      setEditingId(null);
      setEditValues({});
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const isEditing = (itemId?: string) => {
    return editingId === (itemId || '');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 rounded-lg border border-gray-200 bg-gray-50">
        <div className="text-gray-500">Loading items...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden flex flex-col">
      {/* Table Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
          <span className="text-sm text-gray-500">{items.length} items</span>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">
                Description
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700">
                Qty
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700">
                Unit Price
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700">
                Line Total
              </th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center px-6 py-8 text-gray-500">
                  No items yet. Add materials, labour, or custom items below.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
                const isEditingThis = isEditing(item.id);

                return (
                  <tr
                    key={item.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {/* Description */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{item.description}</span>
                        {item.is_locked && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Locked
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="px-6 py-4 text-sm text-right">
                      {isEditingThis ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValues.quantity || 0}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              quantity: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-20 px-2 py-1 text-right border border-gray-300 rounded"
                        />
                      ) : (
                        <span>{item.quantity}</span>
                      )}
                    </td>

                    {/* Unit Price */}
                    <td className="px-6 py-4 text-sm text-right">
                      {isEditingThis ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValues.unit_price || 0}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              unit_price: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-24 px-2 py-1 text-right border border-gray-300 rounded"
                          disabled={item.is_locked}
                        />
                      ) : (
                        <span>{formatCurrency(item.unit_price || 0)}</span>
                      )}
                    </td>

                    {/* Line Total */}
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(lineTotal)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-sm text-center">
                      {isEditingThis ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditSave(item.id!)}
                            className="text-green-600 hover:text-green-700 font-medium text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="text-gray-400 hover:text-gray-500 font-medium text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditStart(item)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => item.id && onDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Items Section */}
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Add item:</span>
          <button
            onClick={onAddMaterial}
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Material
          </button>
          <button
            onClick={onAddLabour}
            className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            + Labour
          </button>
          <button
            onClick={onAddCustom}
            className="inline-flex items-center px-4 py-2 rounded-md bg-gray-600 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            + Custom Line
          </button>
        </div>
      </div>
    </div>
  );
}
