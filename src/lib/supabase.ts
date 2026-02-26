// src/lib/supabase.ts v1.3
//
// CHANGES (v1.3):
// - PROVEN FIX: Align user_profiles reads/writes to the confirmed schema.
//   Remove non-existent columns: country, currency, plan, company_name.
// - Keep env safety + singleton behaviour unchanged.
// - Minimal targeted changes only.

import { createClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/roles';

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

    supabaseClient = createClient(env.url, env.anonKey, {
      auth: {
        // Make behaviour explicit/stable in App Router client
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[Supabase] Browser client initialized (singleton)');
    }
  }
  return supabaseClient;
}

/**
 * Re-export for backwards compatibility
 * This is the singleton instance - all components should use this
 *
 * IMPORTANT:
 * - On server it is null (never use it in server code).
 * - Shared helpers below must NOT use this directly.
 */
export const supabase = (() => {
  if (typeof window === 'undefined') {
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
    throw new Error(
      'Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** Internal helper to fail clearly if used in wrong runtime */
function requireBrowserClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('[Supabase] Browser client not initialized (missing env vars or server runtime)');
  }
  return client;
}

/**
 * Get current user session (client-side)
 */
export async function getCurrentSession() {
  const client = requireBrowserClient();

  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) throw error;
  return session;
}

/**
 * Get current user (client-side)
 */
export async function getCurrentUser() {
  const client = requireBrowserClient();

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) throw error;
  return user;
}

/**
 * Sign up new user (client-side)
 */
export async function signUp(email: string, password: string) {
  const client = requireBrowserClient();

  const { data, error } = await client.auth.signUp({
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
 * Sign in user (client-side)
 */
export async function signIn(email: string, password: string) {
  const client = requireBrowserClient();

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out user (client-side)
 */
export async function signOut() {
  const client = requireBrowserClient();

  const { error } = await client.auth.signOut();
  if (error) throw error;
}

/**
 * Password reset request (client-side)
 */
export async function resetPassword(email: string) {
  const client = requireBrowserClient();

  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password`,
  });

  if (error) throw error;
}

/**
 * Update password (client-side)
 */
export async function updatePassword(password: string) {
  const client = requireBrowserClient();

  const { error } = await client.auth.updateUser({
    password,
  });

  if (error) throw error;
}

/**
 * Get user profile from user_profiles table
 * If profile doesn't exist, creates a default one automatically
 *
 * IMPORTANT:
 * - Aligns with /api/user/me which uses user_profiles.id = auth.user.id
 * - Uses ONLY proven columns.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const client = requireBrowserClient();

  const { data: profileData, error } = await client
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  let profile = profileData as UserProfile | null;

  // If profile doesn't exist, create a default one
  if (error && (error as any).code === 'PGRST116') {
    console.log(`[Profile] Creating default profile for user ${userId}`);

    const { data: newProfile, error: createError } = await client
      .from('user_profiles')
      .insert({
        id: userId,
        email: '',
        full_name: 'New User',
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
    (profile as any).businessId = (profile as any).business_id;
  }

  return profile as UserProfile | null;
}

export interface AppProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  current_workspace_id: string | null;
  chat_public_key: string | null;
  date_of_birth: string | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get or create TISSCA profile (user_profiles table)
 * Ensures a row exists on first login
 * Uses ONLY proven columns.
 */
export async function getOrCreateAppProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string; name?: string };
}): Promise<AppProfile> {
  const client = requireBrowserClient();

  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || null;

  let { data: profile, error } = await client
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && (error as any).code === 'PGRST116') {
    const { data: createdProfile, error: createError } = await client
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        full_name: fullName,
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
 * Uses ONLY proven columns.
 */
export async function updateAppProfile(
  userId: string,
  updates: Partial<
    Pick<
      AppProfile,
      'full_name' | 'phone' | 'current_workspace_id' | 'chat_public_key' | 'date_of_birth' | 'address' | 'avatar_url'
    >
  >
): Promise<AppProfile> {
  const client = requireBrowserClient();

  const { data, error } = await (client.from('user_profiles') as any)
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