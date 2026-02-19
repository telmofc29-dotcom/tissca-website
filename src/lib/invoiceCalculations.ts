/**
 * Invoice Calculation Utilities
 * Server-side financial calculation helpers for invoice system
 * All calculations are performed server-side and never trust client values
 */

import { InvoiceStatus } from '@/types/invoices';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of invoice totals calculation
 */
export interface InvoiceTotalsResult {
  subtotal: number;
  discount_total: number;
  vat_total: number;
  total: number;
}

/**
 * Result of payment application
 */
export interface PaymentApplicationResult {
  amount_paid: number;
  balance_due: number;
  status: InvoiceStatus;
}

/**
 * Complete invoice calculation result
 */
export interface InvoiceCalculationResult extends InvoiceTotalsResult, PaymentApplicationResult {}

// ============================================================================
// TOTALS CALCULATION
// ============================================================================

/**
 * Calculate invoice totals from line items
 * 
 * This function:
 * 1. Calculates line subtotal for each item (qty * unit_price)
 * 2. Calculates line VAT for each item (line_subtotal * (vat_rate / 100))
 * 3. Calculates line total (line_subtotal + line_vat)
 * 4. Sums all line amounts to get invoice totals
 * 5. Applies discount_total if provided
 * 
 * @param items - Array of invoice items with qty, unit_price, vat_rate
 * @param discount_total - Optional discount amount to subtract from subtotal
 * @returns Object with subtotal, discount_total, vat_total, total (all >= 0)
 * 
 * @example
 * const items = [
 *   { qty: 2, unit_price: 100, vat_rate: 20 },
 *   { qty: 1, unit_price: 50, vat_rate: 0 },
 * ];
 * const totals = calculateInvoiceTotals(items, 10);
 * // Returns: { subtotal: 240, discount_total: 10, vat_total: 48, total: 278 }
 */
export function calculateInvoiceTotals(
  items: Array<{ qty: number; unit_price: number; vat_rate: number }>,
  discount_total: number = 0
): InvoiceTotalsResult {
  // Validate inputs
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }

  if (discount_total < 0) {
    throw new Error('Discount total cannot be negative');
  }

  // Calculate line totals and aggregate
  let subtotal = 0;
  let vat_total = 0;

  for (const item of items) {
    // Validate item
    if (typeof item.qty !== 'number' || item.qty <= 0) {
      throw new Error('Item quantity must be > 0');
    }
    if (typeof item.unit_price !== 'number' || item.unit_price < 0) {
      throw new Error('Item unit price must be >= 0');
    }
    if (typeof item.vat_rate !== 'number' || item.vat_rate < 0 || item.vat_rate > 100) {
      throw new Error('Item VAT rate must be between 0 and 100');
    }

    // Calculate line amounts
    const line_subtotal = roundToPence(item.qty * item.unit_price);
    const line_vat = roundToPence(line_subtotal * (item.vat_rate / 100));

    subtotal += line_subtotal;
    vat_total += line_vat;
  }

  // Round to prevent floating point errors
  subtotal = roundToPence(subtotal);
  vat_total = roundToPence(vat_total);

  // Apply discount to subtotal (discount is applied pre-VAT in typical invoicing)
  const subtotal_after_discount = roundToPence(subtotal - discount_total);

  // Calculate total
  const total = roundToPence(subtotal_after_discount + vat_total);

  // Ensure all values are >= 0
  return {
    subtotal: Math.max(0, subtotal),
    discount_total: Math.max(0, discount_total),
    vat_total: Math.max(0, vat_total),
    total: Math.max(0, total),
  };
}

// ============================================================================
// PAYMENT APPLICATION
// ============================================================================

