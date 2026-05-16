import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';

// 5 sign-up attempts per 60 seconds per IP
const limiter = rateLimit({ interval: 60_000, limit: 5 });

/**
 * Create a server-side Supabase client using the anon key.
 * We use the anon key (not service role) so Supabase's own auth policies
 * apply: email confirmation flow, password strength, rate limiting, etc.
 */
function createAnonServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

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
      console.error('[signup] Turnstile failed:', turnstileResult.error);
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

    if (typeof password === 'string' && password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const supabase = createAnonServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.tissca.com';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback`,
      },
    });

    if (error) {
      const lower = error.message.toLowerCase();
      // Non-enumerating: if already registered, return success
      if (lower.includes('already registered') || lower.includes('already been registered') || lower.includes('already exists')) {
        return NextResponse.json({ success: true }, { status: 200 });
      }
      console.error('[signup] Supabase error:', error.message);
      return NextResponse.json(
        { error: error.message || 'Sign up failed.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, userId: data.user?.id },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('[signup] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
