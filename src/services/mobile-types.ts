/**
 * Mobile SDK Types
 * ================
 * Shared TypeScript interfaces for React Native mobile apps
 * These types mirror the backend services and are JSON-serializable
 * for offline storage and network synchronization
 */

// ============================================================================
// API REQUEST/RESPONSE ENVELOPES
// ============================================================================

/**
 * Standard API response wrapper for all mobile endpoints
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

/**
 * Error response structure
 */
export interface ApiError {
  error: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, string[]>;
}

// ============================================================================
// CALCULATION TYPES
// ============================================================================

/**
 * Input for calculation endpoints
 * POST /api/mobile/calculate
 */
export interface CalculationRequest {
  type: 'area-based' | 'kitchen' | 'bathroom' | 'wardrobe';
  input: {
    area?: number; // Square meters
    trade: string;
    mode: 'budget' | 'standard' | 'premium';
    difficulty?: 'easy' | 'standard' | 'hard';
    region?: string;
    // Kitchen specific
    cabinetStyle?: string;
    applianceCount?: number;
    // Bathroom specific
    suiteMeter?: number;
    fixturesCount?: number;
    // Wardrobe specific
    runningMeters?: number;
    complexity?: 'simple' | 'standard' | 'complex';
  };
}

/**
 * Output from calculation endpoints
 */
export interface CalculationResponse {
  estimatedDays: number;
  labourCost: number;
  breakdown: {
    baseRate: number;
    difficultyMultiplier: number;
    regionMultiplier: number;
    finalRate: number;
  };
  timestamp: string;
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

/**
 * Quote/Invoice line item
 */
export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number; // quantity × unitPrice
}

/**
 * Business info for documents
 */
export interface BusinessInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  vatNumber?: string;
  companyNumber?: string;
  website?: string;
}

/**
 * Client info for documents
 */
export interface ClientInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
}

/**
 * Complete document (Quote or Invoice)
 */
export interface Document {
  id: string;
  number: string; // Q-000001 or INV-000001
  type: 'quote' | 'invoice';
  date: string; // ISO date
  validUntil?: string; // ISO date (quotes only)
  dueDate?: string; // ISO date (invoices only)
  business: BusinessInfo;
  client: ClientInfo;
  lineItems: LineItem[];
  subtotal: number;
  vatRate: number;
  vat: number;
  total: number;
  notes?: string;
  terms?: string;
  paymentTerms?: number; // days (invoices only)
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'paid';
}

/**
 * Quote creation request
 * POST /api/mobile/quotes
 */
export interface CreateQuoteRequest {
  businessInfo: BusinessInfo;
  clientInfo?: ClientInfo;
  lineItems: LineItem[];
  vatRate?: number; // Default 20
  notes?: string;
  terms?: string;
  paymentTerms?: number;
}

/**
 * Quote creation response
 */
export interface CreateQuoteResponse {
  success: boolean;
  quote: {
    id: string;
    number: string;
    date: string;
    validUntil: string;
    total: number;
    clientName: string;
  };
}

/**
 * Invoice creation request
 * POST /api/mobile/invoices
 */
export interface CreateInvoiceRequest {
  businessInfo: BusinessInfo;
  clientInfo: ClientInfo; // Required for invoices
  lineItems: LineItem[];
  vatRate?: number; // Default 20
  notes?: string;
  terms?: string;
  paymentTerms?: number; // Default 30
}

/**
 * Invoice creation response
 */
export interface CreateInvoiceResponse {
  success: boolean;
  invoice: {
    id: string;
    number: string;
    date: string;
    dueDate: string;
    total: number;
    clientName: string;
  };
}

// ============================================================================
// PROFILE TYPES
// ============================================================================

/**
 * Complete business profile
 */
export interface BusinessProfile {
  // Identity
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  website?: string;

  // Tax & Company
  vatNumber?: string;
  companyNumber?: string;
  taxYear?: number;

  // Defaults for documents
  defaultPricingMode: 'budget' | 'standard' | 'premium';
  defaultRegion: string;
  defaultVatRate: number; // Usually 20
  defaultPaymentTerms: number; // Usually 30 (days)
  defaultCurrency: string; // Usually GBP

