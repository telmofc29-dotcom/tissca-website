// src/app/api/admin/settings/preferences/route.ts v1.0
//
// PURPOSE:
// - PATCH /api/admin/settings/preferences
// - Update per-staff preferences (self-only).
//
// SECURITY:
// - Must be active platform staff.
// - Writes only to row where user_id = auth.uid() (enforced by RLS too).

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase';

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
      console.error('[PATCH /api/admin/settings/preferences] Missing public Supabase env');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const db = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Staff gate (fail closed)
    const { data: staffRecord, error: staffError } = await db
      .from('tissca_staff')
      .select('is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (staffError) {
      console.error('[PATCH /api/admin/settings/preferences] staff lookup failed:', staffError.message);
      return NextResponse.json({ error: 'Staff evaluation failed' }, { status: 500 });
    }

    if (!Boolean(staffRecord?.is_active)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const compact_sidebar = Boolean(body?.compact_sidebar);
    const show_debug = Boolean(body?.show_debug);

    const { error: upsertError } = await db.from('admin_user_settings').upsert(
      {
        user_id: user.id,
        compact_sidebar,
        show_debug,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (upsertError) {
      console.error('[PATCH /api/admin/settings/preferences] upsert failed:', upsertError.message);
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[PATCH /api/admin/settings/preferences] error:', e);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}