/**
 * middleware.ts v1.0.1 (Auth Guards + Verification Landing Safe-Path)
 * ===================================================================
 * ✅ NOTES (LOCKED):
 * - Keep middleware behaviour the same unless a specific UX/flow requires change.
 * - Protected paths must remain protected.
 * - Public pages must remain accessible without redirects or auth loops.
 *
 * WHY v1.0.1:
 * - Ensure email verification landing page is ALWAYS accessible:
 *   /auth/verified must never be blocked or redirected.
 * - Keep existing behaviour:
 *   - Authenticated users should not access sign-in/sign-up/login/register pages.
 *   - Unauthenticated users should be redirected away from protected routes.
 *
 * IMPORTANT:
 * - /auth/verified is a public, hosted page used after Supabase verification.
 * - Some devices/browsers may hit /auth/verified without a session; this must render.
 *
 * VERSION HISTORY:
 * - v1.0.0: Initial middleware (as provided)
 * - v1.0.1 (2026-02-04): Add explicit public allow-list for /auth/verified (no behaviour change elsewhere)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const pathname = requestUrl.pathname;

  // Public allow-list (must NEVER be redirected by auth rules)
  // NOTE (LOCKED): /auth/verified is required to prevent "black screen" after email verification.
  const alwaysPublicPaths = ['/auth/verified'];

  // Protected paths that require authentication
  const protectedPaths = ['/dashboard', '/account', '/admin'];

  // Check if path is protected
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  // Create response first
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client with SSR helper to properly handle cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh the session if it exists
  // This updates the cookie timestamps and ensures valid session
  await supabase.auth.getSession();

  // Get the current user (uses session from cookies)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ✅ Always allow public verification landing page (no redirects, no auth checks)
  if (alwaysPublicPaths.includes(pathname)) {
    return response;
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (
    user &&
    (pathname === '/sign-in' ||
      pathname === '/sign-up' ||
      pathname === '/login' ||
      pathname === '/register')
  ) {
    console.log(
      `[Middleware] User ${user.email} tried to access ${pathname}, redirecting to /dashboard`
    );
    return NextResponse.redirect(new URL('/dashboard/app', request.url));
  }

  // If user is NOT authenticated and accessing protected routes, redirect to sign-in
  if (!user && isProtectedPath) {
    console.log(
      `[Middleware] Unauthenticated user tried to access protected route: ${pathname}, redirecting to /login`
    );
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Return response with updated cookies
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
};
