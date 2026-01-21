import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const pathname = requestUrl.pathname;

  // Protected paths that require authentication
  const protectedPaths = [
    '/dashboard',
    '/account',
    '/admin',
  ];

  // Check if path is protected
  const isProtectedPath = protectedPaths.some(
    (path) => pathname.startsWith(path)
  );

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
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Get the current user (uses session from cookies)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (user && (pathname === '/sign-in' || pathname === '/sign-up')) {
    console.log(`[Middleware] User ${user.email} tried to access ${pathname}, redirecting to /dashboard`);
    return NextResponse.redirect(new URL('/dashboard/app', request.url));
  }

  // If user is NOT authenticated and accessing protected routes, redirect to sign-in
  if (!user && isProtectedPath) {
    console.log(`[Middleware] Unauthenticated user tried to access protected route: ${pathname}, redirecting to /sign-in`);
    return NextResponse.redirect(new URL('/sign-in', request.url));
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
