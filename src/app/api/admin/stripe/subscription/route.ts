// src/app/api/admin/stripe/subscription/route.ts v1.0
//
// PURPOSE:
// - Staff-only Stripe subscription controls for Support tooling.
// - POST /api/admin/stripe/subscription
//   actions: cancel | pause | resume
//
// LOCKED / PROOF-BASED:
// - Requires Authorization: Bearer <access_token>
// - Token validated via supabase.auth.getUser(token)
// - Caller must be active platform staff (tissca_staff.is_active=true)
// - Workspace is billing container. We resolve stripe_subscription_id from public.workspaces.
// - Fail closed. No guessing.
//
// REQUIRED ENV:
// - STRIPE_SECRET_KEY
//
// BODY:
// - { workspace_id: string, action: 'cancel'|'pause'|'resume', cancel_at_period_end?: boolean, pause_behavior?: 'void'|'keep_as_draft'|'mark_uncollectible' }
//
// RETURNS:
// - { ok: true, action, subscription_id, status, cancel_at_period_end, paused }

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
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

async function requireStaff(req: NextRequest) {
  const token = extractBearerToken(req);
  if (!token) return { ok: false as const, status: 401 as const, error: 'UNAUTHENTICATED' };

  const supabase = createServerSupabaseClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return { ok: false as const, status: 401 as const, error: 'UNAUTHENTICATED' };

  const staff = await supabase
    .from('tissca_staff')
    .select('is_active')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (staff.error)
    return { ok: false as const, status: 500 as const, error: 'STAFF_LOOKUP_FAILED', details: staff.error.message };
  if (!staff.data || !staff.data.is_active) return { ok: false as const, status: 403 as const, error: 'NOT_STAFF' };

  return { ok: true as const, supabase };
}

function getStripeOrThrow() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(stripeSecret, { apiVersion: '2026-01-28.clover' });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireStaff(req);
    if (!auth.ok) return json(auth.status, { error: auth.error, details: (auth as any).details });

    const body = await req.json().catch(() => ({}));

    const workspace_id = String(body?.workspace_id || '').trim();
    const action = String(body?.action || '').trim().toLowerCase();
    const cancelAtPeriodEnd = Boolean(body?.cancel_at_period_end);
    const pauseBehaviorRaw = String(body?.pause_behavior || 'void').trim().toLowerCase();

    if (!workspace_id) return json(400, { error: 'MISSING_WORKSPACE_ID' });
    if (!['cancel', 'pause', 'resume'].includes(action)) return json(400, { error: 'INVALID_ACTION' });

    const pause_behavior =
      pauseBehaviorRaw === 'keep_as_draft' || pauseBehaviorRaw === 'mark_uncollectible' ? pauseBehaviorRaw : 'void';

    // Resolve billing container -> subscription id
    const ws = await auth.supabase
      .from('workspaces')
      .select('id, stripe_subscription_id')
      .eq('id', workspace_id)
      .maybeSingle();

    if (ws.error) return json(500, { error: 'WORKSPACE_LOOKUP_FAILED', details: ws.error.message });
    if (!ws.data) return json(404, { error: 'WORKSPACE_NOT_FOUND' });

    const subId = String(ws.data.stripe_subscription_id || '').trim();
    if (!subId) return json(409, { error: 'WORKSPACE_HAS_NO_STRIPE_SUBSCRIPTION_ID' });

    const stripe = getStripeOrThrow();

    if (action === 'cancel') {
      if (cancelAtPeriodEnd) {
        const sub = await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
        return json(200, {
          ok: true,
          action,
          subscription_id: sub.id,
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end,
          paused: Boolean((sub as any)?.pause_collection),
        });
      }

      const sub = await stripe.subscriptions.cancel(subId);
      return json(200, {
        ok: true,
        action,
        subscription_id: sub.id,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        paused: Boolean((sub as any)?.pause_collection),
      });
    }

    if (action === 'pause') {
      const sub = await stripe.subscriptions.update(subId, {
        pause_collection: { behavior: pause_behavior as any },
      });

      return json(200, {
        ok: true,
        action,
        subscription_id: sub.id,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        paused: Boolean((sub as any)?.pause_collection),
      });
    }

    // resume
    const sub = await stripe.subscriptions.update(subId, {
      pause_collection: null as any,
    });

    return json(200, {
      ok: true,
      action,
      subscription_id: sub.id,
      status: sub.status,
      cancel_at_period_end: sub.cancel_at_period_end,
      paused: Boolean((sub as any)?.pause_collection),
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    console.error('[POST /api/admin/stripe/subscription] error:', msg);
    return json(500, { error: 'INTERNAL_ERROR' });
  }
}