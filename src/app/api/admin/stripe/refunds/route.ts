// src/app/api/admin/stripe/refunds/route.ts v1.1
//
// PURPOSE:
// - Staff-only Stripe refunds for Support tooling.
// - POST /api/admin/stripe/refunds
//
// LOCKED / PROOF-BASED:
// - Requires Authorization: Bearer <access_token>
// - Token validated via supabase.auth.getUser(token)
// - Caller must be active platform staff (tissca_staff.is_active=true)
// - Fail closed. No guessing.
//
// REQUIRED ENV:
// - STRIPE_SECRET_KEY
//
// BODY:
// - { payment_intent?: string, charge?: string, amount_minor?: number|null, reason?: string|null }
//
// RETURNS:
// - { ok: true, refund_id, status }

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

  return { ok: true as const };
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

    const payment_intent = String(body?.payment_intent || '').trim();
    const charge = String(body?.charge || '').trim();

    if (!payment_intent && !charge) {
      return json(400, { error: 'MISSING_PAYMENT_REFERENCE' });
    }

    // amount_minor is optional. If provided, it MUST be a positive integer (minor units).
    const amount_minor_raw = body?.amount_minor;

    const amount_minor =
      amount_minor_raw === null || typeof amount_minor_raw === 'undefined' || amount_minor_raw === ''
        ? null
        : Math.round(Number(amount_minor_raw));

    if (amount_minor !== null) {
      if (!Number.isFinite(amount_minor) || amount_minor <= 0 || amount_minor > 10_000_000) {
        return json(400, { error: 'INVALID_AMOUNT_MINOR' });
      }
    }

    const reasonRaw = String(body?.reason || '').trim().toLowerCase();
    const reason =
      reasonRaw === 'duplicate' || reasonRaw === 'fraudulent' || reasonRaw === 'requested_by_customer'
        ? (reasonRaw as any)
        : undefined;

    const stripe = getStripeOrThrow();

    const refund = await stripe.refunds.create({
      payment_intent: payment_intent || undefined,
      charge: charge || undefined,
      amount: amount_minor ?? undefined,
      reason,
    });

    return json(200, { ok: true, refund_id: refund.id, status: refund.status });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    console.error('[POST /api/admin/stripe/refunds] error:', msg);
    return json(500, { error: 'INTERNAL_ERROR' });
  }
}