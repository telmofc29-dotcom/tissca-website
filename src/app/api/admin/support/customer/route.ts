// src/app/api/admin/support/customer/route.ts v1.3
//
// PURPOSE:
// - Admin Support Control Panel: resolve a single customer by email or user_id.
// - Returns profile + workspace billing snapshot + voucher audit list.
//
// ENDPOINTS:
// - GET /api/admin/support/customer?email=<email>
// - GET /api/admin/support/customer?user_id=<uuid>
//
// SECURITY (PROOF-BASED):
// - Requires Authorization: Bearer <access_token>
// - Token validated via supabase.auth.getUser(token)
// - Caller must be active platform staff (tissca_staff.is_active=true)
// - Fail closed
//
// RETURNS:
// - { user: {...}, workspace: {...}|null, promo_issues: [...] }
//
// CHANGES (v1.1):
// - HARDEN: prevent wildcard email matching (% / _) from behaving like a pattern search.
// - HARDEN: prefer exact email match (eq), with safe case-insensitive fallback (ilike) only when input is safe.
//
// CHANGES (v1.2):
// - FIX (compat): return user.id (and keep user_id as optional alias) to match admin/vouchers/page.tsx expectations.
//
// CHANGES (v1.3):
// - FIX (schema): user_profiles uses id (uuid) not user_id. Query by p.id everywhere.
// - KEEP: user_id query param remains supported as the auth user id (== user_profiles.id).

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function extractBearerToken(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function hasSqlLikeWildcards(s: string) {
  // Postgres LIKE/ILIKE wildcard chars
  return s.includes('%') || s.includes('_');
}

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return json(401, { error: 'UNAUTHENTICATED' });

    const { searchParams } = new URL(req.url);
    const emailRaw = String(searchParams.get('email') || '').trim();
    const userId = String(searchParams.get('user_id') || '').trim(); // auth.users.id == user_profiles.id

    if (!emailRaw && !userId) return json(400, { error: 'MISSING_LOOKUP' });

    const supabase = createServerSupabaseClient();

    // 1) Validate caller
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { error: 'UNAUTHENTICATED' });

    // 2) Staff gate
    const staff = await supabase
      .from('tissca_staff')
      .select('is_active, role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (staff.error) return json(500, { error: 'STAFF_LOOKUP_FAILED', details: staff.error.message });
    if (!staff.data || !staff.data.is_active) return json(403, { error: 'NOT_STAFF' });

    // 3) Resolve user profile
    // IMPORTANT: Your schema uses public.user_profiles.id (uuid) as the auth user id.
    const baseProfileSelect = supabase
      .from('user_profiles')
      .select('id,email,full_name,current_workspace_id,updated_at,created_at')
      .limit(1);

    let profRes: any;

    if (userId) {
      // user_id query param is the auth user id, which equals user_profiles.id
      profRes = await baseProfileSelect.eq('id', userId).maybeSingle();
    } else {
      const email = emailRaw;
      if (!email.includes('@')) return json(400, { error: 'INVALID_EMAIL' });

      // Prefer exact match first (best if you store emails normalised).
      profRes = await baseProfileSelect.eq('email', email).maybeSingle();

      // Fallback: case-insensitive exact match, but only if the input is not a pattern.
      if (!profRes?.data && !profRes?.error) {
        if (hasSqlLikeWildcards(email)) {
          return json(400, { error: 'INVALID_EMAIL' });
        }
        profRes = await baseProfileSelect.ilike('email', email).maybeSingle();
      }
    }

    if (profRes.error) return json(500, { error: 'PROFILE_LOOKUP_FAILED', details: profRes.error.message });
    if (!profRes.data) return json(404, { error: 'USER_NOT_FOUND' });

    const profile = profRes.data as any;
    const resolvedUserId = String(profile.id || '').trim();
    const workspaceId = String(profile.current_workspace_id || '').trim();

    // 4) Workspace billing snapshot (workspace-scoped)
    let workspace: any | null = null;
    let promo_issues: any[] = [];

    if (workspaceId) {
      const ws = await supabase
        .from('workspaces')
        .select('id,name,plan_tier,subscription_status,stripe_customer_id,stripe_subscription_id,current_period_end,updated_at')
        .eq('id', workspaceId)
        .maybeSingle();

      if (!ws.error && ws.data) workspace = ws.data;

      const promos = await supabase
        .from('admin_promo_issues')
        .select(
          'id,workspace_id,code,coupon_id,promotion_code_id,percent_off,amount_off,currency,duration,duration_in_months,max_redemptions,redeem_by,created_by,created_at'
        )
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!promos.error) promo_issues = promos.data || [];
    }

    return json(200, {
      user: {
        // ✅ what the UI expects
        id: resolvedUserId,

        // keep for backwards compatibility / debugging
        user_id: resolvedUserId,

        email: String(profile.email || '').trim(),
        full_name: String(profile.full_name || '').trim(),
        current_workspace_id: workspaceId || null,
      },
      workspace,
      promo_issues,
    });
  } catch (e: any) {
    return json(500, { error: 'INTERNAL_ERROR', details: String(e?.message ?? e) });
  }
}