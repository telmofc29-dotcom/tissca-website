// src/app/api/admin/stripe/portal/promo-codes/route.ts v1.1
//
// PURPOSE:
// - Staff-only endpoint used by /admin/vouchers to set billing portal promo code policy.
// - Currently FAILS CLOSED safely unless you wire it to your Stripe portal configuration/session logic.
//
// SECURITY (PROOF-BASED):
// - Requires Authorization: Bearer <access_token>
// - Access token validated by Supabase (server-side)
// - Caller must be active platform staff
//
// NOTE:
// - This is intentionally conservative. It does NOT attempt to change Stripe configuration without your confirmed Stripe portal setup.
// - It returns allow_promotion_codes=false by default.
//
// CHANGES (v1.1):
// - Accept Authorization header in any case.
// - Staff lookup errors return 500 with details.
// - Keep fail-closed behaviour unchanged.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function extractBearer(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ? m[1].trim() : null;
}

async function requireActiveStaff(req: NextRequest) {
  const token = extractBearer(req);
  if (!token) return { ok: false as const, status: 401, error: 'UNAUTHENTICATED' };

  const supabase = createServerSupabaseClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return { ok: false as const, status: 401, error: 'UNAUTHENTICATED' };

  const userId = userData.user.id;

  const { data: staffRow, error: staffErr } = await supabase
    .from('tissca_staff')
    .select('is_active, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (staffErr) {
    return { ok: false as const, status: 500, error: 'STAFF_LOOKUP_FAILED', details: staffErr.message };
  }
  if (!staffRow?.is_active) return { ok: false as const, status: 403, error: 'NOT_STAFF' };

  return { ok: true as const, userId, role: (staffRow.role as string | null) ?? null };
}

export async function PATCH(req: NextRequest) {
  const gate = await requireActiveStaff(req);
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error, details: (gate as any).details },
      { status: gate.status }
    );
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const requested = Boolean(body?.allow_promotion_codes);

  return NextResponse.json(
    {
      allow_promotion_codes: false,
      message: requested
        ? 'Portal promo codes change is not wired yet (fail-closed: OFF). Wire this route to your Stripe portal configuration when ready.'
        : 'Portal promo codes enforced OFF (fail-closed).',
    },
    { status: 200 }
  );
}

export async function GET(req: NextRequest) {
  const gate = await requireActiveStaff(req);
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error, details: (gate as any).details },
      { status: gate.status }
    );
  }

  return NextResponse.json(
    {
      allow_promotion_codes: false,
      message: 'Portal promo codes policy is OFF (fail-closed).',
    },
    { status: 200 }
  );
}