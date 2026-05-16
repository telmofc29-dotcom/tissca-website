// src/app/api/admin/support/vouchers/send/route.ts v1.1
//
// PURPOSE:
// - Support tooling: send a voucher code to a user by email.
// - Intentionally FAIL-CLOSED until an email provider is configured.
//
// ENDPOINT:
// - POST /api/admin/support/vouchers/send
//   body: { toEmail: string, code: string, message?: string }
//
// SECURITY (PROOF-BASED):
// - Requires Authorization: Bearer <access_token>
// - Token validated via supabase.auth.getUser(token)
// - Caller must be active platform staff (tissca_staff.is_active=true)
//
// NOTE:
// - Replace NOT_IMPLEMENTED with your provider (Resend/Postmark/SendGrid/SMTP).
// - Keep it server-side only.

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

function clampLen(s: string, max: number) {
  const v = String(s || '');
  return v.length > max ? v.slice(0, max) : v;
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return json(401, { error: 'UNAUTHENTICATED' });

    const body = await req.json().catch(() => null);

    const toEmail = clampLen(String(body?.toEmail || '').trim(), 254);
    const code = clampLen(String(body?.code || '').trim(), 128);
    const message = clampLen(String(body?.message || '').trim(), 2000);

    if (!toEmail || !toEmail.includes('@')) return json(400, { error: 'INVALID_EMAIL' });
    if (!code) return json(400, { error: 'MISSING_CODE' });

    const supabase = createServerSupabaseClient();

    // 1) Validate caller
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { error: 'UNAUTHENTICATED' });

    // 2) Staff gate
    const staff = await supabase.from('tissca_staff').select('is_active').eq('user_id', userData.user.id).maybeSingle();

    if (staff.error) return json(500, { error: 'STAFF_LOOKUP_FAILED', details: staff.error.message });
    if (!staff.data || !staff.data.is_active) return json(403, { error: 'NOT_STAFF' });

    // 3) FAIL-CLOSED until provider exists
    return json(501, {
      error: 'NOT_IMPLEMENTED',
      message:
        'Voucher email sending is not wired yet. Choose an email provider (Resend/Postmark/SendGrid/SMTP) then implement this route.',
      debug: { toEmail, hasMessage: Boolean(message) }, // do NOT echo voucher code
    });
  } catch (e: any) {
    return json(500, { error: 'INTERNAL_ERROR', details: String(e?.message ?? e) });
  }
}