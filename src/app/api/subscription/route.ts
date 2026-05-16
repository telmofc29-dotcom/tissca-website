// src/app/api/subscription/route.ts v1.5
//
// PURPOSE:
// - Provide the authenticated user's current plan + billing status (derived from workspaces.*)
// - Keep a placeholder POST for future Stripe checkout (canonical Stripe routes will live under /api/stripe/*)
//
// CHANGES (v1.5):
// - PROVEN BILLING FIELDS:
//   - workspaces select now includes proven billing columns:
//     name, plan_tier, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end
// - Keep behaviour otherwise unchanged (proof-based auth, no client-guessing).
// - POST remains NOT IMPLEMENTED, but points to the canonical upcoming endpoint.
//
// VERSION HISTORY:
// - v1.4: Schema fix (user_profiles.id = auth.user.id), workspaces select proven columns only (id, plan_tier),
//         richer PostgREST logs.
// - v1.5 (2026-03-02): Return full proven workspace billing fields from workspaces (no placeholders).

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

type ServerSupabase = ReturnType<typeof createServerSupabaseClient>;

type AuthedUserResult =
  | { supabase: ServerSupabase; user: User; error: null }
  | {
      supabase: ServerSupabase;
      user: null;
      error: 'Missing Authorization Bearer token' | 'Unauthorized';
    };

function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) return null;

  return token.trim();
}

async function getAuthedUser(req: NextRequest): Promise<AuthedUserResult> {
  const supabase = createServerSupabaseClient();
  const token = extractBearerToken(req);

  if (!token) {
    return { supabase, user: null, error: 'Missing Authorization Bearer token' };
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return { supabase, user: null, error: 'Unauthorized' };
  }

  return { supabase, user: data.user, error: null };
}

/**
 * GET /api/subscription
 * Get user's current plan + billing fields (derived from workspace)
 */
export async function GET(req: NextRequest) {
  try {
    const result = await getAuthedUser(req);

    if (result.error || !result.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { supabase, user } = result;

    // ✅ PROVEN: user_profiles.id = auth.user.id
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, current_workspace_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[GET /api/subscription] user_profiles error:', {
        message: (profileError as any)?.message,
        code: (profileError as any)?.code,
        details: (profileError as any)?.details,
      });
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const workspaceId = profile.current_workspace_id;

    if (!workspaceId) {
      return NextResponse.json({
        success: true,
        workspace: null,
        planTier: 'unknown',
        subscriptionStatus: 'inactive',
        currentPeriodEnd: null,
      });
    }

    // ✅ PROVEN: billing container is workspace
    // ✅ PROVEN: workspaces includes billing columns used below
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select(
        'id, name, plan_tier, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end'
      )
      .eq('id', workspaceId)
      .maybeSingle();

    if (wsError) {
      console.error('[GET /api/subscription] workspaces error:', {
        message: (wsError as any)?.message,
        code: (wsError as any)?.code,
        details: (wsError as any)?.details,
      });
      return NextResponse.json({ error: 'Failed to fetch workspace' }, { status: 500 });
    }

    if (!workspace) {
      return NextResponse.json({
        success: true,
        workspace: { id: workspaceId },
        planTier: 'unknown',
        subscriptionStatus: 'inactive',
        currentPeriodEnd: null,
      });
    }

    return NextResponse.json({
      success: true,
      workspace,
      planTier: workspace.plan_tier ?? 'unknown',
      subscriptionStatus: workspace.subscription_status ?? 'inactive',
      currentPeriodEnd: workspace.current_period_end ?? null,
    });
  } catch (error: any) {
    console.error('[GET /api/subscription] runtime error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}

/**
 * POST /api/subscription
 * Create Stripe checkout session (premium upgrade) - NOT IMPLEMENTED YET
 *
 * NOTE:
 * Canonical billing routes will live under:
 * - POST /api/stripe/create-checkout-session
 * - POST /api/stripe/create-portal-session
 * - POST /api/stripe/webhook
 */
export async function POST(req: NextRequest) {
  try {
    const result = await getAuthedUser(req);

    if (result.error || !result.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const interval = body?.interval;

    if (!interval || !['monthly', 'annual'].includes(interval)) {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: 'Stripe integration not yet configured',
        message:
          'Checkout feature coming soon. Use POST /api/stripe/create-checkout-session once wired.',
      },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('[POST /api/subscription] runtime error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}