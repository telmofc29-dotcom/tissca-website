// src/app/api/admin/users/[id]/notes/route.ts v1.1
//
// PURPOSE:
// - Staff-only internal notes per user (admin operator notes).
// - Supports inbox-style note lifecycle (open vs archived).
//
// ENDPOINTS:
// - GET  /api/admin/users/[id]/notes
//    - optional query: ?status=open|archived|all   (default: all)
// - POST /api/admin/users/[id]/notes  -> add a note for user (always status=open)
//
// SECURITY (PROOF-BASED):
// - Requires Authorization: Bearer <access_token>
// - Token validated via Supabase auth.getUser(token)
// - Caller must be active platform staff (public.tissca_staff.is_active = true)
// - Protected account support@tissca.com cannot be modified (POST blocked)
//
// NOTES:
// - Uses service-role Supabase client for DB ops (server-only).
// - Fail-closed on staff evaluation errors.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PROTECTED_EMAIL = 'support@tissca.com';

function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) return null;

  return token.trim();
}

async function authorizePlatformStaff(req: NextRequest) {
  const token = extractBearerToken(req);
  if (!token) return { error: 'Unauthorized', status: 401 as const };

  const supabase = createServerSupabaseClient();

  // Proof: validate token -> user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) return { error: 'Unauthorized', status: 401 as const };

  // Proof: must be active platform staff (fail closed)
  const { data: staffRecord, error: staffError } = await supabase
    .from('tissca_staff')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffError) {
    console.error('[authorizePlatformStaff] tissca_staff lookup failed:', staffError.message);
    return { error: 'Staff evaluation failed', status: 500 as const };
  }

  if (!staffRecord?.is_active) {
    return { error: 'Forbidden', status: 403 as const };
  }

  return { supabase, user, staffRecord };
}

async function getTargetEmailSafe(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  targetUserId: string
): Promise<string> {
  // Try profile first (if you store email there)
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', targetUserId)
    .maybeSingle();

  if (!profileError && profile?.email) return String(profile.email).toLowerCase();

  // Fallback to auth user email
  const { data, error } = await supabase.auth.admin.getUserById(targetUserId);
  if (!error && data?.user?.email) return String(data.user.email).toLowerCase();

  return '';
}

type RouteCtx = { params: { id: string } };

function normalizeStatus(raw: string | null): 'open' | 'archived' | 'all' {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'open') return 'open';
  if (v === 'archived') return 'archived';
  return 'all';
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await authorizePlatformStaff(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const targetUserId = String(ctx?.params?.id || '').trim();
    if (!targetUserId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const status = normalizeStatus(searchParams.get('status'));

    let query = auth.supabase
      .from('admin_user_notes')
      .select('id, user_id, created_by, note, created_at, status, archived_at')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/admin/users/[id]/notes] query failed:', error.message);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    return NextResponse.json({ success: true, notes: Array.isArray(data) ? data : [] });
  } catch (e: any) {
    console.error('[GET /api/admin/users/[id]/notes] Error:', e?.message || e);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await authorizePlatformStaff(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const targetUserId = String(ctx?.params?.id || '').trim();
    if (!targetUserId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

    // Block protected account
    const targetEmail = await getTargetEmailSafe(auth.supabase, targetUserId);
    if (targetEmail === PROTECTED_EMAIL) {
      return NextResponse.json(
        { error: 'Protected account: support@tissca.com cannot be modified.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const note = String(body?.note ?? '').trim();

    if (!note) return NextResponse.json({ error: 'Missing note' }, { status: 400 });
    if (note.length > 2000) return NextResponse.json({ error: 'Note too long (max 2000)' }, { status: 400 });

    const { data, error } = await auth.supabase
      .from('admin_user_notes')
      .insert({
        user_id: targetUserId,
        created_by: auth.user.id,
        note,
        status: 'open',
        archived_at: null,
      })
      .select('id, user_id, created_by, note, created_at, status, archived_at')
      .single();

    if (error || !data) {
      console.error('[POST /api/admin/users/[id]/notes] insert failed:', error?.message);
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
    }

    return NextResponse.json({ success: true, note: data });
  } catch (e: any) {
    console.error('[POST /api/admin/users/[id]/notes] Error:', e?.message || e);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}