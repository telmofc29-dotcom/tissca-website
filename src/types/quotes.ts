/**
 * Quote System Types
 * Comprehensive TypeScript definitions for BUILDR's quoting engine
 * Supports materials, labour rates, variants, and quote management
 */

// ============================================================================
// MATERIAL TYPES
// ============================================================================

export interface Material {
  id: string;
  business_id: string;
  name: string;
  category: string;
  description: string | null;
  sku: string | null;
  unit: 'sqm' | 'lm' | 'each' | 'set' | 'day' | 'hour' | string;
  default_price: number;
  currency: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialInput {
  name: string;
  category: string;
  description?: string;
  sku?: string;
  unit: 'sqm' | 'lm' | 'each' | 'set' | 'day' | 'hour' | string;
  default_price: number;
  currency?: string;
}

export interface UpdateMaterialInput {
  name?: string;
  category?: string;
  description?: string | null;
  sku?: string | null;
  unit?: string;
  default_price?: number;
  currency?: string;
  is_active?: boolean;
  sort_order?: number;
}

// ============================================================================
// MATERIAL VARIANT TYPES
// ============================================================================

export interface MaterialVariant {
  id: string;
  material_id: string;
  label: string;
  description: string | null;
  sku: string | null;
  price_override: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialVariantInput {
  label: string;
  description?: string;
  sku?: string;
  price_override?: number;
}

export interface UpdateMaterialVariantInput {
  label?: string;
  description?: string | null;
  sku?: string | null;
  price_override?: number | null;
  is_active?: boolean;
  sort_order?: number;
}

// ============================================================================
// MATERIAL WITH VARIANTS (composite type)
// ============================================================================

export interface MaterialWithVariants extends Material {
  variants: MaterialVariant[];
}

// ============================================================================
// LABOUR RATE TYPES
// ============================================================================

export type RateType = 'hourly' | 'daily' | 'per_unit' | 'fixed';

export interface LabourRate {
  id: string;
  business_id: string;
  trade: string;
  description: string | null;
  rate_type: RateType;
  price: number;
  unit: string;
  currency: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLabourRateInput {
  trade: string;
  description?: string;
  rate_type: RateType;
  price: number;
  unit: string;
  currency?: string;
}

export interface UpdateLabourRateInput {
  trade?: string;
  description?: string | null;
  rate_type?: RateType;
  price?: number;
  unit?: string;
  currency?: string;
  is_active?: boolean;
  sort_order?: number;
}

// ============================================================================
// CLIENT TYPES
// ============================================================================

export interface Client {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postcode: string | null;
  country: string;
  company_name: string | null;
  vat_number: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClientInput {
  name: string;
  email?: string;
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  postcode?: string;
  country?: string;
  company_name?: string;
  vat_number?: string;
  notes?: string;
}

export interface UpdateClientInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string;
  company_name?: string | null;
  vat_number?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

// ============================================================================
// QUOTE TYPES
// ============================================================================

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
export type DiscountType = 'none' | 'percentage' | 'fixed';
export type MarkupType = 'none' | 'percentage' | 'fixed';
export type DepositType = 'none' | 'percentage' | 'fixed';

export interface Quote {
  id: string;
  business_id: string;
  client_id: string;
  quote_number: string;
  title: string | null;
  description: string | null;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  accepted_at: string | null;
  valid_from: string;
  valid_until: string | null;
  currency: string;
  vat_rate: number;
  discount_type: DiscountType;
  discount_value: number | null;
  markup_type: MarkupType;
  markup_value: number | null;
  deposit_type: DepositType;
  deposit_value: number | null;
  terms_and_conditions: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  // Phase C3: Acceptance audit trail
  accepted_by: string | null;
  acceptance_ip: string | null;
  acceptance_note: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  is_locked: boolean;
}

export interface CreateQuoteInput {
  client_id: string;
  quote_number: string;
  title?: string;
  description?: string;
  valid_until?: string;
  currency?: string;
  vat_rate?: number;
  discount_type?: DiscountType;
  discount_value?: number;
  markup_type?: MarkupType;
  markup_value?: number;
  deposit_type?: DepositType;
  deposit_value?: number;
  terms_and_conditions?: string;
  notes?: string;
}

export interface UpdateQuoteInput {
  title?: string;
  description?: string | null;
  status?: QuoteStatus;
  valid_until?: string | null;
  currency?: string;
  vat_rate?: number;
  discount_type?: DiscountType;
  discount_value?: number | null;
  markup_type?: MarkupType;
  markup_value?: number | null;
  deposit_type?: DepositType;
  deposit_value?: number | null;
  terms_and_conditions?: string | null;
  notes?: string | null;
}

// ============================================================================
// QUOTE ITEM TYPES
// ============================================================================

export type QuoteItemType = 'material' | 'labour' | 'custom';

export interface QuoteItem {
  id: string;
  quote_id: string;
  material_id: string | null;
  material_variant_id: string | null;
  labour_rate_id: string | null;
  item_type: QuoteItemType;
  custom_description: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateQuoteItemInput {
  material_id?: string;
  material_variant_id?: string;
  labour_rate_id?: string;
  item_type: QuoteItemType;
  custom_description?: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  sort_order?: number;
}

export interface UpdateQuoteItemInput {
  material_id?: string | null;
  material_variant_id?: string | null;
  labour_rate_id?: string | null;
  custom_description?: string | null;
  quantity?: number;
  unit_price?: number;
  notes?: string | null;
  sort_order?: number;
}

// ============================================================================
// QUOTE ITEM WITH DETAILS (composite type)
// ============================================================================

export interface QuoteItemWithDetails extends QuoteItem {
  material?: Material | null;
  variant?: MaterialVariant | null;
  labour_rate?: LabourRate | null;
}

// ============================================================================
// QUOTE TOTALS SNAPSHOT TYPES
// ============================================================================

export interface QuoteTotalsSnapshot {
  id: string;
  quote_id: string;
  subtotal: number;
  discount_amount: number;
  markup_amount: number;
  vat_amount: number;
  total: number;
  deposit_amount: number | null;
  created_at: string;
  notes: string | null;
}

// ============================================================================
// QUOTE TOTALS CALCULATION
// ============================================================================

export interface QuoteTotalsCalculation {
  subtotal: number;
  discount_amount: number;
  markup_amount: number;
  subtotal_after_discount_and_markup: number;
  vat_amount: number;
  total: number;
  deposit_amount: number | null;
  balance_due: number;
}

// ============================================================================
// QUOTE WITH FULL DETAILS (composite type)
// ============================================================================

export interface QuoteWithDetails extends Quote {
  client: Client;
  items: QuoteItemWithDetails[];
  totals: QuoteTotalsCalculation;
  latest_snapshot: QuoteTotalsSnapshot | null;
}

// ============================================================================
// PRICING CALCULATION TYPES
// ============================================================================

/**
 * Configuration for discount/markup/deposit calculations
 */
export interface PricingConfig {
  vat_rate: number; // e.g., 20 for 20%
  discount_type: DiscountType;
  discount_value: number | null;
  markup_type: MarkupType;
  markup_value: number | null;
  deposit_type: DepositType;
  deposit_value: number | null;
}

/**
 * Result of pricing calculation
 */
export interface PricingResult {
  subtotal: number;
  discount_amount: number;
  markup_amount: number;
  vat_amount: number;
  total: number;
  deposit_amount: number | null;
  balance_due: number;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export interface BulkCreateQuoteItemsInput {
  quote_id: string;
  items: CreateQuoteItemInput[];
}

export interface BulkUpdateQuoteItemsInput {
  items: Array<{
    id: string;
    data: UpdateQuoteItemInput;
  }>;
}

export interface BulkDeleteQuoteItemsInput {
  ids: string[];
}

// ============================================================================
// FILTERING & PAGINATION
// ============================================================================

export interface MaterialFilters {
  category?: string;
  is_active?: boolean;
  search?: string;
}

export interface LabourRateFilters {
  trade?: string;
  rate_type?: RateType;
  is_active?: boolean;
}

export interface QuoteFilters {
  status?: QuoteStatus | QuoteStatus[];
  client_id?: string;
  created_by_user_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string; // Search in quote_number, title, or client name
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

// ============================================================================
// QUOTE ACCEPTANCE & AUDIT TRAIL TYPES (Phase C3)
// ============================================================================

export interface QuoteAcceptanceSnapshot {
  id: string;
  quote_id: string;
  accepted_at: string;
  accepted_by: string; // user id
  acceptance_ip: string | null;
  items_snapshot: QuoteItem[];
  subtotal: number;
  discount_amount: number;
  markup_amount: number;
  vat_amount: number;
  total: number;
  deposit_amount: number | null;
  balance_due: number;
  acceptance_note: string | null;
  created_at: string;
}

export interface QuoteRevision {
  id: string;
  quote_id: string;
  revision_number: number;
  parent_revision_id: string | null;
  changed_by: string; // user id
  changed_at: string;
  change_reason: string | null;
  quote_data: Quote;
  items_data: QuoteItem[];
  totals_data: QuoteTotalsCalculation;
  created_at: string;
}

export interface AcceptQuoteRequest {
  acceptance_note?: string;
}

export interface RejectQuoteRequest {
  rejection_reason: string;
}

export interface CreateRevisionRequest {
  change_reason: string;
}