/**
 * Calculate payment status from invoice totals and payment history
 * 
 * This function:
 * 1. Sums all recorded payments
 * 2. Calculates remaining balance (total - amount_paid)
 * 3. Determines invoice status based on payment state
 * 
 * Status rules:
 * - 'paid': balance_due == 0 AND total > 0 (fully paid)
 * - 'partially_paid': amount_paid > 0 AND balance_due > 0 (partially paid)
 * - 'sent': sent_at is set AND amount_paid == 0 (sent but not paid)
 * - 'draft': NOT sent AND amount_paid == 0 (not sent)
 * 
 * @param invoice - Invoice object with total, sent_at
 * @param payments - Array of payments (or empty if none)
 * @returns Object with amount_paid, balance_due, status
 * 
 * @example
 * const result = applyPayment(
 *   { total: 100, sent_at: '2024-01-01T00:00:00Z' },
 *   [{ amount: 30 }, { amount: 20 }]
 * );
 * // Returns: { amount_paid: 50, balance_due: 50, status: 'partially_paid' }
 */
export function applyPayment(
  invoice: { total: number; sent_at: string | null },
  payments: Array<{ amount: number }> = []
): PaymentApplicationResult {
  // Validate invoice
  if (typeof invoice.total !== 'number' || invoice.total < 0) {
    throw new Error('Invoice total must be >= 0');
  }

  // Calculate total amount paid from all payments
  let amount_paid = 0;

  if (Array.isArray(payments)) {
    for (const payment of payments) {
      if (typeof payment.amount !== 'number' || payment.amount < 0) {
        throw new Error('Payment amount must be >= 0');
      }
      amount_paid += payment.amount;
    }
  }

  // Round to prevent floating point errors
  amount_paid = roundToPence(amount_paid);

  // Calculate balance due (ensure it doesn't go negative due to overpayment)
  let balance_due = roundToPence(invoice.total - amount_paid);
  balance_due = Math.max(0, balance_due);

  // Determine status based on payment state
  const status = determineInvoiceStatus(
    invoice.total,
    amount_paid,
    balance_due,
    invoice.sent_at
  );

  return {
    amount_paid,
    balance_due,
    status,
  };
}

// ============================================================================
// COMPLETE CALCULATION (totals + payments)
// ============================================================================

/**
 * Calculate complete invoice state from items and payments
 * 
 * This is a convenience function that combines totals calculation and payment application
 * 
 * @param items - Array of invoice items
 * @param payments - Array of payment records (or empty)
 * @param discount_total - Optional discount (default 0)
 * @param sent_at - Invoice sent date (for status determination)
 * @returns Complete calculation result with all totals and payment info
 */
export function calculateCompleteInvoice(
  items: Array<{ qty: number; unit_price: number; vat_rate: number }>,
  payments: Array<{ amount: number }> = [],
  discount_total: number = 0,
  sent_at: string | null = null
): InvoiceCalculationResult {
  // Calculate totals
  const totals = calculateInvoiceTotals(items, discount_total);

  // Apply payments
  const payment_result = applyPayment(
    { total: totals.total, sent_at },
    payments
  );

  return {
    ...totals,
    ...payment_result,
  };
}

// ============================================================================
// STATUS DETERMINATION
// ============================================================================

/**
 * Determine invoice status based on payment state
 * 
 * @param total - Invoice total amount
 * @param amount_paid - Total amount paid so far
 * @param balance_due - Remaining balance
 * @param sent_at - When invoice was sent (null if draft)
 * @returns Appropriate invoice status
 */
export function determineInvoiceStatus(
  total: number,
  amount_paid: number,
  balance_due: number,
  sent_at: string | null
): InvoiceStatus {
  // Check if fully paid (balance_due == 0 and there's an amount to pay)
  if (balance_due === 0 && total > 0) {
    return 'paid';
  }

  // Check if partially paid (has payments but still owes)
  if (amount_paid > 0 && balance_due > 0) {
    return 'partially_paid';
  }

  // Check if sent but not paid
  if (sent_at !== null && amount_paid === 0) {
    return 'sent';
  }

  // Otherwise it's a draft
  return 'draft';
}

