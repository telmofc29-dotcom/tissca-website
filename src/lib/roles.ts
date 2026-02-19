/**
 * BUILDR Role System - Single Source of Truth
 * 
 * This module defines all role-based configuration for BUILDR.
 * BUILDR is a construction/renovation SaaS for contractors, accountants, and clients.
 * 
 * Roles:
 * - admin: System administrator (BUILDR team)
 * - staff: Contractor staff who create quotes/invoices
 * - accountant: Financial professional who reviews invoices
 * - client: End customer receiving quotes and invoices
 */

export type UserRole = 'admin' | 'staff' | 'accountant' | 'client';

/**
 * Dashboard route mapping by role.
 * Each role gets redirected to their default dashboard.
 */
export const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: '/dashboard/admin',
  accountant: '/dashboard/accountant',
  staff: '/dashboard/app',
  client: '/dashboard/client',
};

/**
 * Role display names for UI.
 * Used in headers, navigation, and role selectors.
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  admin: 'Administrator',
  staff: 'Contractor',
  accountant: 'Accountant',
  client: 'Client',
};

/**
 * Role descriptions for onboarding/documentation.
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'System administrator with full access to all features and settings',
  staff: 'Contractor who creates quotes, invoices, and manages projects',
  accountant: 'Financial professional who reviews invoices and generates reports',
  client: 'End customer who receives and reviews quotes and invoices',
};

/**
 * Subscription plans available to contractors.
 */
export type SubscriptionPlan = 'free' | 'pro' | 'team' | 'enterprise';

/**
 * Subscription status for contractor accounts.
 */
export type SubscriptionStatus = 'free' | 'trial' | 'active' | 'past_due' | 'cancelled';

/**
 * Feature availability by subscription plan.
 * Only affects contractor (staff) accounts.
 */
export interface SubscriptionFeatures {
  unlimited_quotes: boolean;
  unlimited_invoices: boolean;
  custom_branding: boolean;
  api_access: boolean;
  team_members: number;
  exports: boolean;
}

export const SUBSCRIPTION_FEATURES: Record<SubscriptionPlan, SubscriptionFeatures> = {
  free: {
    unlimited_quotes: false,
    unlimited_invoices: false,
    custom_branding: false,
    api_access: false,
    team_members: 1,
    exports: false,
  },
  pro: {
    unlimited_quotes: true,
    unlimited_invoices: true,
    custom_branding: true,
    api_access: false,
    team_members: 3,
    exports: true,
  },
  team: {
    unlimited_quotes: true,
    unlimited_invoices: true,
    custom_branding: true,
    api_access: true,
    team_members: 10,
    exports: true,
  },
  enterprise: {
    unlimited_quotes: true,
    unlimited_invoices: true,
    custom_branding: true,
    api_access: true,
    team_members: 999,
    exports: true,
  },
};

/**
 * Helper function to check if a role is a contractor (staff).
 * Contractors have business accounts and subscription plans.
 */
export function isContractor(role: UserRole): boolean {
  return role === 'staff';
}

/**
 * Helper function to check if a role can create quotes/invoices.
 */
export function canCreateQuotes(role: UserRole): boolean {
  return role === 'staff';
}

/**
 * Helper function to check if a role can review invoices.
 */
export function canReviewInvoices(role: UserRole): boolean {
  return role === 'accountant' || role === 'staff' || role === 'admin';
}

/**
 * Helper function to check if a role can access admin features.
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}
