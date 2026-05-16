// src/app/api/admin/settings/route.ts v1.0
//
// PURPOSE:
// - GET /api/admin/settings
// - Proof-based: validate token, staff gate, then return settings payload.
// - Role-scoped:
//   - Any active staff: returns my_preferences (self).
//   - Superadmin: additionally returns platform_flags.
//
// SECURITY:
// - Fail closed: if not staff, 403.
// - Uses authed PostgREST client so RLS enforces auth.uid().

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase';

const PLATFORM_ROW_ID = 1;

function extractBearer(req: NextRequest) {
  return req.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

export async function GET(req: NextRequest) {
  try {
    const token = extractBearer(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1) Proof-based token validation
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2) Authed PostgREST client for RLS-safe DB reads
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[GET /api/admin/settings] Missing public Supabase env');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const db = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // 3) Staff gate (fail closed)
    const { data: staffRecord, error: staffError } = await db
      .from('tissca_staff')
      .select('role, is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (staffError) {
      console.error('[GET /api/admin/settings] tissca_staff lookup failed:', staffError.message);
      return NextResponse.json({ error: 'Staff evaluation failed' }, { status: 500 });
    }

    const isPlatformStaff = Boolean(staffRecord?.is_active);
    const staffRole = String(staffRecord?.role ?? '').toLowerCase().trim();

    if (!isPlatformStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isSuperadmin = staffRole === 'superadmin';

    // 4) My preferences (self row)
    const { data: prefsRow } = await db
      .from('admin_user_settings')
      .select('compact_sidebar, show_debug')
      .eq('user_id', user.id)
      .maybeSingle();

    const my_preferences = {
      compact_sidebar: Boolean(prefsRow?.compact_sidebar) || false,
      show_debug: Boolean(prefsRow?.show_debug) || false,
    };

    // 5) Platform flags (superadmin only)
    let platform_flags = undefined as
      | {
          maintenance_mode: boolean;
          registrations_enabled: boolean;
          stripe_enabled: boolean;
          force_email_verification: boolean;
        }
      | undefined;

    if (isSuperadmin) {
      const { data: pf } = await db
        .from('platform_settings')
        .select('maintenance_mode, registrations_enabled, stripe_enabled, force_email_verification')
        .eq('id', PLATFORM_ROW_ID)
        .maybeSingle();

      platform_flags = {
        maintenance_mode: Boolean(pf?.maintenance_mode) || false,
        registrations_enabled: pf?.registrations_enabled === false ? false : true,
        stripe_enabled: Boolean(pf?.stripe_enabled) || false,
        force_email_verification: Boolean(pf?.force_email_verification) || false,
      };
    }

    return NextResponse.json({
      my_preferences,
      ...(isSuperadmin ? { platform_flags } : {}),
    });
  } catch (e: any) {
    console.error('[GET /api/admin/settings] error:', e);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}