// ============================================================================
// PAYMENT VALIDATION
// ============================================================================

/**
 * Validate that a payment amount is acceptable
 * 
 * @param payment_amount - Amount user is trying to pay
 * @param balance_due - Current balance due on invoice
 * @returns true if valid, false otherwise
 * 
 * Rules:
 * - Must be > 0
 * - Must not exceed balance_due
 */
export function isValidPaymentAmount(
  payment_amount: number,
  balance_due: number
): boolean {
  if (payment_amount <= 0) {
    return false;
  }

  if (payment_amount > balance_due) {
    return false;
  }

  return true;
}

/**
 * Validate payment amount and get error message if invalid
 * 
 * @param payment_amount - Amount user is trying to pay
 * @param balance_due - Current balance due
 * @returns null if valid, error message otherwise
 */
export function validatePaymentAmount(
  payment_amount: number,
  balance_due: number
): string | null {
  if (payment_amount <= 0) {
    return 'Payment amount must be greater than 0';
  }

  if (payment_amount > balance_due) {
    return `Payment amount (${formatCurrency(payment_amount)}) cannot exceed balance due (${formatCurrency(balance_due)})`;
  }

  return null;
}

// ============================================================================
// CURRENCY FORMATTING & ROUNDING
// ============================================================================

/**
 * Round a number to 2 decimal places (pence for GBP)
 * 
 * @param value - Number to round
 * @returns Rounded number
 */
export function roundToPence(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format a number as currency (GBP)
 * 
 * @param value - Amount to format
 * @param currency - Currency code (default GBP)
 * @returns Formatted string like "£100.50"
 */
export function formatCurrency(value: number, currency: string = 'GBP'): string {
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(value);
}

// ============================================================================
// INVOICE LINE ITEM CALCULATION
// ============================================================================

/**
 * Calculate line totals for a single invoice item
 * 
 * @param qty - Quantity
 * @param unit_price - Price per unit
 * @param vat_rate - VAT rate (0-100)
 * @returns Object with line_subtotal, line_vat, line_total
 */
export function calculateLineItem(
  qty: number,
  unit_price: number,
  vat_rate: number
): {
  line_subtotal: number;
  line_vat: number;
  line_total: number;
} {
  if (qty <= 0) {
    throw new Error('Quantity must be > 0');
  }
  if (unit_price < 0) {
    throw new Error('Unit price must be >= 0');
  }
  if (vat_rate < 0 || vat_rate > 100) {
    throw new Error('VAT rate must be between 0 and 100');
  }

  const line_subtotal = roundToPence(qty * unit_price);
  const line_vat = roundToPence(line_subtotal * (vat_rate / 100));
  const line_total = roundToPence(line_subtotal + line_vat);

  return {
    line_subtotal,
    line_vat,
    line_total,
  };
}

// ============================================================================
// INVOICE DIFF/CHANGE DETECTION
// ============================================================================

/**
 * Check if invoice totals have changed
 * (useful for detecting if recalculation is needed)
 * 
 * @param old_totals - Previous totals
 * @param new_totals - New calculated totals
 * @returns true if any value changed
 */
export function invoiceTotalsChanged(
  old_totals: InvoiceTotalsResult,
  new_totals: InvoiceTotalsResult
): boolean {
  return (
    old_totals.subtotal !== new_totals.subtotal ||
    old_totals.discount_total !== new_totals.discount_total ||
    old_totals.vat_total !== new_totals.vat_total ||
    old_totals.total !== new_totals.total
  );
}

/**
 * Check if payment status has changed
 * 
 * @param old_status - Previous status
 * @param new_status - New calculated status
 * @returns true if status changed
 */
export function invoiceStatusChanged(
  old_status: InvoiceStatus,
  new_status: InvoiceStatus
): boolean {
  return old_status !== new_status;
}
