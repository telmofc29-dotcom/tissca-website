/**
 * @deprecated Import from src/lib/roles.ts instead
 * This file is kept for backward compatibility.
 * All role definitions have moved to src/lib/roles.ts (single source of truth).
 */

import { UserRole as LibUserRole } from '@/lib/roles';

export type UserRole = LibUserRole;
export type SubscriptionStatus = 'free' | 'trial' | 'active' | 'past_due' | 'cancelled';
export type SubscriptionPlan = 'free' | 'pro' | 'team' | 'enterprise';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  business_id: string | null;
  businessId?: string | null; // Alias for snake_case version
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  name: string;
  owner_user_id: string;
  subscription_status: SubscriptionStatus;
  plan: SubscriptionPlan;
  logo_url: string | null;
  website: string | null;
  industry: string | null;
  employees_count: number;
  created_at: string;
  updated_at: string;
}

export interface StaffMember {
  id: string;
  business_id: string;
  user_id: string;
  role: string;
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface MaterialsCatalog {
  id: string;
  business_id: string;
  category: string;
  name: string;
  unit: string;
  default_price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LabourRate {
  id: string;
  business_id: string;
  trade: string;
  rate_type: string;
  price: number;
  unit: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Re-export from lib/roles for backward compatibility
export { ROLE_DASHBOARDS } from '@/lib/roles';

// Re-export from lib/roles for backward compatibility
export { SUBSCRIPTION_FEATURES } from '@/lib/roles';
