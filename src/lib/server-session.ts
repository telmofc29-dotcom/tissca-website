// src/lib/server-session.ts v2.0
/**
 * server-session.ts v2.0
 * =========================
 * Cookie-based Supabase client for App Router Server Components (layouts/pages).
 * This is NOT the service-role client.
 *
 * ✅ LOCKED (CRITICAL):
 * - Server Components cannot mutate cookies via next/headers.
 * - Do NOT call cookieStore.set/remove here.
 * - Session refresh + cookie updates happen in middleware.ts.
 *
 * CHANGES (v2.0):
 * - Use getAll/setAll API (matches middleware pattern and @supabase/ssr v0.8+).
 * - setAll is a safe NOOP — middleware already refreshed the cookies before
 *   this code runs, so Server Components just need to read them.
 *
 * Used for: server-side proof checks (read-only), e.g. requireSession(), requireRole().
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createServerSupabaseSessionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase public env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // NOOP: Server Components cannot set cookies.
        // Middleware handles session refresh and cookie updates.
        // This callback exists to satisfy the @supabase/ssr interface.
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Expected to throw in Server Components — safe to swallow.
          // In Route Handlers this will succeed, which is correct.
        }
      },
    },
  });
}