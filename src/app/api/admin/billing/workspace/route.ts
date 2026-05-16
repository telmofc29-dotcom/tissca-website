// src/app/api/admin/billing/workspace/route.ts v1.4
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
// - { workspace: { ... }, billing_state: string, promo_issues: [...], promo_issues_error?: string }
//
// CHANGES (v1.4):
// - FIX (RC5): Replace inline createServiceSupabaseClient() with createServerSupabaseClient()
//   from @/lib/supabase — eliminates stale env-var fallback alias risk on key rotation.
// - FIX: Remove `updated_at` from workspaces select. The column is not confirmed to exist on
//   the workspaces table and no other working route requests it. PostgREST returns an error
//   (not null) when a selected column is absent — this was the cause of WORKSPACE_LOOKUP_FAILED.
// - IMPROVE: Surface PostgREST error details (message + hint + code) in WORKSPACE_LOOKUP_FAILED.
// - IMPROVE: Post-fetch billing_state flag: NO_STRIPE_CUSTOMER | NO_STRIPE_SUBSCRIPTION | CONFIGURED.
// - KEEP: Validate workspace_id is a UUID (fail closed early).
// - KEEP: Request-id passthrough on responses when present (helps debug in UI).
// - KEEP: Best-effort promo_issues load (returns workspace even if promos fail).

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

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


export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);

  try {
    const token = extractBearerToken(req);
    if (!token) return json(401, { error: 'UNAUTHENTICATED' }, reqId);

    const { searchParams } = new URL(req.url);
    const workspaceId = String(searchParams.get('workspace_id') || '').trim();
    if (!workspaceId) return json(400, { error: 'MISSING_WORKSPACE_ID' }, reqId);
    if (!isUuid(workspaceId)) return json(400, { error: 'INVALID_WORKSPACE_ID' }, reqId);

    // Staff-only endpoint: use shared service role client (bypasses RLS, no cookie context).
    // createServerSupabaseClient() throws if env vars are missing — caught by outer try/catch.
    const supabase = createServerSupabaseClient();

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

    // 3) Load workspace billing container.
    // NOTE: updated_at is intentionally excluded — it is not a confirmed column on the workspaces
    // table. PostgREST returns an error (not null) for unknown columns, which was causing
    // WORKSPACE_LOOKUP_FAILED even when the workspace exists.
    const ws = await supabase
      .from('workspaces')
      .select('id,name,plan_tier,subscription_status,stripe_customer_id,stripe_subscription_id,current_period_end')
      .eq('id', workspaceId)
      .maybeSingle();

    if (ws.error) {
      return json(
        500,
        {
          error: 'WORKSPACE_LOOKUP_FAILED',
          details: (ws.error as any).message ?? String(ws.error),
          hint: (ws.error as any).hint ?? null,
          pg_code: (ws.error as any).code ?? null,
        },
        reqId
      );
    }
    if (!ws.data) return json(404, { error: 'WORKSPACE_NOT_FOUND' }, reqId);

    // 4) Post-fetch billing state: classify what is and isn't configured.
    const billingState = !ws.data.stripe_customer_id
      ? 'NO_STRIPE_CUSTOMER'
      : !ws.data.stripe_subscription_id
      ? 'NO_STRIPE_SUBSCRIPTION'
      : 'CONFIGURED';

    // 5) Load promo audit list (best-effort; page can still function without it)
    const promos = await supabase
      .from('admin_promo_issues')
      .select(
        'id,workspace_id,code,coupon_id,promotion_code_id,percent_off,amount_off,currency,duration,duration_in_months,max_redemptions,redeem_by,created_by,created_at,kind,issued_to_email'
      )
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (promos.error) {
      return json(200, { workspace: ws.data, billing_state: billingState, promo_issues: [], promo_issues_error: promos.error.message }, reqId);
    }

    return json(200, { workspace: ws.data, billing_state: billingState, promo_issues: promos.data || [] }, reqId);
  } catch (e: any) {
    return json(500, { error: 'INTERNAL_ERROR', details: String(e?.message ?? e) }, reqId);
  }
}