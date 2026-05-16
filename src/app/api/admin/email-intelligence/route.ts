// src/app/api/admin/email-intelligence/route.ts
//
// PURPOSE:
// Admin API for email intelligence system management.
// GET: Returns campaign settings, templates, queue stats, history, performance.
// PUT: Updates campaign settings or templates.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/* ──────────────────────────────────────────────────────────
   ADMIN AUTH — mirrors proven pattern from:
     /api/admin/support/customer  (tissca_staff + ADMIN_EMAILS)
     /api/admin/settings          (tissca_staff)
   Returns { supabase, user } on success.
   Returns { ok, error, detail, debug, status } on failure.
   ────────────────────────────────────────────────────────── */

type AuthSuccess = { supabase: ReturnType<typeof createServerSupabaseClient>; user: { id: string; email?: string } };
type AuthFailure = { ok: false; error: string; detail: string; debug: Record<string, unknown>; status: 401 | 403 | 500 };

async function authorizeAdmin(req: NextRequest, tag: string): Promise<AuthSuccess | AuthFailure> {
  // Step 1: Extract bearer token
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    console.warn(`[${tag}] DENY: no bearer token`);
    return {
      ok: false,
      error: 'Unauthorized',
      detail: 'No Authorization Bearer token found in request headers.',
      debug: { step: 'extract_token', headerPresent: !!authHeader, headerValue: authHeader ? `${authHeader.slice(0, 12)}...` : null },
      status: 401,
    };
  }

  // Step 2: Validate token → resolve user
  const supabase = createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData?.user;

  if (authError || !user) {
    console.warn(`[${tag}] DENY: getUser failed — ${authError?.message || 'no user returned'}`);
    return {
      ok: false,
      error: 'Unauthorized',
      detail: 'Token validation failed. The access token may be expired or invalid.',
      debug: { step: 'getUser', authError: authError?.message || null, userResolved: !!user, tokenPrefix: token.slice(0, 20) + '...' },
      status: 401,
    };
  }

  // Step 3: Check tissca_staff table
  const { data: staffRecord, error: staffError } = await supabase
    .from('tissca_staff')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffError) {
    console.error(`[${tag}] ERROR: tissca_staff lookup failed — ${staffError.message}`);
    return {
      ok: false,
      error: 'Staff evaluation failed',
      detail: `Database lookup for staff record failed: ${staffError.message}`,
      debug: { step: 'staff_lookup', userId: user.id, email: user.email, dbError: staffError.message },
      status: 500,
    };
  }

  const isPlatformStaff = Boolean(staffRecord?.is_active);

  // Step 4: Fallback — ADMIN_EMAILS env var
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAdminEmail = adminEmails.includes((user.email || '').toLowerCase());

  if (!isPlatformStaff && !isAdminEmail) {
    console.warn(`[${tag}] DENY: user=${user.email} staff=${isPlatformStaff} adminEmail=${isAdminEmail}`);
    return {
      ok: false,
      error: 'Forbidden',
      detail: 'Your account is not authorized as platform staff. Contact a superadmin to be added to tissca_staff or ADMIN_EMAILS.',
      debug: {
        step: 'permission_check',
        email: user.email,
        userId: user.id,
        staffRecord: staffRecord ? { role: staffRecord.role, is_active: staffRecord.is_active } : null,
        isPlatformStaff,
        adminEmailsConfigured: adminEmails.length,
        isAdminEmail,
      },
      status: 403,
    };
  }

  console.log(`[${tag}] ALLOW: ${user.email} (staff=${isPlatformStaff} adminEmail=${isAdminEmail})`);
  return { supabase, user: { id: user.id, email: user.email } };
}

