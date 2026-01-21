/**
 * Authentication & Authorization Types
 * Core type definitions for auth system
 */

/**
 * Subscription tier
 */
export type SubscriptionTier = 'free' | 'premium';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'unpaid';

/**
 * Extended user object combining Supabase auth + database profile
 */
export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    name?: string;
  };
}

/**
 * User with subscription and profile
 */
export interface UserWithSubscription {
  id: string;
  email: string;
  name?: string;
  subscription: {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    currentPeriodEnd?: Date;
  };
  profile?: {
    country: string;
    currency: string;
    tradeType?: string;
    businessName?: string;
    dailyRate?: number;
  };
}

/**
 * Access control context
 */
export interface AccessContext {
  isLoggedIn: boolean;
  user?: AuthUser;
  tier: SubscriptionTier;
  canAccessFeature: (feature: FeatureKey) => boolean;
}

/**
 * Feature access mapping
 */
export type FeatureKey =
  | 'view_public_content'
  | 'save_calculator_results'
  | 'generate_quotes'
  | 'generate_invoices'
  | 'upload_business_logo'
  | 'remove_watermark'
  | 'access_mobile_app'
  | 'save_clients'
  | 'access_admin_dashboard'
  | 'view_no_ads';

/**
 * Feature availability by tier
 */
export const FEATURE_ACCESS: Record<SubscriptionTier, FeatureKey[]> = {
  free: [
    'view_public_content',
    'save_calculator_results',
    'generate_quotes',
    'generate_invoices',
  ],
  premium: [
    'view_public_content',
    'save_calculator_results',
    'generate_quotes',
    'generate_invoices',
    'upload_business_logo',
    'remove_watermark',
    'access_mobile_app',
    'save_clients',
    'view_no_ads',
  ],
};

/**
 * Check if user can access feature
 */
export function canAccessFeature(tier: SubscriptionTier, feature: FeatureKey): boolean {
  return FEATURE_ACCESS[tier]?.includes(feature) ?? false;
}

/**
 * Route protection level
 */
export type RouteProtection = 'public' | 'authenticated' | 'premium' | 'admin';

/**
 * Route metadata
 */
export interface RouteMetadata {
  protection: RouteProtection;
  requiresAuth?: boolean;
  requiresPremium?: boolean;
  requiresAdmin?: boolean;
}

/**
 * Auth error response
 */
export interface AuthError {
  code: string;
  message: string;
  status?: number;
}

/**
 * Auth success response
 */
export interface AuthSuccess<T = unknown> {
  success: true;
  data: T;
}

/**
 * Auth failure response
 */
export interface AuthFailure {
  success: false;
  error: AuthError;
}

/**
 * Auth response (either success or failure)
 */
export type AuthResponse<T = unknown> = AuthSuccess<T> | AuthFailure;
