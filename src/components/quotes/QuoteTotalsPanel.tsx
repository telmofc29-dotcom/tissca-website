/**
 * Quote Totals Panel
 * Sticky right panel showing quote financial summary
 */

'use client';

import React from 'react';
import { PricingResult } from '@/types/quotes';

interface QuoteTotalsPanelProps {
  totals: PricingResult;
  isLoading?: boolean;
}

export function QuoteTotalsPanel({ totals, isLoading = false }: QuoteTotalsPanelProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 rounded-lg border border-gray-200 bg-gray-50">
        <div className="text-gray-500">Loading totals...</div>
      </div>
    );
  }

  return (
    <div className="sticky top-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Quote Summary</h3>

      <div className="space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="text-gray-600">Subtotal</span>
          <span className="text-gray-900 font-medium">{formatCurrency(totals.subtotal)}</span>
        </div>

        {/* Markup */}
        {totals.markup_amount > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Markup</span>
            </div>
            <span className="text-green-600 font-medium">
              +{formatCurrency(totals.markup_amount)}
            </span>
          </div>
        )}

        {/* Discount */}
        {totals.discount_amount > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Discount</span>
            </div>
            <span className="text-red-600 font-medium">
              -{formatCurrency(totals.discount_amount)}
            </span>
          </div>
        )}

        {/* Subtotal after markup/discount */}
        <div className="flex justify-between items-center py-2 border-b border-gray-200">
          <span className="text-gray-600">Subtotal (after adjustments)</span>
          <span className="text-gray-900 font-medium">
            {formatCurrency(
              totals.subtotal + totals.markup_amount - totals.discount_amount
            )}
          </span>
        </div>

        {/* VAT */}
        {totals.vat_amount > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">VAT</span>
            </div>
            <span className="text-gray-900 font-medium">
              +{formatCurrency(totals.vat_amount)}
            </span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-center py-3 bg-blue-50 rounded-lg px-3 mb-4 border border-blue-200">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="font-bold text-xl text-blue-600">
            {formatCurrency(totals.total)}
          </span>
        </div>

        {/* Deposit */}
        {totals.deposit_amount && totals.deposit_amount > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-600">Deposit Required</span>
            <span className="text-blue-600 font-medium">
              {formatCurrency(totals.deposit_amount)}
            </span>
          </div>
        )}

        {/* Balance Due */}
        {totals.balance_due > 0 && (
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 font-medium">Balance Due</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(totals.balance_due)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
