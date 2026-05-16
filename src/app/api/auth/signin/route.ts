import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';

// 10 sign-in attempts per 60 seconds per IP
const limiter = rateLimit({ interval: 60_000, limit: 10 });

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!limiter.check(ip)) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const { email, password, turnstileToken } = await req.json();

    // --- Turnstile server-side verification ---
    const turnstileResult = await verifyTurnstile(turnstileToken, ip);
    if (!turnstileResult.success) {
      console.error('[signin] Turnstile failed:', turnstileResult.error);
      return NextResponse.json(
        { error: 'Security verification failed. Please try again.' },
        { status: 403 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    // Use anon client for auth (honours Supabase's own rate-limits / policies)
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Sign in failed.' },
        { status: 401 }
      );
    }

    if (!data.user || !data.session) {
      return NextResponse.json(
        { error: 'Sign in failed.' },
        { status: 401 }
      );
    }

    // Set session cookies so middleware sees the session
    const response = NextResponse.json(
      {
        success: true,
        user: data.user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
      { status: 200 }
    );

    const ssrClient = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() { return []; },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    await ssrClient.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    return response;
  } catch (error: unknown) {
    console.error('[signin] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
