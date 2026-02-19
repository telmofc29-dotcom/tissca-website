/**
 * Invoice System Validation Schemas
 * Zod schemas for API validation and runtime type checking
 */

import { z } from 'zod';

// ============================================================================
// INVOICE STATUS & ENUM SCHEMAS
// ============================================================================

const InvoiceStatus = z.enum([
  'draft',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
]);

const InvoiceItemType = z.enum(['material', 'labour', 'custom']);

const PaymentMethod = z.enum(['bank', 'cash', 'card', 'other']);

// ============================================================================
// INVOICE ITEM SCHEMAS
// ============================================================================

export const CreateInvoiceItemSchema = z.object({
  type: InvoiceItemType.default('material'),
  description: z.string().min(1, 'Item description is required').max(500),
  qty: z.number().gt(0, 'Quantity must be greater than 0'),
  unit: z.string().max(20).optional(),
  unit_price: z.number().gte(0, 'Unit price must be greater than or equal to 0'),
  vat_rate: z.number().gte(0, 'VAT rate must be >= 0').lte(100, 'VAT rate must be <= 100').default(0),
  sort_order: z.number().int().default(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateInvoiceItemSchema = CreateInvoiceItemSchema.partial();

export const InvoiceItemSchema = CreateInvoiceItemSchema.extend({
  id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  line_subtotal: z.number().gte(0),
  line_vat: z.number().gte(0),
  line_total: z.number().gte(0),
  created_at: z.string().datetime(),
});

export type CreateInvoiceItemInput = z.infer<typeof CreateInvoiceItemSchema>;
export type UpdateInvoiceItemInput = z.infer<typeof UpdateInvoiceItemSchema>;
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

// ============================================================================
// INVOICE PAYMENT SCHEMAS
// ============================================================================

export const RecordPaymentSchema = z.object({
  amount: z.number().gt(0, 'Payment amount must be greater than 0'),
  method: PaymentMethod,
  reference: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
  paid_at: z.string().datetime().optional(),
});

export const InvoicePaymentSchema = RecordPaymentSchema.extend({
  id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  created_at: z.string().datetime(),
});

export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;
export type InvoicePayment = z.infer<typeof InvoicePaymentSchema>;

// ============================================================================
// INVOICE SCHEMAS
// ============================================================================

export const CreateInvoiceSchema = z.object({
  client_id: z.string().uuid('Client ID must be a valid UUID'),
  invoice_number: z.string().min(1, 'Invoice number is required').max(50),
  quote_id: z.string().uuid().optional(),
  issue_date: z.string().date().optional(), // YYYY-MM-DD format
  due_date: z.string().date().optional().nullable(),
  currency: z.string().length(3, 'Currency code must be 3 characters').default('GBP'),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(5000).optional(),
  items: z.array(CreateInvoiceItemSchema).min(1, 'At least one invoice item is required'),
});

export const UpdateInvoiceSchema = z.object({
  issue_date: z.string().date().optional(),
  due_date: z.string().date().optional().nullable(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(5000).optional().nullable(),
  status: InvoiceStatus.optional(),
}).partial();

export const InvoiceSchema = CreateInvoiceSchema.extend({
  id: z.string().uuid(),
  business_id: z.string().uuid(),
  status: InvoiceStatus.default('draft'),
  subtotal: z.number().gte(0),
  discount_total: z.number().gte(0),
  vat_total: z.number().gte(0),
  total: z.number().gte(0),
  amount_paid: z.number().gte(0),
  balance_due: z.number().gte(0),
  sent_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;

// ============================================================================
// INVOICE WITH DETAILS SCHEMAS
// ============================================================================

export const InvoiceWithDetailsSchema = InvoiceSchema.extend({
  items: z.array(InvoiceItemSchema),
  payments: z.array(InvoicePaymentSchema),
  totals: z.object({
    subtotal: z.number().gte(0),
    discount_total: z.number().gte(0),
    vat_total: z.number().gte(0),
    total: z.number().gte(0),
    amount_paid: z.number().gte(0),
    balance_due: z.number().gte(0),
    payment_status: InvoiceStatus,
  }),
});

export type InvoiceWithDetails = z.infer<typeof InvoiceWithDetailsSchema>;

// ============================================================================
// INVOICE FROM QUOTE SCHEMAS
// ============================================================================

export const CreateInvoiceFromQuoteSchema = z.object({
  quote_id: z.string().uuid('Quote ID must be a valid UUID'),
  invoice_number: z.string().min(1, 'Invoice number is required').max(50),
  issue_date: z.string().date().optional(),
  due_date: z.string().date().optional().nullable(),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(5000).optional(),
});

export type CreateInvoiceFromQuoteInput = z.infer<typeof CreateInvoiceFromQuoteSchema>;

// ============================================================================
// INVOICE STATUS CHANGE SCHEMAS
// ============================================================================

export const SendInvoiceSchema = z.object({
  // No additional fields needed; status change is implicit
});

export const CancelInvoiceSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type SendInvoiceInput = z.infer<typeof SendInvoiceSchema>;
export type CancelInvoiceInput = z.infer<typeof CancelInvoiceSchema>;

// ============================================================================
// FILTERING & PAGINATION SCHEMAS
// ============================================================================

export const InvoiceListFiltersSchema = z.object({
  status: z.union([InvoiceStatus, z.array(InvoiceStatus)]).optional(),
  client_id: z.string().uuid().optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  search: z.string().max(100).optional(),
  is_overdue: z.boolean().optional(),
}).partial();

export const PaginationParamsSchema = z.object({
  page: z.number().int().gte(1, 'Page must be >= 1').default(1),
  limit: z.number().int().gte(1, 'Limit must be >= 1').lte(100, 'Limit must be <= 100').default(20),
  sort_by: z.string().optional(),
  sort_direction: z.enum(['asc', 'desc']).default('desc'),
}).partial();

export type InvoiceListFilters = z.infer<typeof InvoiceListFiltersSchema>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }).optional(),
  });

export const ApiListResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: z.array(dataSchema),
    pagination: z.object({
      total: z.number().int().gte(0),
      page: z.number().int().gte(1),
      limit: z.number().int().gte(1),
      total_pages: z.number().int().gte(0),
    }).optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
    }).optional(),
  });

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate and parse a create invoice request
 */
