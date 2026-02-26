// src/app/api/admin/users/delete/route.ts v1.0
//
// PURPOSE:
// - Delete a user from Supabase Auth (hard delete).
// - Best-effort cleanup of public tables (user_profiles, tissca_staff).
// - Proof-based admin authorization.
// - Protected support@tissca.com cannot be deleted.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PROTECTED_EMAIL = 'support@tissca.com';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeAdmin(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => null);
    const userId = String(body?.userId || '').trim();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const targetEmail = await getTargetEmailSafe(auth.supabase, userId);
    if (targetEmail === PROTECTED_EMAIL) {
      return NextResponse.json(
        { error: 'Protected account: support@tissca.com cannot be deleted.' },
        { status: 403 }
      );
    }

    // Best-effort cleanup in public schema (do not fail delete if cleanup fails)
    await auth.supabase.from('tissca_staff').delete().eq('user_id', userId);
    await auth.supabase.from('user_profiles').delete().eq('id', userId);

    const { error } = await auth.supabase.auth.admin.deleteUser(userId);
    if (error) {
      console.error('[POST /api/admin/users/delete] deleteUser failed:', error.message);
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[POST /api/admin/users/delete] error:', e);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

async function authorizeAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { error: 'Unauthorized', status: 401 as const };

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return { error: 'Unauthorized', status: 401 as const };

  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) return { error: 'Unauthorized', status: 401 as const };

  const { data: staffRecord, error: staffError } = await supabase
    .from('tissca_staff')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffError) {
    console.error('[authorizeAdmin] tissca_staff lookup failed:', staffError.message);
    return { error: 'Staff evaluation failed', status: 500 as const };
  }

  const isPlatformStaff = Boolean(staffRecord?.is_active);

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isAdminEmail = adminEmails.includes((user.email || '').toLowerCase());

  if (!isPlatformStaff && !isAdminEmail) {
    return { error: 'Forbidden', status: 403 as const };
  }

  return { supabase, user };
}

async function getTargetEmailSafe(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string
) {
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  if (!profileError && profile?.email) return String(profile.email).toLowerCase();

  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (!error && data?.user?.email) return String(data.user.email).toLowerCase();

  return '';
}