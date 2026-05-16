// src/app/api/admin/email-intelligence/test-send/route.ts
//
// PURPOSE:
// Admin tool to send a test email using any template.
// Bypasses the queue — sends immediately via Resend.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendTestEmail } from '@/lib/email-sender';
import type { EmailTemplateKey } from '@/lib/email-intelligence';

export const dynamic = 'force-dynamic';

const VALID_TEMPLATES: EmailTemplateKey[] = [
  'upgrade_push',
  'activation',
  'feature_discovery',
  'stuck_help',
  'revenue_push',
];

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
    console.warn('[test-send] DENY: getUser failed —', authError?.message || 'no user');
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
    console.warn('[test-send] DENY:', user.email);
    return { ok: false as const, error: 'Forbidden', detail: 'Not platform staff.', debug: { step: 'permission', email: user.email, staffRecord: staffRecord ?? null, isPlatformStaff, isAdminEmail, adminEmailsConfigured: adminEmails.length }, status: 403 as const };
  }

  console.log('[test-send] ALLOW:', user.email);
  return { supabase, user: { id: user.id, email: user.email } };
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdmin(request);
  if ('ok' in auth && auth.ok === false) {
    return NextResponse.json({ ok: false, error: auth.error, detail: auth.detail, debug: auth.debug }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { email, templateKey } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'Email address required' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email address' }, { status: 400 });
    }

    if (!templateKey || !VALID_TEMPLATES.includes(templateKey)) {
      return NextResponse.json(
        { ok: false, error: `Invalid template. Must be one of: ${VALID_TEMPLATES.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await sendTestEmail({
      to: email,
      templateKey: templateKey as EmailTemplateKey,
      context: {
        userName: 'Alex Thompson',
        score: 72,
        band: 'high',
        positiveSignals: [
          'Sent 4 quotes this week',
          'Invoiced 2 completed jobs',
          'Visited pricing page 3 times',
          'Using 4 of 6 workspace tools',
        ],
        workflowFeaturesUsed: 4,
        missingFeatures: ['tasks', 'assets'],
        topFeatures: ['quotes', 'invoices', 'leads', 'jobs'],
        daysInactive: 8,
        pricingVisits: 3,
        ctaClicks: 5,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `Test email sent to ${email}`,
      providerId: result.providerId,
    });
  } catch (err) {
    console.error('[test-send] Error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to send test email', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
