// src/app/api/auth/reset-password/route.ts
//
// PURPOSE:
// - Accept POST { email } and trigger Supabase password reset email.
// - The email's link redirects to /auth/reset (static page in public/).
// - Fail closed: always return 200 (no email enumeration).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTurnstile } from '@/lib/turnstile';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// 5 requests per 60 seconds per IP
const limiter = rateLimit({ interval: 60_000, limit: 5 });

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = getClientIp(request);
    if (!limiter.check(ip)) {
      // Still 200 to avoid enumeration via timing / status codes
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const { email, turnstileToken } = await request.json();

    // Verify Turnstile token server-side
    const turnstileResult = await verifyTurnstile(turnstileToken, ip);
    if (!turnstileResult.success) {
      console.error('[reset-password] Turnstile failed:', turnstileResult.error);
      // Return 200 to keep non-enumerating but log the abuse
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!email || typeof email !== 'string') {
      // Still return 200 to avoid leaking whether an email exists
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      console.error('[reset-password] Missing Supabase env vars');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || 'https://www.tissca.com';

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${baseUrl}/auth/reset`,
      }
    );

    if (error) {
      // Log server-side but don't leak to client
      console.error('[reset-password] Supabase error:', error.message);
    }

    // Always 200 — no email enumeration
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error('[reset-password] Unexpected error:', err);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
