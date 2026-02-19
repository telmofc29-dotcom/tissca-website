/**
 * Quote System Validation Schemas
 * Zod schemas for API validation and runtime type checking
 */

import { z } from 'zod';

// ============================================================================
// MATERIAL SCHEMAS
// ============================================================================

const MaterialUnit = z.enum(['sqm', 'lm', 'each', 'set', 'day', 'hour']).or(z.string());

export const CreateMaterialSchema = z.object({
  name: z.string().min(1, 'Material name is required').max(255),
  category: z.string().min(1, 'Category is required').max(100),
  description: z.string().max(1000).optional(),
  sku: z.string().max(100).optional(),
  unit: MaterialUnit.default('each'),
  default_price: z.number().min(0, 'Price must be non-negative'),
  currency: z.string().max(3).default('GBP'),
});

export const UpdateMaterialSchema = CreateMaterialSchema.partial();

export const MaterialSchema = CreateMaterialSchema.extend({
  id: z.string().uuid(),
  business_id: z.string().uuid(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type CreateMaterialInput = z.infer<typeof CreateMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof UpdateMaterialSchema>;
export type Material = z.infer<typeof MaterialSchema>;

// ============================================================================
// MATERIAL VARIANT SCHEMAS
// ============================================================================

export const CreateMaterialVariantSchema = z.object({
  label: z.string().min(1, 'Variant label is required').max(255),
  description: z.string().max(1000).optional(),
  sku: z.string().max(100).optional(),
  price_override: z.number().min(0).optional(),
});

export const UpdateMaterialVariantSchema = CreateMaterialVariantSchema.partial();

export const MaterialVariantSchema = CreateMaterialVariantSchema.extend({
  id: z.string().uuid(),
  material_id: z.string().uuid(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type CreateMaterialVariantInput = z.infer<typeof CreateMaterialVariantSchema>;
export type UpdateMaterialVariantInput = z.infer<typeof UpdateMaterialVariantSchema>;
export type MaterialVariant = z.infer<typeof MaterialVariantSchema>;

// ============================================================================
// LABOUR RATE SCHEMAS
// ============================================================================

const RateType = z.enum(['hourly', 'daily', 'per_unit', 'fixed']);

export const CreateLabourRateSchema = z.object({
  trade: z.string().min(1, 'Trade is required').max(255),
  description: z.string().max(1000).optional(),
  rate_type: RateType.default('hourly'),
  price: z.number().min(0, 'Price must be non-negative'),
  unit: z.string().min(1, 'Unit is required').max(50),
  currency: z.string().max(3).default('GBP'),
});

export const UpdateLabourRateSchema = CreateLabourRateSchema.partial();

export const LabourRateSchema = CreateLabourRateSchema.extend({
  id: z.string().uuid(),
  business_id: z.string().uuid(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type CreateLabourRateInput = z.infer<typeof CreateLabourRateSchema>;
export type UpdateLabourRateInput = z.infer<typeof UpdateLabourRateSchema>;
export type LabourRate = z.infer<typeof LabourRateSchema>;

// ============================================================================
// CLIENT SCHEMAS
// ============================================================================

export const CreateClientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(255),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address_line_1: z.string().max(255).optional(),
  address_line_2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  country: z.string().max(2).default('GB'),
  company_name: z.string().max(255).optional(),
  vat_number: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateClientSchema = CreateClientSchema.partial();

export const ClientSchema = CreateClientSchema.extend({
  id: z.string().uuid(),
  business_id: z.string().uuid(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
export type Client = z.infer<typeof ClientSchema>;

// ============================================================================
// QUOTE SCHEMAS
// ============================================================================

const QuoteStatus = z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted']);
const DiscountType = z.enum(['none', 'percentage', 'fixed']);
const MarkupType = z.enum(['none', 'percentage', 'fixed']);
const DepositType = z.enum(['none', 'percentage', 'fixed']);

export const CreateQuoteSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  quote_number: z.string().min(1, 'Quote number is required').max(50),
  title: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  valid_until: z.string().datetime().optional(),
  currency: z.string().max(3).default('GBP'),
  vat_rate: z.number().min(0).max(100).default(20),
  discount_type: DiscountType.default('none'),
  discount_value: z.number().min(0).optional(),
  markup_type: MarkupType.default('none'),
  markup_value: z.number().min(0).optional(),
  deposit_type: DepositType.default('none'),
  deposit_value: z.number().min(0).optional(),
  terms_and_conditions: z.string().max(5000).optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateQuoteSchema = CreateQuoteSchema.partial().extend({
  status: QuoteStatus.optional(),
});

export const QuoteSchema = CreateQuoteSchema.extend({
  id: z.string().uuid(),
  business_id: z.string().uuid(),
  status: QuoteStatus.default('draft'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  sent_at: z.string().datetime().nullable(),
  accepted_at: z.string().datetime().nullable(),
  valid_from: z.string().datetime(),
  created_by_user_id: z.string().uuid().nullable(),
});

export type CreateQuoteInput = z.infer<typeof CreateQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof UpdateQuoteSchema>;
export type Quote = z.infer<typeof QuoteSchema>;

// ============================================================================
// QUOTE ITEM SCHEMAS
// ============================================================================

const QuoteItemType = z.enum(['material', 'labour', 'custom']);

export const CreateQuoteItemSchema = z.object({
  material_id: z.string().uuid().optional(),
  material_variant_id: z.string().uuid().optional(),
  labour_rate_id: z.string().uuid().optional(),
  item_type: QuoteItemType.default('material'),
  custom_description: z.string().max(1000).optional(),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  notes: z.string().max(500).optional(),
  sort_order: z.number().int().default(0),
}).refine(
  (data: {
    material_id?: string;
    labour_rate_id?: string;
    custom_description?: string;
  }) => {
    // At least one of material_id, labour_rate_id, or custom_description must be provided
    return data.material_id || data.labour_rate_id || data.custom_description;
  },
  {
    message: 'Must provide either material_id, labour_rate_id, or custom_description',
    path: ['material_id'],
  }
);

export const UpdateQuoteItemSchema = CreateQuoteItemSchema.partial();

export const QuoteItemSchema = CreateQuoteItemSchema.extend({
  id: z.string().uuid(),
  quote_id: z.string().uuid(),
  line_total: z.number().min(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type CreateQuoteItemInput = z.infer<typeof CreateQuoteItemSchema>;
export type UpdateQuoteItemInput = z.infer<typeof UpdateQuoteItemSchema>;
export type QuoteItem = z.infer<typeof QuoteItemSchema>;

// ============================================================================
// QUOTE TOTALS SNAPSHOT SCHEMAS
// ============================================================================

export const CreateQuoteTotalsSnapshotSchema = z.object({
  subtotal: z.number().min(0),
  discount_amount: z.number().min(0).default(0),
  markup_amount: z.number().min(0).default(0),
  vat_amount: z.number().min(0).default(0),
  total: z.number().min(0),
  deposit_amount: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

export const QuoteTotalsSnapshotSchema = CreateQuoteTotalsSnapshotSchema.extend({
  id: z.string().uuid(),
  quote_id: z.string().uuid(),
  created_at: z.string().datetime(),
});

export type CreateQuoteTotalsSnapshotInput = z.infer<typeof CreateQuoteTotalsSnapshotSchema>;
export type QuoteTotalsSnapshot = z.infer<typeof QuoteTotalsSnapshotSchema>;

// ============================================================================
// PRICING CALCULATION SCHEMAS
// ============================================================================

export const PricingCalculationSchema = z.object({
  subtotal: z.number().min(0),
  discount_amount: z.number().min(0),
  markup_amount: z.number().min(0),
  vat_amount: z.number().min(0),
  total: z.number().min(0),
  deposit_amount: z.number().min(0).nullable(),
  balance_due: z.number(),
});

export type PricingCalculation = z.infer<typeof PricingCalculationSchema>;

// ============================================================================
// BULK OPERATION SCHEMAS
// ============================================================================

export const BulkCreateQuoteItemsSchema = z.object({
  quote_id: z.string().uuid('Invalid quote ID'),
  items: z.array(CreateQuoteItemSchema).min(1, 'At least one item is required'),
});

export const BulkUpdateQuoteItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid('Invalid item ID'),
      data: UpdateQuoteItemSchema,
    })
  ).min(1),
});

export const BulkDeleteQuoteItemsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required'),
});

export type BulkCreateQuoteItemsInput = z.infer<typeof BulkCreateQuoteItemsSchema>;
export type BulkUpdateQuoteItemsInput = z.infer<typeof BulkUpdateQuoteItemsSchema>;
export type BulkDeleteQuoteItemsInput = z.infer<typeof BulkDeleteQuoteItemsSchema>;

// ============================================================================
// FILTER SCHEMAS
// ============================================================================

export const MaterialFiltersSchema = z.object({
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const LabourRateFiltersSchema = z.object({
  trade: z.string().optional(),
  rate_type: RateType.optional(),
  is_active: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const QuoteFiltersSchema = z.object({
  status: QuoteStatus.or(z.array(QuoteStatus)).optional(),
  client_id: z.string().uuid().optional(),
  created_by_user_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type MaterialFilters = z.infer<typeof MaterialFiltersSchema>;
export type LabourRateFilters = z.infer<typeof LabourRateFiltersSchema>;
export type QuoteFilters = z.infer<typeof QuoteFiltersSchema>;

// ============================================================================
// UTILITY FUNCTIONS FOR VALIDATION
// ============================================================================

/**
 * Validates a pricing config and returns normalized values
 */
export function validateAndNormalizePricingConfig(config: {
  vat_rate: number;
  discount_type: string;
  discount_value?: number | null;
  markup_type: string;
  markup_value?: number | null;
  deposit_type: string;
  deposit_value?: number | null;
}) {
  const result = {
    vat_rate: Math.max(0, Math.min(100, config.vat_rate)),
    discount_type: config.discount_type as 'none' | 'percentage' | 'fixed',
    discount_value: config.discount_value ?? null,
    markup_type: config.markup_type as 'none' | 'percentage' | 'fixed',
    markup_value: config.markup_value ?? null,
    deposit_type: config.deposit_type as 'none' | 'percentage' | 'fixed',
    deposit_value: config.deposit_value ?? null,
  };

  // Validate percentage values
  if (result.discount_type === 'percentage' && result.discount_value) {
    result.discount_value = Math.max(0, Math.min(100, result.discount_value));
  }
  if (result.markup_type === 'percentage' && result.markup_value) {
    result.markup_value = Math.max(0, Math.min(100, result.markup_value));
  }
  if (result.deposit_type === 'percentage' && result.deposit_value) {
    result.deposit_value = Math.max(0, Math.min(100, result.deposit_value));
  }

  return result;
}

/**
 * Calculates quote totals from items and pricing config
 */
export function calculateQuoteTotals(
  subtotal: number,
  config: {
    vat_rate: number;
    discount_type: string;
    discount_value?: number | null;
    markup_type: string;
    markup_value?: number | null;
    deposit_type: string;
    deposit_value?: number | null;
  }
): PricingCalculation {
  let discountAmount = 0;
  let markupAmount = 0;
  let depositAmount = null;

  // Calculate discount
  if (config.discount_type === 'percentage' && config.discount_value) {
    discountAmount = (subtotal * config.discount_value) / 100;
  } else if (config.discount_type === 'fixed' && config.discount_value) {
    discountAmount = config.discount_value;
  }

  // Calculate markup
  const subtotalAfterDiscount = subtotal - discountAmount;
  if (config.markup_type === 'percentage' && config.markup_value) {
    markupAmount = (subtotalAfterDiscount * config.markup_value) / 100;
  } else if (config.markup_type === 'fixed' && config.markup_value) {
    markupAmount = config.markup_value;
  }

  // Calculate VAT on subtotal after discount and markup
  const subtotalAfterDiscountAndMarkup = subtotalAfterDiscount + markupAmount;
  const vatAmount = (subtotalAfterDiscountAndMarkup * config.vat_rate) / 100;

  // Calculate total
  const total = subtotalAfterDiscountAndMarkup + vatAmount;

  // Calculate deposit
  if (config.deposit_type === 'percentage' && config.deposit_value) {
    depositAmount = (total * config.deposit_value) / 100;
  } else if (config.deposit_type === 'fixed' && config.deposit_value) {
    depositAmount = config.deposit_value;
  }

  return {
    subtotal,
    discount_amount: Math.round(discountAmount * 100) / 100,
    markup_amount: Math.round(markupAmount * 100) / 100,
    vat_amount: Math.round(vatAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    deposit_amount: depositAmount ? Math.round(depositAmount * 100) / 100 : null,
    balance_due: depositAmount ? Math.round((total - depositAmount) * 100) / 100 : total,
  };
}
