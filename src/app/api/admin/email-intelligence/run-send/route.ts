// src/app/api/admin/email-intelligence/run-send/route.ts
//
// PURPOSE:
// Admin-only manual trigger: drains email_queue and sends via Resend.
// Reuses processEmailQueue() from email-sender.ts — no duplicate logic.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { processEmailQueue } from '@/lib/email-sender';

export const dynamic = 'force-dynamic';

async function authorizeAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return { ok: false as const, error: 'Unauthorized', detail: 'No bearer token.', debug: { step: 'extract_token' }, status: 401 as const };
  }

  const supabase = createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData?.user;

  if (authError || !user) {
    console.warn('[run-send] DENY: getUser failed —', authError?.message || 'no user');
    return { ok: false as const, error: 'Unauthorized', detail: `Token validation failed: ${authError?.message || 'no user'}`, debug: { step: 'getUser', authError: authError?.message || null }, status: 401 as const };
  }

  const { data: staffRecord, error: staffError } = await supabase.from('tissca_staff').select('role, is_active').eq('user_id', user.id).maybeSingle();
  if (staffError) {
    return { ok: false as const, error: 'Staff evaluation failed', detail: staffError.message, debug: { step: 'staff_lookup', email: user.email }, status: 500 as const };
  }

  const isPlatformStaff = Boolean(staffRecord?.is_active);
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isAdminEmail = adminEmails.includes((user.email || '').toLowerCase());

  if (!isPlatformStaff && !isAdminEmail) {
    console.warn('[run-send] DENY:', user.email);
    return { ok: false as const, error: 'Forbidden', detail: 'Not platform staff.', debug: { step: 'permission', email: user.email, staffRecord: staffRecord ?? null, isPlatformStaff, isAdminEmail, adminEmailsConfigured: adminEmails.length }, status: 403 as const };
  }

  console.log('[run-send] ALLOW:', user.email);
  return { supabase, user: { id: user.id, email: user.email } };
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if ('ok' in auth && auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.error, detail: auth.detail, debug: auth.debug }, { status: auth.status });
  }

  const { supabase } = auth as { supabase: ReturnType<typeof createServerSupabaseClient>; user: { id: string; email?: string } };
  const startTime = Date.now();

  try {
    const result = await processEmailQueue();
    const durationMs = Date.now() - startTime;

    await supabase.from('email_system_settings').upsert(
      { key: 'last_send_run', value: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

    console.log('[run-send] Complete: sent=%d failed=%d duration=%dms', result.sent, result.failed, durationMs);

    return NextResponse.json({
      ok: true,
      durationMs,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (err) {
    console.error('[run-send] Error:', err);
    return NextResponse.json(
      { ok: false, error: 'Email send failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