function authErrorResponse(result: AuthFailure) {
  return NextResponse.json(
    { ok: false, error: result.error, detail: result.detail, debug: result.debug },
    { status: result.status }
  );
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAdmin(request, 'email-intel/GET');
  if ('ok' in auth && auth.ok === false) return authErrorResponse(auth);
  const { supabase } = auth as AuthSuccess;
  const section = request.nextUrl.searchParams.get('section') || 'all';

  const result: Record<string, unknown> = {};

  // ── Campaign settings ──
  if (section === 'all' || section === 'campaigns') {
    const { data: campaigns, error: campErr } = await supabase
      .from('email_campaign_settings')
      .select('*')
      .order('priority', { ascending: false });

    if (campErr) {
      console.error('[email-intelligence] campaigns load error:', campErr.message);
    }

    // Auto-seed defaults if table is empty
    if (!campaigns || campaigns.length === 0) {
      console.log('[email-intelligence] No campaigns found — seeding defaults');
      const defaults = [
        { trigger_type: 'high_intent_upgrade', enabled: true, priority: 10, min_gap_hours: 72, max_per_day: 1, description: 'Visitors showing strong upgrade intent (pricing visits, CTA clicks)' },
        { trigger_type: 'revenue_ready', enabled: true, priority: 8, min_gap_hours: 72, max_per_day: 1, description: 'Users ready for revenue conversion (active usage + billing interest)' },
        { trigger_type: 'activation_needed', enabled: true, priority: 5, min_gap_hours: 168, max_per_day: 1, description: 'New users who need activation nudge' },
        { trigger_type: 'feature_discovery', enabled: true, priority: 3, min_gap_hours: 168, max_per_day: 1, description: 'Active users who may benefit from undiscovered features' },
        { trigger_type: 'stuck_user', enabled: true, priority: 1, min_gap_hours: 168, max_per_day: 1, description: 'Users who appear stuck or inactive' },
      ];
      const { error: seedErr } = await supabase
        .from('email_campaign_settings')
        .upsert(defaults, { onConflict: 'trigger_type' });
      if (seedErr) {
        console.error('[email-intelligence] campaign seed error:', seedErr.message);
      }
      // Re-fetch after seeding
      const { data: seeded } = await supabase
        .from('email_campaign_settings')
        .select('*')
        .order('priority', { ascending: false });
      result.campaigns = seeded || [];
    } else {
      result.campaigns = campaigns;
    }
  }

  // ── Templates ──
  if (section === 'all' || section === 'templates') {
    const { data: templates } = await supabase
      .from('email_templates')
      .select('*')
      .order('template_key');
    result.templates = templates || [];
  }

  // ── Queue stats ──
  if (section === 'all' || section === 'queue') {
    const statusFilter = request.nextUrl.searchParams.get('queueStatus');
    const triggerFilter = request.nextUrl.searchParams.get('queueTrigger');

    let query = supabase
      .from('email_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter) query = query.eq('status', statusFilter);
    if (triggerFilter) query = query.eq('trigger_type', triggerFilter);

    const { data: queue } = await query;
    result.queue = queue || [];

    // Counts per status
    const { count: pC } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: prC } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'processing');
    const { count: sC } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'sent');
    const { count: fC } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed');
    const { count: cC } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'cancelled');

    result.queueStats = {
      pending: pC ?? 0,
      processing: prC ?? 0,
      sent: sC ?? 0,
      failed: fC ?? 0,
      cancelled: cC ?? 0,
    };
  }

  // ── History ──
  if (section === 'all' || section === 'history') {
    const { data: history } = await supabase
      .from('email_history')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(100);
    result.history = history || [];
  }

  // ── Performance ──
  if (section === 'all' || section === 'performance') {
    // Sent per template
    const { data: allHistory } = await supabase
      .from('email_history')
      .select('template_key, trigger_type, status');

    const perTemplate: Record<string, { sent: number; failed: number }> = {};
    const perTrigger: Record<string, { sent: number; failed: number }> = {};

    (allHistory || []).forEach((row: Record<string, unknown>) => {
      const tk = row.template_key as string;
      const tt = row.trigger_type as string;
      const st = row.status as string;

      if (!perTemplate[tk]) perTemplate[tk] = { sent: 0, failed: 0 };
      if (!perTrigger[tt]) perTrigger[tt] = { sent: 0, failed: 0 };

      if (st === 'sent') {
        perTemplate[tk].sent++;
        perTrigger[tt].sent++;
      } else {
        perTemplate[tk].failed++;
        perTrigger[tt].failed++;
      }
    });

    result.performance = {
      totalSent: (allHistory || []).filter((r: Record<string, unknown>) => r.status === 'sent').length,
      totalFailed: (allHistory || []).filter((r: Record<string, unknown>) => r.status === 'failed').length,
      perTemplate,
      perTrigger,
    };
  }

  // ── System settings ──
  if (section === 'all' || section === 'settings') {
    const { data: settings, error: settingsErr } = await supabase
      .from('email_system_settings')
      .select('key, value');

    if (settingsErr) {
      console.error('[email-intelligence] settings load error:', settingsErr.message);
    }

    // Auto-seed defaults if empty
    if (!settings || settings.length === 0) {
      console.log('[email-intelligence] No system settings found — seeding defaults');
      await supabase.from('email_system_settings').upsert([
        { key: 'tracking_enabled', value: 'true', updated_at: new Date().toISOString() },
        { key: 'unsubscribe_enabled', value: 'true', updated_at: new Date().toISOString() },
      ], { onConflict: 'key' });
      const { data: seeded } = await supabase.from('email_system_settings').select('key, value');
      const settingsMap: Record<string, string> = {};
      (seeded || []).forEach((s: Record<string, unknown>) => {
        settingsMap[s.key as string] = s.value as string;
      });
      result.systemSettings = settingsMap;
    } else {
      const settingsMap: Record<string, string> = {};
      settings.forEach((s: Record<string, unknown>) => {
        settingsMap[s.key as string] = s.value as string;
      });
      result.systemSettings = settingsMap;
    }
  }

  // ── Tracking stats ──
  if (section === 'all' || section === 'tracking') {
    const { count: openCount } = await supabase
      .from('email_opens')
      .select('*', { count: 'exact', head: true });
    const { count: clickCount } = await supabase
      .from('email_clicks')
      .select('*', { count: 'exact', head: true });

    result.tracking = {
      totalOpens: openCount ?? 0,
      totalClicks: clickCount ?? 0,
    };
  }

  return NextResponse.json(result);
}

