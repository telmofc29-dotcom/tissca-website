// src/app/api/admin/users/invite/route.ts v1.0
//
// PURPOSE:
// - Invite a new user by email (Supabase Auth invite).
// - Proof-based admin authorization.
// - Does NOT create Prisma rows (Prisma not the source of truth here).

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeAdmin(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => null);
    const email = String(body?.email || '').trim().toLowerCase();
    const fullName = body?.full_name ? String(body.full_name).trim() : null;

    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

    const redirectTo = process.env.NEXT_PUBLIC_BASE_URL
      ? `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verified`
      : undefined;

    const { data, error } = await auth.supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: fullName ? { full_name: fullName, name: fullName } : undefined,
    });

    if (error) {
      console.error('[POST /api/admin/users/invite] invite failed:', error.message);
      return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
    }

    return NextResponse.json({ success: true, invite: data });
  } catch (e: any) {
    console.error('[POST /api/admin/users/invite] error:', e);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
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