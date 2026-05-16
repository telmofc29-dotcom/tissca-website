// src/app/api/admin/stripe/credits/route.ts v1.1
//
// PURPOSE:
// - Staff-only Stripe customer balance credits for Support tooling.
// - POST /api/admin/stripe/credits
//
// LOCKED / PROOF-BASED:
// - Requires Authorization: Bearer <access_token>
// - Token validated via supabase.auth.getUser(token)
// - Caller must be active platform staff (tissca_staff.is_active=true)
// - Workspace is billing container: resolve stripe_customer_id from public.workspaces.
// - Credits are applied as customer balance transactions (negative amount => credit).
// - Fail closed. No guessing.
//
// REQUIRED ENV:
// - STRIPE_SECRET_KEY
//
// BODY:
// - { workspace_id: string, amount_minor: number, currency?: string, description?: string }
//
// RETURNS:
// - { ok: true, customer_id, transaction_id, amount_minor, currency }

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

  const staff = await supabase.from('tissca_staff').select('is_active').eq('user_id', userData.user.id).maybeSingle();

  if (staff.error) {
    return { ok: false as const, status: 500 as const, error: 'STAFF_LOOKUP_FAILED', details: staff.error.message };
  }
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
    if (!workspace_id) return json(400, { error: 'MISSING_WORKSPACE_ID' });

    // Force integer minor units safely (and prevent absurd amounts)
    const amount_minor_raw = Number(body?.amount_minor);
    const amount_minor = Math.round(amount_minor_raw);

    if (!Number.isFinite(amount_minor_raw) || amount_minor <= 0 || amount_minor > 10_000_000) {
      return json(400, { error: 'INVALID_AMOUNT_MINOR' });
    }

    const currency = String(body?.currency || 'gbp').trim().toLowerCase();
    if (!currency) return json(400, { error: 'MISSING_CURRENCY' });

    const description = String(body?.description || '').trim() || 'Support goodwill credit';

    const ws = await auth.supabase.from('workspaces').select('id, stripe_customer_id').eq('id', workspace_id).maybeSingle();

    if (ws.error) return json(500, { error: 'WORKSPACE_LOOKUP_FAILED', details: ws.error.message });
    if (!ws.data) return json(404, { error: 'WORKSPACE_NOT_FOUND' });

    const customerId = String(ws.data.stripe_customer_id || '').trim();
    if (!customerId) return json(409, { error: 'WORKSPACE_HAS_NO_STRIPE_CUSTOMER_ID' });

    const stripe = getStripeOrThrow();

    // Stripe customer balance:
    // - negative amount => credit (reduces future invoice amount)
    const txn = await stripe.customers.createBalanceTransaction(customerId, {
      amount: -Math.abs(amount_minor),
      currency: currency as any,
      description,
    });

    return json(200, {
      ok: true,
      customer_id: customerId,
      transaction_id: txn.id,
      amount_minor,
      currency,
    });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    console.error('[POST /api/admin/stripe/credits] error:', msg);
    return json(500, { error: 'INTERNAL_ERROR' });
  }
}