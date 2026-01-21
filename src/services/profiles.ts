/**
 * Shared Profile Services
 * ========================
 * Business profile, VAT, bank details, settings
 * Used by: Web UI, Mobile Apps, Admin, API
 *
 * Single source of truth for user preferences
 */

export interface BusinessProfile {
  id: string; // UUID or user ID
  name: string;
  email: string;
  phone: string;
  website?: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  vatNumber?: string;
  companyNumber?: string;
  taxYear?: string;
  defaultPricingMode: 'budget' | 'standard' | 'premium';
  defaultRegion?: string;
  defaultVatRate: number;
  defaultPaymentTerms: number;
  defaultCurrency: string;
  bankDetails?: {
    accountHolder?: string;
    accountNumber?: string;
    sortCode?: string;
    iban?: string;
    bic?: string;
  };
  invoicePrefix: string;
  quotePrefix: string;
  nextInvoiceNumber: number;
  nextQuoteNumber: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a new business profile
 */
export function createBusinessProfile(data: Partial<BusinessProfile>): BusinessProfile {
  const now = new Date().toISOString();

  return {
    id: data.id || generateId(),
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    website: data.website,
    address: data.address || '',
    city: data.city || '',
    postcode: data.postcode || '',
    country: data.country || 'United Kingdom',
    vatNumber: data.vatNumber,
    companyNumber: data.companyNumber,
    taxYear: data.taxYear,
    defaultPricingMode: data.defaultPricingMode || 'standard',
    defaultRegion: data.defaultRegion,
    defaultVatRate: data.defaultVatRate ?? 20,
    defaultPaymentTerms: data.defaultPaymentTerms ?? 30,
    defaultCurrency: data.defaultCurrency || 'GBP',
    bankDetails: data.bankDetails,
    invoicePrefix: data.invoicePrefix || 'INV',
    quotePrefix: data.quotePrefix || 'Q',
    nextInvoiceNumber: data.nextInvoiceNumber || 1,
    nextQuoteNumber: data.nextQuoteNumber || 1,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Validate business profile
 */
export function validateBusinessProfile(profile: Partial<BusinessProfile>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!profile.name) errors.push('Business name is required');
  if (!profile.email) errors.push('Email is required');
  if (!profile.phone) errors.push('Phone is required');
  if (!profile.address) errors.push('Address is required');
  if (!profile.city) errors.push('City is required');
  if (!profile.postcode) errors.push('Postcode is required');

  // Email validation
  if (profile.email && !isValidEmail(profile.email)) {
    errors.push('Invalid email address');
  }

  // VAT number validation (UK format)
  if (profile.vatNumber && !isValidUKVATNumber(profile.vatNumber)) {
    errors.push('Invalid UK VAT number format');
  }

  // Company number validation (UK format)
  if (profile.companyNumber && !isValidUKCompanyNumber(profile.companyNumber)) {
    errors.push('Invalid UK company number format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Update business profile
 */
export function updateBusinessProfile(
  current: BusinessProfile,
  updates: Partial<BusinessProfile>
): BusinessProfile {
  return {
    ...current,
    ...updates,
    id: current.id, // Never allow ID changes
    createdAt: current.createdAt, // Never allow creation date changes
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Get display name for profile
 */
export function getProfileDisplayName(profile: BusinessProfile): string {
  return profile.name || 'Your Business';
}

/**
 * Check if profile is complete enough for invoicing
 */
export function isProfileComplete(profile: BusinessProfile): boolean {
  return !!(
    profile.name &&
    profile.email &&
    profile.phone &&
    profile.address &&
    profile.city &&
    profile.postcode
  );
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `bp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * UK VAT Number validation (GB + 9 digits)
 */
function isValidUKVATNumber(vat: string): boolean {
  const vatRegex = /^GB\d{9}$/;
  return vatRegex.test(vat.toUpperCase());
}

/**
 * UK Company Number validation (8 digits)
 */
function isValidUKCompanyNumber(companyNumber: string): boolean {
  const companyRegex = /^\d{8}$/;
  return companyRegex.test(companyNumber);
}

/**
 * Get next quote number and increment counter
 */
export function getNextQuoteNumber(profile: BusinessProfile): {
  number: string;
  nextCounter: number;
} {
  const nextCounter = profile.nextQuoteNumber + 1;
  const number = `${profile.quotePrefix}-${String(profile.nextQuoteNumber).padStart(6, '0')}`;
  return { number, nextCounter };
}

/**
 * Get next invoice number and increment counter
 */
export function getNextInvoiceNumber(profile: BusinessProfile): {
  number: string;
  nextCounter: number;
} {
  const nextCounter = profile.nextInvoiceNumber + 1;
  const number = `${profile.invoicePrefix}-${String(profile.nextInvoiceNumber).padStart(6, '0')}`;
  return { number, nextCounter };
}

/**
 * Serialize profile for API/storage
 */
export function serializeProfile(profile: BusinessProfile): string {
  return JSON.stringify(profile);
}

/**
 * Deserialize profile from API/storage
 */
export function deserializeProfile(data: string): BusinessProfile {
  return JSON.parse(data) as BusinessProfile;
}
