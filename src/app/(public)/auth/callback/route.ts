/**
 * GET /auth/callback — Server-side Supabase email-verification handler
 * =====================================================================
 * PURPOSE:
 *   Supabase-recommended pattern for Next.js App Router.
 *   Handles redirects from Supabase email links (signup confirmation,
 *   password recovery, magic link, invite, email change) and exchanges
 *   the code/token for a real server-side session WITH HTTP-only cookies.
 *
 * BUSINESS RULE:
 *   - Every verification email redirect MUST land here first.
 *   - emailRedirectTo in signup/recovery/invite → /auth/callback.
 *   - Only after server-side token exchange + cookie-setting do we redirect
 *     to /auth/verified with ?verified=1 (success) or ?error=... (failure).
 *   - This is what actually flips "Confirmed at" in Supabase — NOT the
 *     client-side verified page.
 *
 * WHY:
 *   The previous flow had emailRedirectTo → /auth/verified, which attempted
 *   verification CLIENT-SIDE with a bare createClient(). That failed because:
 *   (a) PKCE code exchange needs a code_verifier stored during signup, which
 *       the browser never had (signup ran on the server API route).
 *   (b) Even when verifyOtp() succeeded for token_hash, the session only
 *       landed in browser memory — no HTTP-only cookies were set, so
 *       middleware/SSR still saw the user as unconfirmed.
 *   Result: "Confirmation sent at" filled, "Confirmed at" EMPTY.
 *
 * FLOW:
 *   1. User clicks email link → Supabase /auth/v1/verify endpoint
 *   2. Supabase verifies the token server-side → redirects here with
 *      ?code=AUTH_CODE (PKCE) or ?token_hash=...&type=... (non-PKCE)
 *   3. This route creates a Supabase SSR client with cookie handlers,
 *      calls exchangeCodeForSession or verifyOtp → sets HTTP-only cookies
 *   4. Redirects to /auth/verified?verified=1&type=<type> (success)
 *      or /auth/verified?error=<message> (failure)
 *
 * SETUP (REQUIRED — Supabase Dashboard):
 *   - Add https://www.tissca.com/auth/callback to Supabase Auth → Redirect URLs.
 *   - All emailRedirectTo must point here, NOT /auth/verified.
 *
 * DO NOT:
 *   - Remove cookie handling — without it the session won't survive navigation.
 *   - Add UI rendering — this is a route handler, not a page.
 *   - Change the redirect destination without updating the verified page.
 *   - Point emailRedirectTo back to /auth/verified.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash') || searchParams.get('token');
  const type = searchParams.get('type') || 'signup';
  const next = searchParams.get('next') || '/auth/verified';

  // ---------- Supabase SSR client with cookie bridge ----------
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can throw in Server Components; safe to swallow in Route Handlers.
          }
        },
      },
    }
  );

  // ---------- Exchange code / verify OTP ----------
  let error: string | null = null;

  try {
    if (code) {
      // PKCE flow — most common with @supabase/supabase-js v2+
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) error = exchangeError.message;
    } else if (token_hash) {
      // Direct token_hash flow (custom email template or legacy)
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as 'signup' | 'recovery' | 'magiclink' | 'email_change' | 'invite',
      });
      if (otpError) error = otpError.message;
    } else {
      error = 'Missing verification parameters. Please request a new verification email.';
    }
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Unknown verification error.';
  }

  // ---------- Redirect to the verified landing page ----------
  const redirectUrl = new URL(next, origin);

  if (error) {
    redirectUrl.searchParams.set('error', error);
    redirectUrl.searchParams.set('type', type);
  } else {
    redirectUrl.searchParams.set('verified', '1');
    redirectUrl.searchParams.set('type', type);
  }

  return NextResponse.redirect(redirectUrl);
}
