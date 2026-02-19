/**
 * Document Management Utilities
 * ============================
 * Handles document generation, numbering, storage references.
 * Designed to support future authentication and persistence.
 */

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface DocumentDetails {
  type: 'quote' | 'invoice';
  number: string;
  date: string;
  validUntil?: string;
  notes?: string;
  terms?: string;
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
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
}

export interface QuoteInvoice {
  details: DocumentDetails;
  business: BusinessInfo;
  client: ClientInfo;
  lineItems: LineItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

const documentCounters: Record<'quote' | 'invoice', number> = {
  quote: 0,
  invoice: 0,
};

/**
 * DOCUMENT NUMBERING
 * Generate sequential numbers for quotes and invoices.
 * Process-local counter only (server-safe).
 * Replace with database sequence for persistent/global ordering.
 */
export function getNextDocumentNumber(type: 'quote' | 'invoice'): string {
  documentCounters[type] += 1;
  const counter = documentCounters[type];

  const prefix = type === 'quote' ? 'Q' : 'INV';
  return `${prefix}-${String(counter).padStart(6, '0')}`;
}

/**
 * CALCULATIONS
 */

export function calculateLineItemTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

export function calculateSubtotal(lineItems: LineItem[]): number {
  return Math.round(lineItems.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
}

export function calculateVAT(subtotal: number, vatRate: number): number {
  return Math.round((subtotal * vatRate) / 100 * 100) / 100;
}

export function calculateTotal(subtotal: number, vat: number): number {
  return Math.round((subtotal + vat) * 100) / 100;
}

/**
 * DOCUMENT GENERATION
 * Creates a normalized document object from form data.
 */

export function generateDocument(
  type: 'quote' | 'invoice',
  business: BusinessInfo,
  client: ClientInfo,
  lineItems: LineItem[],
  vatRate: number,
  notes: string = '',
  terms: string = ''
): QuoteInvoice {
  const subtotal = calculateSubtotal(lineItems);
  const vatAmount = calculateVAT(subtotal, vatRate);
  const total = calculateTotal(subtotal, vatAmount);

  return {
    details: {
      type,
      number: getNextDocumentNumber(type),
      date: new Date().toISOString().split('T')[0],
      validUntil: type === 'quote' ? addDays(new Date(), 30).toISOString().split('T')[0] : undefined,
      notes,
      terms,
    },
    business,
    client,
    lineItems,
    subtotal,
    vatRate,
    vatAmount,
    total,
  };
}

/**
 * HELPERS
 */

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * FORMATTING
 */

export function formatCurrency(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
