/**
 * Shared Document Services
 * ==========================
 * Document generation, numbering, and export
 * Used by: Web UI, Mobile Apps, Admin, API
 *
 * Pure business logic - no UI dependencies
 */

import { formatCurrency, formatDate, addDays } from '@/utils/documents';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BusinessInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  vatNumber?: string;
}

export interface ClientInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
}

export interface DocumentData {
  type: 'quote' | 'invoice';
  number: string;
  date: string;
  validUntil?: string;
  dueDate?: string;
  business: BusinessInfo;
  client: ClientInfo;
  lineItems: LineItem[];
  subtotal: number;
  vatRate: number;
  vat: number;
  total: number;
  notes?: string;
  terms?: string;
  paymentTerms?: number;
}

/**
 * Get next sequential number
 * Storage: localStorage for now, can migrate to DB
 */
export function getNextDocumentNumber(type: 'quote' | 'invoice'): string {
  const key = `${type}_counter`;
  let counter = 0;

  if (typeof window !== 'undefined') {
    counter = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, counter.toString());
  } else {
    // Server-side fallback (e.g., mobile API)
    counter = Math.floor(Math.random() * 10000) + 1;
  }

  const prefix = type === 'quote' ? 'Q' : 'INV';
  return `${prefix}-${String(counter).padStart(6, '0')}`;
}

/**
 * Calculate line item total
 */
export function calculateLineItemTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/**
 * Calculate subtotal from line items
 */
export function calculateSubtotal(lineItems: LineItem[]): number {
  return Math.round(lineItems.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
}

/**
 * Calculate VAT amount
 */
export function calculateVAT(subtotal: number, vatRate: number): number {
  return Math.round(subtotal * (vatRate / 100) * 100) / 100;
}

/**
 * Calculate total (subtotal + VAT)
 */
export function calculateTotal(subtotal: number, vat: number): number {
  return Math.round((subtotal + vat) * 100) / 100;
}

/**
 * Generate complete document data
 */
export function generateDocument(
  type: 'quote' | 'invoice',
  business: BusinessInfo,
  client: ClientInfo,
  lineItems: LineItem[],
  vatRate: number = 20,
  notes?: string,
  terms?: string,
  paymentTerms?: number
): DocumentData {
  const subtotal = calculateSubtotal(lineItems);
  const vat = calculateVAT(subtotal, vatRate);
  const total = calculateTotal(subtotal, vat);

  const now = new Date();
  const nowISO = now.toISOString();
  const validUntil = type === 'quote' ? addDays(now, 30).toISOString() : undefined;
  const dueDate = type === 'invoice' ? addDays(now, paymentTerms || 30).toISOString() : undefined;

  return {
    type,
    number: getNextDocumentNumber(type),
    date: nowISO,
    validUntil,
    dueDate,
    business,
    client,
    lineItems,
    subtotal,
    vatRate,
    vat,
    total,
    notes,
    terms,
    paymentTerms: paymentTerms || 30,
  };
}

/**
 * Format document for display/export
 */
export function formatDocument(doc: DocumentData): {
  number: string;
  date: string;
  dueDate?: string;
  validUntil?: string;
  subtotal: string;
  vat: string;
  total: string;
} {
  return {
    number: doc.number,
    date: formatDate(doc.date),
    dueDate: doc.dueDate ? formatDate(doc.dueDate) : undefined,
    validUntil: doc.validUntil ? formatDate(doc.validUntil) : undefined,
    subtotal: formatCurrency(doc.subtotal),
    vat: formatCurrency(doc.vat),
    total: formatCurrency(doc.total),
  };
}

/**
 * Export document to JSON
 */
export function exportDocumentJSON(doc: DocumentData): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * Export document to CSV (line items only)
 */
export function exportDocumentCSV(doc: DocumentData): string {
  const headers = ['Description', 'Quantity', 'Unit Price', 'Total'];
  const rows = doc.lineItems.map(item => [
    `"${item.description.replace(/"/g, '""')}"`,
    item.quantity,
    formatCurrency(item.unitPrice),
    formatCurrency(item.total),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
    '',
    `Subtotal,${formatCurrency(doc.subtotal)}`,
    `VAT (${doc.vatRate}%),${formatCurrency(doc.vat)}`,
    `Total,${formatCurrency(doc.total)}`,
  ].join('\n');

  return csv;
}

/**
 * Validate document data before saving/sending
 */
export function validateDocument(doc: DocumentData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!doc.business.name) errors.push('Business name is required');
  if (!doc.business.email) errors.push('Business email is required');
  if (!doc.business.address) errors.push('Business address is required');
  if (doc.lineItems.length === 0) errors.push('At least one line item is required');
  if (doc.total <= 0) errors.push('Document total must be greater than 0');

  if (doc.type === 'invoice' && !doc.dueDate) {
    errors.push('Invoice must have a due date');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
