// src/app/api/admin/billing/workspace/route.ts v1.3
//
// PURPOSE:
// - Admin (staff-only) proof-based billing snapshot for a workspace.
// - Used by Admin tooling (Users, Vouchers & Billing).
//
// ENDPOINT:
// - GET /api/admin/billing/workspace?workspace_id=<uuid>
//
// SECURITY (PROOF-BASED):
// - Requires Authorization: Bearer <access_token>
// - Token validated via supabase.auth.getUser(token)
// - Caller must be active platform staff (tissca_staff.is_active=true)
// - Fail closed (no guessing)
//
// RETURNS:
// - { workspace: { ... }, promo_issues: [...], promo_issues_error?: string }
//
// CHANGES (v1.3):
// - FIX/HARDEN: Use a server-side Service Role Supabase client for DB reads (staff-only endpoint).
//   This avoids RLS/cookie-context mismatches that can cause 500s even when the token is valid.
// - HARDEN: Fail closed with a clear error if service role env vars are missing.
// - KEEP: Validate workspace_id is a UUID (fail closed early).
// - KEEP: Request-id passthrough on responses when present (helps debug in UI).
// - KEEP: Best-effort promo_issues load (returns workspace even if promos fail).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function json(status: number, body: any, reqId?: string | null) {
  const headers: Record<string, string> = {};
  if (reqId) headers['x-request-id'] = reqId;
  return NextResponse.json(body, { status, headers });
}

function extractBearerToken(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function getRequestId(req: NextRequest) {
  return (
    req.headers.get('x-request-id') ||
    req.headers.get('x-vercel-id') ||
    req.headers.get('cf-ray') ||
    req.headers.get('x-amzn-trace-id') ||
    null
  );
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function getServiceEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    '';

  return {
    url: String(url).trim(),
    serviceKey: String(serviceKey).trim(),
  };
}

function createServiceSupabaseClient() {
  const { url, serviceKey } = getServiceEnv();

  if (!url || !serviceKey) {
    return { client: null as any, missing: { url: !url, serviceKey: !serviceKey } };
  }

  const client = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        // Helps correlate in Supabase logs if you’re using request IDs
        'x-client-info': 'tissca-admin-billing-workspace',
      },
    },
  });

  return { client, missing: null as any };
}

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);

  try {
    const token = extractBearerToken(req);
    if (!token) return json(401, { error: 'UNAUTHENTICATED' }, reqId);

    const { searchParams } = new URL(req.url);
    const workspaceId = String(searchParams.get('workspace_id') || '').trim();
    if (!workspaceId) return json(400, { error: 'MISSING_WORKSPACE_ID' }, reqId);
    if (!isUuid(workspaceId)) return json(400, { error: 'INVALID_WORKSPACE_ID' }, reqId);

    // Staff-only endpoint: use service role for DB reads to avoid RLS/cookie context issues.
    const svc = createServiceSupabaseClient();
    if (!svc.client) {
      return json(
        500,
        {
          error: 'SERVER_MISCONFIGURED',
          details: 'Missing Supabase service role environment variables.',
          missing: svc.missing,
        },
        reqId
      );
    }

    const supabase = svc.client;

    // 1) Validate user from token (proof-based)
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { error: 'UNAUTHENTICATED' }, reqId);

    // 2) Staff gate (proof-based)
    const staff = await supabase
      .from('tissca_staff')
      .select('is_active, role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (staff.error) return json(500, { error: 'STAFF_LOOKUP_FAILED', details: staff.error.message }, reqId);
    if (!staff.data || !staff.data.is_active) return json(403, { error: 'NOT_STAFF' }, reqId);

    // 3) Load workspace billing container
    const ws = await supabase
      .from('workspaces')
      .select('id,name,plan_tier,subscription_status,stripe_customer_id,stripe_subscription_id,current_period_end,updated_at')
      .eq('id', workspaceId)
      .maybeSingle();

    if (ws.error) return json(500, { error: 'WORKSPACE_LOOKUP_FAILED', details: ws.error.message }, reqId);
    if (!ws.data) return json(404, { error: 'WORKSPACE_NOT_FOUND' }, reqId);

    // 4) Load promo audit list (best-effort; page can still function without it)
    const promos = await supabase
      .from('admin_promo_issues')
      .select(
        'id,workspace_id,code,coupon_id,promotion_code_id,percent_off,amount_off,currency,duration,duration_in_months,max_redemptions,redeem_by,created_by,created_at,kind,issued_to_email'
      )
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (promos.error) {
      return json(200, { workspace: ws.data, promo_issues: [], promo_issues_error: promos.error.message }, reqId);
    }

    return json(200, { workspace: ws.data, promo_issues: promos.data || [] }, reqId);
  } catch (e: any) {
    return json(500, { error: 'INTERNAL_ERROR', details: String(e?.message ?? e) }, reqId);
  }
}