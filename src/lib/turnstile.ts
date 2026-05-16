// src/lib/turnstile.ts
//
// Server-side Cloudflare Turnstile token verification.
// Used in API routes to validate the cf-turnstile-response token.
//
// Graceful degradation: if TURNSTILE_SECRET_KEY is not set, verification
// is skipped (returns success). This lets dev environments work without
// Cloudflare configuration while production enforces the check.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  success: boolean;
  /** Human-readable error (safe to log, not to return to client) */
  error?: string;
}

/**
 * Verify a Turnstile token server-side.
 *
 * @param token  The cf-turnstile-response token from the client
 * @param ip     Optional client IP forwarded for risk scoring
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  ip?: string | null,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // If secret is not configured, skip verification (dev / staging)
  if (!secret) {
    return { success: true };
  }

  // If Turnstile is configured but no token was submitted → reject
  if (!token) {
    return { success: false, error: 'Missing Turnstile token' };
  }

  try {
    const body: Record<string, string> = {
      secret,
      response: token,
    };
    if (ip) body.remoteip = ip;

    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return { success: false, error: `Turnstile API returned ${res.status}` };
    }

    const data = await res.json();

    if (data.success === true) {
      return { success: true };
    }

    const codes: string[] = data['error-codes'] || [];
    return {
      success: false,
      error: `Turnstile rejected: ${codes.join(', ') || 'unknown'}`,
    };
  } catch (err) {
    console.error('[turnstile] Verification failed:', err);
    // Fail open to avoid blocking users when Cloudflare is unreachable
    // Change to { success: false } if you prefer fail-closed.
    return { success: true };
  }
}
