// src/app/api/admin/email-intelligence/run-triggers/route.ts
//
// PURPOSE:
// Admin-only manual trigger: evaluates user behaviour and populates email_queue.
// Reuses processEmailTriggers() from email-intelligence.ts — no duplicate logic.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { processEmailTriggers } from '@/lib/email-intelligence';

export const dynamic = 'force-dynamic';

async function authorizeAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    console.warn('[run-triggers] DENY: no bearer token');
    return {
      ok: false as const,
      error: 'Unauthorized',
      detail: 'No Authorization Bearer token in request.',
      debug: { step: 'extract_token', headerPresent: !!authHeader },
      status: 401 as const,
    };
  }

  const supabase = createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData?.user;

  if (authError || !user) {
    console.warn('[run-triggers] DENY: getUser failed —', authError?.message || 'no user');
    return {
      ok: false as const,
      error: 'Unauthorized',
      detail: `Token validation failed: ${authError?.message || 'no user returned'}`,
      debug: { step: 'getUser', authError: authError?.message || null, tokenPrefix: token.slice(0, 20) + '...' },
      status: 401 as const,
    };
  }

  const { data: staffRecord, error: staffError } = await supabase
    .from('tissca_staff')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffError) {
    console.error('[run-triggers] tissca_staff lookup failed:', staffError.message);
    return {
      ok: false as const,
      error: 'Staff evaluation failed',
      detail: staffError.message,
      debug: { step: 'staff_lookup', userId: user.id, email: user.email },
      status: 500 as const,
    };
  }

  const isPlatformStaff = Boolean(staffRecord?.is_active);
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isAdminEmail = adminEmails.includes((user.email || '').toLowerCase());

  if (!isPlatformStaff && !isAdminEmail) {
    console.warn('[run-triggers] DENY:', user.email, 'staff=', isPlatformStaff, 'adminEmail=', isAdminEmail);
    return {
      ok: false as const,
      error: 'Forbidden',
      detail: 'Not authorized as platform staff.',
      debug: { step: 'permission', email: user.email, staffRecord: staffRecord ?? null, isPlatformStaff, isAdminEmail, adminEmailsConfigured: adminEmails.length },
      status: 403 as const,
    };
  }

  console.log('[run-triggers] ALLOW:', user.email);
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
    const result = await processEmailTriggers();
    const durationMs = Date.now() - startTime;

    await supabase.from('email_system_settings').upsert(
      { key: 'last_trigger_run', value: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

    console.log('[run-triggers] Complete: queued=%d skipped=%d duration=%dms', result.triggered.length, result.skipped.length, durationMs);

    return NextResponse.json({
      ok: true,
      durationMs,
      usersScanned: result.triggered.length + result.skipped.length,
      emailsQueued: result.triggered.length,
      skipped: result.skipped.length,
      errors: result.errors,
      summary: result.triggered.map((t) => ({
        email: t.email,
        trigger: t.triggerType,
        template: t.templateKey,
        priority: t.priority,
        reasons: t.reasons,
      })),
    });
  } catch (err) {
    console.error('[run-triggers] Error:', err);
    return NextResponse.json(
      { ok: false, error: 'Trigger scan failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
