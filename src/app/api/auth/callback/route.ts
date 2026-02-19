import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/callback
 * 
 * This route handles setting session cookies after client-side authentication.
 * When a user signs in or signs up on the client, this endpoint:
 * 1. Reads the session from the Authorization header
 * 2. Creates a server Supabase client with cookie handlers
 * 3. Exchanges the session to set secure, httpOnly cookies
 * 4. Returns success so client can redirect
 * 
 * This enables middleware to read the session from cookies.
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken, refreshToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 400 }
      );
    }

    // Create response object to collect cookies
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    // Create Supabase server client with cookie handlers
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // No need to get existing cookies for this route
            return [];
          },
          setAll(cookiesToSet) {
            // Set all cookies in response
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Set the session using the access token
    // This makes Supabase create the proper cookies
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });

    return response;
  } catch (error: any) {
    console.error('[AuthCallback] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set session' },
      { status: 500 }
    );
  }
}
