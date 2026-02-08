import { createClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/roles';
import type { PlanTier } from '@/lib/plans';

/**
 * Get Supabase environment variables at runtime
 * Returns null if any required public vars are missing
 * This allows builds to succeed even if env vars aren't set
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
      console.error(
        '[Supabase] Missing environment variables. Check your .env.local file.\n' +
        `  NEXT_PUBLIC_SUPABASE_URL: ${url ? '✓' : '✗'}\n` +
        `  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? '✓' : '✗'}`
      );
    }
    return null;
  }

  // Log the hostname in development (NOT the keys)
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
    try {
      const urlObj = new URL(url);
      console.log(`[Supabase] Initialized with hostname: ${urlObj.hostname}`);
    } catch (e) {
      console.error('[Supabase] Invalid URL format:', url);
    }
  }

  return { url, anonKey };
}

/**
 * Get server-side Supabase environment variables
 * Returns null if service role key is missing
 */
export function getServerSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

/**
 * Browser/Client-side Supabase client (Singleton)
 * Use for all client-side auth & data operations in React components
 * Ensures exactly ONE Supabase client instance in browser
 * Note: May be null if env vars aren't configured
 */
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  // Only create once
  if (!supabaseClient) {
    const env = getSupabaseEnv();
    if (!env) {
      console.warn('[Supabase] Client not initialized - missing env vars');
      return null;
    }
    supabaseClient = createClient(env.url, env.anonKey);
    console.log('[Supabase] Browser client initialized (singleton)');
  }
  return supabaseClient;
}

/**
 * Re-export for backwards compatibility
 * This is the singleton instance - all components should use this
 */
export const supabase = (() => {
  if (typeof window === 'undefined') {
    // Server-side: return null (use createServerSupabaseClient() instead)
    return null as any;
  }
  return getSupabaseClient();
})();

/**
 * Server-side Supabase client (for API routes)
 * Requires SUPABASE_SERVICE_ROLE_KEY (never expose publicly)
 * Returns a client configured with service role credentials
 */
export function createServerSupabaseClient() {
  const env = getServerSupabaseEnv();
  
  if (!env) {
    throw new Error('Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(env.url, env.serviceRoleKey);
}

/**
 * Get current user session (client-side)
 */
export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  
  if (error) throw error;
  return session;
}

/**
 * Get current user (client-side)
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  
  if (error) throw error;
  return user;
}

/**
 * Sign up new user
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verified`,
    },
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign in user
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign out user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Password reset request
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password`,
  });
  
  if (error) throw error;
}

/**
 * Update password with token
 */
export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({
    password,
  });
  
  if (error) throw error;
}

/**
 * Get user profile from user_profile table
 * If profile doesn't exist, creates a default one automatically
 * Resolves the 404 error on dashboard load
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('[Supabase] Client not initialized');
  }

  // Try to fetch existing profile
  const { data: profileData, error } = await client
    .from('user_profile')
    .select('*')
    .eq('userId', userId)
    .single();
  let profile = profileData as UserProfile | null;

  // If profile doesn't exist, create a default one
  if (error && error.code === 'PGRST116') {
    console.log(`[Profile] Creating default profile for user ${userId}`);
    
    const { data: newProfile, error: createError } = await client
      .from('user_profile')
      .insert({
        userId,
        displayName: 'New User',
        country: 'GB',
        currency: 'GBP',
        units: 'metric',
      } as any)
      .select()
      .single();
    
    if (createError) {
      console.error('[Profile] Failed to create default profile:', createError);
      throw createError;
    }
    
    profile = newProfile as UserProfile;
  } else if (error) {
    console.error('[Profile] Failed to fetch profile:', error);
    throw error;
  }

  // Add alias for backward compatibility
  if (profile) {
    (profile as any).businessId = profile.business_id;
  }

  return profile as UserProfile | null;
}

export interface AppProfile {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  plan: PlanTier;
  created_at: string;
  updated_at: string;
}

/**
 * Get or create TISSCA profile (profiles table)
 * Ensures a row exists on first login
 */
export async function getOrCreateAppProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string; name?: string };
}): Promise<AppProfile> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('[Supabase] Client not initialized');
  }

  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null;

  let { data: profile, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    const { data: createdProfile, error: createError } = await client
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        full_name: fullName,
        plan: 'free',
      } as any)
      .select('*')
      .single();

    if (createError || !createdProfile) {
      console.error('[Profile] Failed to create profile:', createError);
      throw createError || new Error('Failed to create profile');
    }

    profile = createdProfile;
  } else if (error) {
    console.error('[Profile] Failed to fetch profile:', error);
    throw error;
  }

  if (!profile) {
    throw new Error('Profile not found');
  }

  return profile as AppProfile;
}

/**
 * Update TISSCA profile fields
 */
export async function updateAppProfile(
  userId: string,
  updates: Partial<Pick<AppProfile, 'full_name' | 'company_name' | 'phone' | 'plan'>>
): Promise<AppProfile> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('[Supabase] Client not initialized');
  }

  const { data, error } = await (client.from('profiles') as any)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    console.error('[Profile] Failed to update profile:', error);
    throw error || new Error('Failed to update profile');
  }

  return data as AppProfile;
}