export async function PUT(request: NextRequest) {
  const auth = await authorizeAdmin(request, 'email-intel/PUT');
  if ('ok' in auth && auth.ok === false) return authErrorResponse(auth);
  const { supabase, user } = auth as AuthSuccess;

  const body = await request.json();
  const action = body.action;

  // ── Update campaign setting ──
  if (action === 'update_campaign') {
    const { trigger_type, enabled, priority, min_gap_hours, max_per_day } = body;
    if (!trigger_type) {
      return NextResponse.json({ error: 'trigger_type required' }, { status: 400 });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof enabled === 'boolean') update.enabled = enabled;
    if (typeof priority === 'number') update.priority = priority;
    if (typeof min_gap_hours === 'number') update.min_gap_hours = min_gap_hours;
    if (typeof max_per_day === 'number') update.max_per_day = max_per_day;

    const { data, error } = await supabase
      .from('email_campaign_settings')
      .update(update)
      .eq('trigger_type', trigger_type)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // ── Update or create template ──
  if (action === 'update_template') {
    const { template_key, subject, preview_text, html_body, text_body, enabled } = body;
    if (!template_key) {
      return NextResponse.json({ error: 'template_key required' }, { status: 400 });
    }

    const row: Record<string, unknown> = {
      template_key,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };
    if (typeof subject === 'string') row.subject = subject;
    if (typeof preview_text === 'string') row.preview_text = preview_text;
    if (typeof html_body === 'string') row.html_body = html_body;
    if (typeof text_body === 'string') row.text_body = text_body;
    if (typeof enabled === 'boolean') row.enabled = enabled;

    const { data, error } = await supabase
      .from('email_templates')
      .upsert(row, { onConflict: 'template_key' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // ── Cancel queued email ──
  if (action === 'cancel_queue_item') {
    const { queue_id } = body;
    if (!queue_id) return NextResponse.json({ error: 'queue_id required' }, { status: 400 });

    const { error } = await supabase
      .from('email_queue')
      .update({ status: 'cancelled' })
      .eq('id', queue_id)
      .in('status', ['pending', 'processing']);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Update system setting ──
  if (action === 'update_system_setting') {
    const { key, value } = body;
    const allowedKeys = ['tracking_enabled', 'unsubscribe_enabled'];
    if (!key || !allowedKeys.includes(key)) {
      return NextResponse.json({ error: `Invalid key. Must be one of: ${allowedKeys.join(', ')}` }, { status: 400 });
    }
    if (typeof value !== 'string' || !['true', 'false'].includes(value)) {
      return NextResponse.json({ error: 'Value must be "true" or "false"' }, { status: 400 });
    }

    const { error } = await supabase
      .from('email_system_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, key, value });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
