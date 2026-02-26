// src/lib/server-session.ts v1.0.1
/**
 * server-session.ts v1.0.1
 * =========================
 * Cookie-based Supabase client for App Router Server Components (layouts/pages).
 * This is NOT the service-role client.
 *
 * ✅ LOCKED (CRITICAL):
 * - Server Components cannot mutate cookies via next/headers.
 * - Do NOT call cookieStore.set/remove here.
 * - Session refresh + cookie updates must happen in middleware.ts or Route Handlers.
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
      // READ-ONLY cookie access
      get(name: string) {
        return cookieStore.get(name)?.value;
      },

      // NOOP: Next.js Server Components cannot set cookies.
      // Cookie updates are handled in middleware or route handlers.
      set() {
        // Intentionally disabled (LOCKED)
      },

      // NOOP: Next.js Server Components cannot remove cookies.
      // Cookie updates are handled in middleware or route handlers.
      remove() {
        // Intentionally disabled (LOCKED)
      },
    },
  });
}