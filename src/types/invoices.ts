/**
 * Invoice System Types
 * Comprehensive TypeScript definitions for BUILDR's invoicing engine
 * Supports invoice management, payment tracking, and financial reporting
 */

// ============================================================================
// INVOICE STATUS TYPES
// ============================================================================

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type PaymentMethod = 'bank' | 'cash' | 'card' | 'other';
export type InvoiceItemType = 'material' | 'labour' | 'custom';

// ============================================================================
// INVOICE TYPES
// ============================================================================

export interface Invoice {
  id: string;
  business_id: string;
  client_id: string;
  quote_id: string | null; // Optional link to source quote
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string; // date string (YYYY-MM-DD)
  due_date: string | null;
  currency: string; // e.g., 'GBP'
  subtotal: number;
  discount_total: number;
  vat_total: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  terms: string | null;
  sent_at: string | null; // timestamptz
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface CreateInvoiceRequest {
  client_id: string;
  invoice_number: string;
  quote_id?: string; // Optional: create from accepted quote
  issue_date?: string;
  due_date?: string | null;
  currency?: string;
  notes?: string;
  terms?: string;
  items: CreateInvoiceItemInput[];
}

export interface UpdateInvoiceRequest {
  issue_date?: string;
  due_date?: string | null;
  currency?: string;
  notes?: string | null;
  terms?: string | null;
  status?: InvoiceStatus; // Only allow status change for draft → sent
}

export interface SendInvoiceRequest {
  // Send invoice to client (draft → sent)
  // No body parameters - just triggers status change
}

export interface CancelInvoiceRequest {
  reason?: string; // Optional cancellation reason
}

// ============================================================================
// INVOICE ITEM TYPES
// ============================================================================

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  type: InvoiceItemType;
  description: string;
  qty: number;
  unit: string | null; // e.g., 'each', 'sqm', 'lm', 'hour', 'day'
  unit_price: number;
  vat_rate: number; // e.g., 20 for 20%
  line_subtotal: number; // qty * unit_price
  line_vat: number; // calculated
  line_total: number; // line_subtotal + line_vat
  sort_order: number;
  metadata: Record<string, unknown> | null; // Flexible data (material_id, labour_rate_id, etc.)
  created_at: string; // timestamptz
}

export interface CreateInvoiceItemInput {
  type: InvoiceItemType;
  description: string;
  qty: number;
  unit?: string;
  unit_price: number;
  vat_rate?: number; // Default 0, can be 20 for standard VAT
  sort_order?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateInvoiceItemInput {
  type?: InvoiceItemType;
  description?: string;
  qty?: number;
  unit?: string | null;
  unit_price?: number;
  vat_rate?: number;
  sort_order?: number;
  metadata?: Record<string, unknown> | null;
}

// ============================================================================
// INVOICE PAYMENT TYPES
// ============================================================================

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  paid_at: string; // timestamptz
  method: PaymentMethod;
  reference: string | null; // Bank transfer ref, cheque number, etc.
  notes: string | null;
  created_at: string; // timestamptz
}

export interface RecordPaymentRequest {
  amount: number; // Must be > 0 and <= balance_due
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  paid_at?: string; // Optional, defaults to now()
}

// ============================================================================
// INVOICE TOTALS CALCULATION
// ============================================================================

export interface InvoiceTotalsCalculation {
  subtotal: number;
  discount_total: number;
  vat_total: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  payment_status: InvoiceStatus; // 'draft' | 'sent' | 'partially_paid' | 'paid'
}

// ============================================================================
// INVOICE WITH FULL DETAILS (composite type)
// ============================================================================

export interface InvoiceWithDetails extends Invoice {
  items: InvoiceItem[];
  payments: InvoicePayment[];
  totals: InvoiceTotalsCalculation;
}

// ============================================================================
// FILTERING & PAGINATION
// ============================================================================

export interface InvoiceListFilters {
  status?: InvoiceStatus | InvoiceStatus[];
  client_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string; // Search in invoice_number, client name
  is_overdue?: boolean;
}

export interface InvoicePaymentFilters {
  date_from?: string;
  date_to?: string;
  method?: PaymentMethod;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface InvoiceListResponse extends ApiListResponse<Invoice> {}

export interface InvoiceDetailResponse extends ApiResponse<InvoiceWithDetails> {}

export interface InvoiceCreateResponse extends ApiResponse<Invoice> {}

export interface InvoiceUpdateResponse extends ApiResponse<Invoice> {}

export interface PaymentRecordResponse extends ApiResponse<InvoicePayment> {}

// ============================================================================
// INVOICE FROM QUOTE (immutable snapshot pattern)
// ============================================================================

/**
 * When creating an invoice from an accepted quote, we create an immutable
 * snapshot of the quote items. This prevents changes to the original quote
 * from affecting the invoice.
 */
export interface CreateInvoiceFromQuoteRequest {
  quote_id: string; // Must be an accepted quote
  issue_date?: string;
  due_date?: string | null;
  notes?: string;
  terms?: string;
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const INVOICE_VALIDATION = {
  invoice_number: {
    minLength: 1,
    maxLength: 50,
    pattern: /^[A-Z0-9\-]+$/, // Alphanumeric and hyphens
  },
  due_date: {
    minDaysFromNow: 0, // Can be today
    maxDaysFromNow: 365, // Can't be more than 1 year away
  },
  amount_paid: {
    minValue: 0,
    // maxValue: total (validated at API level)
  },
  vat_rate: {
    minValue: 0,
    maxValue: 100,
  },
  qty: {
    minValue: 0.01,
    maxValue: 999999.99,
  },
  unit_price: {
    minValue: 0,
    maxValue: 999999.99,
  },
} as const;

// ============================================================================
// STATUS HELPERS
// ============================================================================

export const INVOICE_STATUS_VALUES: InvoiceStatus[] = [
  'draft',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
];

export const INVOICE_ITEM_TYPES: InvoiceItemType[] = ['material', 'labour', 'custom'];

export const PAYMENT_METHODS: PaymentMethod[] = ['bank', 'cash', 'card', 'other'];

/**
 * Check if an invoice is editable (only drafts can be edited)
 */
export function isInvoiceEditable(status: InvoiceStatus): boolean {
  return status === 'draft';
}

/**
 * Check if an invoice can be sent (must be draft)
 */
export function canSendInvoice(status: InvoiceStatus): boolean {
  return status === 'draft';
}

/**
 * Check if a payment can be recorded (can't be draft or cancelled)
 */
export function canRecordPayment(status: InvoiceStatus): boolean {
  return status !== 'draft' && status !== 'cancelled';
}

/**
 * Determine invoice status based on payment state
 */
export function calculateInvoiceStatus(
  amount_paid: number,
  total: number,
  is_cancelled: boolean,
  is_sent: boolean
): InvoiceStatus {
  if (is_cancelled) return 'cancelled';
  if (!is_sent) return 'draft';
  if (amount_paid >= total) return 'paid';
  if (amount_paid > 0) return 'partially_paid';
  return 'sent';
}