export function validateCreateInvoice(data: unknown) {
  return CreateInvoiceSchema.safeParse(data);
}

/**
 * Validate and parse an update invoice request
 */
export function validateUpdateInvoice(data: unknown) {
  return UpdateInvoiceSchema.safeParse(data);
}

/**
 * Validate and parse an invoice item
 */
export function validateCreateInvoiceItem(data: unknown) {
  return CreateInvoiceItemSchema.safeParse(data);
}

/**
 * Validate and parse a payment record
 */
export function validateRecordPayment(data: unknown) {
  return RecordPaymentSchema.safeParse(data);
}

/**
 * Validate that a payment amount does not exceed available balance
 * This must be used on the server AFTER parsing the request
 */
export function validatePaymentAmount(amount: number, balance_due: number): boolean {
  return amount > 0 && amount <= balance_due;
}

/**
 * Validate invoice item quantity
 */
export function validateInvoiceItemQty(qty: number): boolean {
  return qty > 0;
}

/**
 * Validate invoice item unit price
 */
export function validateInvoiceItemUnitPrice(price: number): boolean {
  return price >= 0;
}

/**
 * Validate VAT rate (0-100)
 */
export function validateVatRate(rate: number): boolean {
  return rate >= 0 && rate <= 100;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const INVOICE_STATUS_VALUES = [
  'draft',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
] as const;

export const INVOICE_ITEM_TYPES = ['material', 'labour', 'custom'] as const;

export const PAYMENT_METHODS = ['bank', 'cash', 'card', 'other'] as const;

export const VALIDATION_RULES = {
  invoice_number: {
    minLength: 1,
    maxLength: 50,
  },
  item_description: {
    minLength: 1,
    maxLength: 500,
  },
  qty: {
    minValue: 0.01,
    maxValue: 999999.99,
  },
  unit_price: {
    minValue: 0,
    maxValue: 999999.99,
  },
  vat_rate: {
    minValue: 0,
    maxValue: 100,
  },
  payment_amount: {
    minValue: 0.01,
    maxValue: 999999.99,
  },
  currency: {
    length: 3,
  },
} as const;
