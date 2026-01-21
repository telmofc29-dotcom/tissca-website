import { createClient } from '@supabase/supabase-js';

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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
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
export async function getUserProfile(userId: string) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('[Supabase] Client not initialized');
  }

  // Try to fetch existing profile
  let { data: profile, error } = await client
    .from('user_profile')
    .select('*')
    .eq('userId', userId)
    .single();

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
      })
      .select()
      .single();
    
    if (createError) {
      console.error('[Profile] Failed to create default profile:', createError);
      throw createError;
    }
    
    profile = newProfile;
  } else if (error) {
    console.error('[Profile] Failed to fetch profile:', error);
    throw error;
  }

  return profile;
}
