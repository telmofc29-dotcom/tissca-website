// src/app/api/admin/settings/platform/route.ts v1.0
//
// PURPOSE:
// - PATCH /api/admin/settings/platform
// - Update global platform flags (single row).
//
// SECURITY:
// - Superadmin only (proof-based server check + RLS).
// - Fail closed.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase';

const PLATFORM_ROW_ID = 1;

function extractBearer(req: NextRequest) {
  return req.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

export async function PATCH(req: NextRequest) {
  try {
    const token = extractBearer(req);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[PATCH /api/admin/settings/platform] Missing public Supabase env');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const db = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Staff gate + role gate (proof-based)
    const { data: staffRecord, error: staffError } = await db
      .from('tissca_staff')
      .select('role, is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (staffError) {
      console.error('[PATCH /api/admin/settings/platform] staff lookup failed:', staffError.message);
      return NextResponse.json({ error: 'Staff evaluation failed' }, { status: 500 });
    }

    const isActive = Boolean(staffRecord?.is_active);
    const role = String(staffRecord?.role ?? '').toLowerCase().trim();

    if (!isActive || role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const maintenance_mode = Boolean(body?.maintenance_mode);
    const registrations_enabled = body?.registrations_enabled === false ? false : true;
    const stripe_enabled = Boolean(body?.stripe_enabled);
    const force_email_verification = Boolean(body?.force_email_verification);

    // Update existing row; if missing, insert it.
    const { data: existing } = await db
      .from('platform_settings')
      .select('id')
      .eq('id', PLATFORM_ROW_ID)
      .maybeSingle();

    if (existing?.id) {
      const { error: updErr } = await db
        .from('platform_settings')
        .update({
          maintenance_mode,
          registrations_enabled,
          stripe_enabled,
          force_email_verification,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', PLATFORM_ROW_ID);

      if (updErr) {
        console.error('[PATCH /api/admin/settings/platform] update failed:', updErr.message);
        return NextResponse.json({ error: 'Failed to save platform flags' }, { status: 500 });
      }
    } else {
      const { error: insErr } = await db.from('platform_settings').insert({
        id: PLATFORM_ROW_ID,
        maintenance_mode,
        registrations_enabled,
        stripe_enabled,
        force_email_verification,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      });

      if (insErr) {
        console.error('[PATCH /api/admin/settings/platform] insert failed:', insErr.message);
        return NextResponse.json({ error: 'Failed to save platform flags' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[PATCH /api/admin/settings/platform] error:', e);
    return NextResponse.json({ error: 'Failed to save platform flags' }, { status: 500 });
  }
}