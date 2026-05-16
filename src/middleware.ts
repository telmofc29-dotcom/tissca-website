/**
 * middleware.ts v2.1 — Supabase SSR session refresh + auth guards
 * =================================================================
 * PURPOSE:
 *   1. Refresh Supabase session cookies on EVERY matched request.
 *      This keeps the httpOnly session cookies in sync with Supabase Auth
 *      so that SSR server components (requireSession, requirePlatformStaff)
 *      always read a valid session.
 *   2. Redirect unauthenticated users away from protected pages.
 *   3. Redirect authenticated users away from sign-in/sign-up pages.
 *
 * WHY v2.1:
 *   v2.0 had NO timeout on the auth.getUser() call. If the Supabase API
 *   responds slowly (DNS, cold start, latency), the Edge middleware exceeds
 *   Vercel's execution limit (1.5s Hobby / 30s Pro) → 504 MIDDLEWARE_INVOCATION_TIMEOUT.
 *   v2.1 races the auth call against a 1200ms deadline. On timeout the user
 *   is treated as unauthenticated — protected pages redirect to /sign-in,
 *   public pages render normally. Next request will retry with warm cache.
 *
 * ARCHITECTURE:
 *   TISSCA has two auth paths:
 *   - Cookie-based: SSR layouts read cookies via server-session.ts
 *     (requireSession, requirePlatformStaff). Middleware refreshes these.
 *   - Bearer token: API routes extract token from Authorization header
 *     (resolveUserFromToken). Middleware does NOT interfere with these.
 *
 *   API routes (/api/*) are EXCLUDED from the matcher so middleware never
 *   adds latency or cookie noise to Bearer-token-authenticated endpoints.
 *
 * COOKIE FLOW:
 *   1. Request arrives → middleware reads cookies from request
 *   2. createServerClient calls Supabase Auth with those cookies
 *   3. auth.getUser() validates + refreshes the session if needed
 *   4. Updated cookies are written to the response via setAll()
 *   5. Updated cookies are also written to the request (for downstream
 *      Server Components that read cookies() within the same request)
 *
 * PUBLIC ALLOW-LIST:
 *   /auth/verified must always render without redirects (post-verification landing).
 *
 * VERSION HISTORY:
 *   v1.0.0: Initial middleware
 *   v1.0.1: Add /auth/verified to public allow-list
 *   v1.0.2: Protect /app/* routes (disabled shortly after)
 *   v2.0.0: Re-enabled with single getUser() call, API routes excluded from matcher
 *   v2.1.0: Add 1200ms timeout to getUser() to prevent MIDDLEWARE_INVOCATION_TIMEOUT
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// ─── Path rules ─────────────────────────────────────────────────────────────

/** Paths that must NEVER be redirected (render for everyone, always). */
const ALWAYS_PUBLIC: string[] = ['/auth/verified', '/auth/callback'];

/** Path prefixes that require authentication. Unauthenticated users → /sign-in. */
const PROTECTED_PREFIXES: string[] = ['/app', '/dashboard', '/account', '/admin'];

/** Exact auth page paths. Authenticated users → /dashboard. */
const AUTH_PAGES: string[] = ['/sign-in', '/sign-up', '/register', '/login'];

/**
 * Maximum time (ms) to wait for Supabase auth.getUser() in middleware.
 * Must be well under Vercel Edge limit (1.5s Hobby / 30s Pro).
 * On timeout, user is treated as unauthenticated (safe fail-open for
 * public pages, redirect to sign-in for protected pages).
 */
const AUTH_TIMEOUT_MS = 1200;

// ─── Middleware ──────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Build response shell — we'll attach updated cookies to this.
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // 2) Create Supabase SSR client wired to request + response cookies.
  //    The setAll callback writes refreshed cookies to BOTH the response
  //    (so the browser receives them) AND the request (so downstream
  //    Server Components reading cookies() see the fresh values).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write to request so Server Components see fresh cookies
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // Re-create response with updated request headers
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          // Write to response so browser receives fresh cookies
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 3) Refresh session + verify user in a single call, WITH TIMEOUT.
  //    This is the ONLY Supabase auth call in middleware.
  //    If the session's access_token is expired but refresh_token is valid,
  //    Supabase will transparently refresh it and the setAll callback above
  //    writes the new cookies.
  //
  //    SAFETY: Race against a timeout so the middleware never exceeds
  //    Vercel's Edge execution limit. On timeout, user = null (treated
  //    as unauthenticated). The next request will retry auth normally.
  let user = null;
  try {
    const authResult = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), AUTH_TIMEOUT_MS)),
    ]);
    user = authResult?.data?.user ?? null;
  } catch {
    // Auth call failed — treat as unauthenticated
  }

  // 4) Public allow-list — always pass through with fresh cookies
  if (ALWAYS_PUBLIC.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // 5) Authenticated user on auth pages → redirect to dashboard
  if (user && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 6) Unauthenticated user on protected pages → redirect to sign-in
  if (!user && PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // 7) All other pages — return response with refreshed cookies
  return response;
}

// ─── Matcher ─────────────────────────────────────────────────────────────────
// Exclude: static files, images, favicon, AND all API routes.
// API routes use Bearer token auth — middleware cookie refresh is unnecessary
// and would add latency to every API call.

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)|api/).*)',
  ],
};