  // Bank details (optional, for invoices)
  accountHolder?: string;
  accountNumber?: string;
  sortCode?: string;
  iban?: string;
  bic?: string;

  // Document numbering
  invoicePrefix: string; // Usually "INV"
  quotePrefix: string; // Usually "Q"
  nextInvoiceNumber: number;
  nextQuoteNumber: number;

  // Metadata
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

/**
 * Profile fetch response
 * GET /api/mobile/profiles
 */
export interface GetProfileResponse {
  success: boolean;
  profile: BusinessProfile;
}

/**
 * Profile update request
 * PUT /api/mobile/profiles
 */
export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  website?: string;
  vatNumber?: string;
  companyNumber?: string;
  defaultPricingMode?: 'budget' | 'standard' | 'premium';
  defaultRegion?: string;
  accountHolder?: string;
  accountNumber?: string;
  sortCode?: string;
  iban?: string;
  bic?: string;
}

// ============================================================================
// PRICING DATA TYPES
// ============================================================================

/**
 * Trade definition
 */
export interface Trade {
  id: string;
  name: string;
  unit: 'sqm' | 'units' | 'linear-m' | 'item';
  baseProductivity: {
    budget: number;
    standard: number;
    premium: number;
  };
  dailyRate: {
    budget: number;
    standard: number;
    premium: number;
  };
  difficultyMultipliers: {
    easy: number;
    standard: number;
    hard: number;
  };
}

/**
 * Pricing mode definition
 */
export interface PricingMode {
  id: 'budget' | 'standard' | 'premium';
  name: string;
  multiplier: number;
  description: string;
}

/**
 * Region multiplier definition
 */
export interface Region {
  id: string;
  name: string;
  multiplier: number;
}

/**
 * Pricing data response
 * GET /api/mobile/pricing/trades
 * GET /api/mobile/pricing/modes
 * GET /api/mobile/pricing/regions
 */
export interface PricingDataResponse {
  success: boolean;
  trades?: Trade[];
  modes?: PricingMode[];
  regions?: Region[];
}

/**
 * Single trade details response
 * GET /api/mobile/pricing/trade?tradeId=xxx
 */
export interface TradeDetailsResponse {
  success: boolean;
  trade: Trade;
}

// ============================================================================
// OFFLINE SYNC TYPES
// ============================================================================

/**
 * Offline queue item for deferred sync
 */
export interface OfflineQueueItem {
  id: string;
  timestamp: number;
  method: 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  body: Record<string, unknown>;
  retryCount: number;
  lastError?: string;
}

/**
 * Sync result after going back online
 */
export interface SyncResult {
  success: boolean;
  synced: number; // Items synced
  failed: number; // Items that failed
  errors: Array<{
    id: string;
    error: string;
  }>;
}

// ============================================================================
// FORM STATE TYPES
// ============================================================================

/**
 * Quote/Invoice form state (for mobile)
 */
export interface DocumentFormState {
  businessInfo: Partial<BusinessInfo>;
  clientInfo: Partial<ClientInfo>;
  lineItems: LineItem[];
  notes: string;
  terms: string;
  vatRate: number;
  paymentTerms: number;
  isDraft: boolean;
  lastSavedAt?: string;
}

/**
 * Calculation form state (for mobile)
 */
export interface CalculationFormState {
  type: 'area-based' | 'kitchen' | 'bathroom' | 'wardrobe';
  area?: number;
  trade: string;
  mode: 'budget' | 'standard' | 'premium';
  difficulty: 'easy' | 'standard' | 'hard';
  region: string;
  result?: CalculationResponse;
  isCalculating: boolean;
}

// ============================================================================
// AUTH TYPES (Placeholder for future)
// ============================================================================

/**
 * Auth token response (for future API authentication)
 */
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * User session (for future)
 */
export interface UserSession {
  userId: string;
  email: string;
  profile: BusinessProfile;
  token: AuthToken;
}
