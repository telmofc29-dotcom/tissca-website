// src/app/api/admin/stripe/promo/create/route.ts
//
// PURPOSE:
// Server-side proxy for admin voucher/promo code creation.
// Replaces the previous direct browser-to-Edge-Function call that required
// NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL to be set as a public env var.
//
// FLOW:
//   Client (admin/vouchers page)
//   → POST /api/admin/stripe/promo/create  (Bearer <user-jwt>)
//   → Staff gate (tissca_staff.is_active = true)
//   → Derive Edge Function URL from NEXT_PUBLIC_SUPABASE_URL (no new env var needed)
//   → Forward request to Supabase Edge Function (admin-create-promo-code)
//   → Return response to client
//
// WHY SERVER-SIDE:
// - NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL is not required as a public browser env var.
// - NEXT_PUBLIC_SUPABASE_URL is already present and the Edge Function URL is
//   always <supabase_url>/functions/v1/<function_name> — derivable at runtime.
// - NEXT_PUBLIC_SUPABASE_ANON_KEY is already present and safe to use server-side.
// - The service role key is NEVER forwarded or exposed.
// - Double auth: Next.js staff gate + Edge Function's own JWT verification.
//
// SECURITY (PROOF-BASED):
// - Requires Authorization: Bearer <access_token>
// - Token validated via supabase.auth.getUser(token)
// - Caller must be active platform staff (tissca_staff.is_active = true)
// - Body forwarded verbatim to Edge Function — no mutation of workspace_id.
// - workspace_id validated as non-empty UUID before forwarding.
// - Fail closed: if URL derivation fails, returns 500 with SERVER_MISCONFIGURED.
// - No service role key is forwarded to the Edge Function.
// - No Stripe logic lives here — all Stripe work is in the Edge Function.
//
// REQUIRED ENV (all already present for normal app operation — no new vars):
//   NEXT_PUBLIC_SUPABASE_URL      — Supabase project URL (used to derive Edge Function URL)
//   NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key (forwarded as apikey to Edge Function)
//   SUPABASE_SERVICE_ROLE_KEY     — Used only for the Next.js staff gate check
//
// OPTIONAL ENV:
//   SUPABASE_PROMO_FUNCTION_NAME  — Edge Function name override (default: admin-create-promo-code)

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

function extractBearerToken(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/**
 * Derive the Edge Function base URL from NEXT_PUBLIC_SUPABASE_URL.
 * Supabase Edge Functions are always at <project-url>/functions/v1.
 * Returns null if the env var is missing or doesn't look like a valid URL.
 */
function deriveEdgeFunctionsBase(): string | null {
  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).trim().replace(/\/+$/, '');

  if (!supabaseUrl) return null;

  try {
    const u = new URL(supabaseUrl);
    // Must be a real Supabase project URL
    if (!u.hostname) return null;
    return `${supabaseUrl}/functions/v1`;
  } catch {
    return null;
  }
}

function getFunctionName(): string {
  return (
    process.env.SUPABASE_PROMO_FUNCTION_NAME ||
    'admin-create-promo-code'
  ).trim();
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Extract bearer token ──────────────────────────────────────────────
    const token = extractBearerToken(req);
    if (!token) return json(401, { error: 'UNAUTHENTICATED' });

    // ── 2. Validate token + staff gate ───────────────────────────────────────
    const supabase = createServerSupabaseClient();

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { error: 'UNAUTHENTICATED' });

    const staff = await supabase
      .from('tissca_staff')
      .select('is_active, role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (staff.error) {
      return json(500, { error: 'STAFF_LOOKUP_FAILED', details: staff.error.message });
    }
    if (!staff.data || !staff.data.is_active) {
      return json(403, { error: 'NOT_STAFF' });
    }

    // ── 3. Parse + validate body ─────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: 'INVALID_JSON' });
    }

    const workspaceId = String(body?.workspace_id || '').trim();
    if (!workspaceId) return json(400, { error: 'MISSING_WORKSPACE_ID' });
    if (!isUuid(workspaceId)) return json(400, { error: 'INVALID_WORKSPACE_ID' });

    // Validate workspace exists (proof-based — prevents forwarding requests for non-existent workspaces)
    const ws = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .maybeSingle();

    if (ws.error) return json(500, { error: 'WORKSPACE_LOOKUP_FAILED', details: ws.error.message });
    if (!ws.data) return json(404, { error: 'WORKSPACE_NOT_FOUND' });

    // ── 4. Derive Edge Function URL ──────────────────────────────────────────
    const functionsBase = deriveEdgeFunctionsBase();
    if (!functionsBase) {
      return json(500, {
        error: 'SERVER_MISCONFIGURED',
        details:
          'NEXT_PUBLIC_SUPABASE_URL is missing or invalid. ' +
          'Set it in your environment (it is required for the app to function at all).',
      });
    }

    const fnName = getFunctionName();
    const edgeFnUrl = `${functionsBase}/${fnName}`;

    // ── 5. Get anon key for Edge Function apikey header ──────────────────────
    const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!anonKey) {
      return json(500, {
        error: 'SERVER_MISCONFIGURED',
        details:
          'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. ' +
          'Set it in your environment (it is required for the app to function at all).',
      });
    }

    // ── 6. Forward to Edge Function ──────────────────────────────────────────
    // Forward the original user JWT so the Edge Function can verify staff context.
    // Forward the anon key as apikey (standard Supabase Edge Function convention).
    // The service role key is NOT forwarded — it never leaves the Next.js server.
    let edgeRes: Response;
    try {
      edgeRes = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
        },
        body: JSON.stringify(body),
      });
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error('[POST /api/admin/stripe/promo/create] Edge Function fetch failed:', msg);
      return json(502, {
        error: 'EDGE_FUNCTION_UNREACHABLE',
        details: `Could not reach Edge Function at ${edgeFnUrl}. Check that the function is deployed. (${msg})`,
      });
    }

    // ── 7. Relay response ────────────────────────────────────────────────────
    let responseBody: unknown;
    const contentType = edgeRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      responseBody = await edgeRes.json().catch(() => ({ error: 'EDGE_FUNCTION_INVALID_JSON' }));
    } else {
      const text = await edgeRes.text().catch(() => '');
      responseBody = { raw: text.slice(0, 500) };
    }

    return NextResponse.json(responseBody, { status: edgeRes.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[POST /api/admin/stripe/promo/create] Unexpected error:', msg);
    return json(500, { error: 'INTERNAL_ERROR' });
  }
}
