// src/app/api/admin/users/[id]/notes/archive/route.ts v1.2
//
// PURPOSE:
// - Archive / unarchive admin notes with an inbox-style lifecycle.
// - Supports BOTH:
//   A) Single-note archive (recommended for “email inbox” behaviour)
//   B) Thread-level (all notes for user) archive (backward-compatible)
//
// ENDPOINT:
// - PATCH /api/admin/users/[id]/notes/archive
//
// BODY OPTIONS:
// 1) Single note (recommended):
//    { noteId: "<uuid>", archived: true }   -> that note: status='archived', archived_at=now()
//    { noteId: "<uuid>", archived: false }  -> that note: status='open',     archived_at=null
//
// 2) Thread-level (all notes for user) – backwards compatible with v1.0:
//    { archived: true }   -> ALL notes for user: status='archived', archived_at=now()
//    { archived: false }  -> ALL notes for user: status='open',     archived_at=null
//
// SECURITY (PROOF-BASED):
// - Requires Authorization: Bearer <access_token>
// - Token validated via supabase.auth.getUser(token)
// - Caller must be active platform staff (tissca_staff.is_active=true)
// - Allowed roles only: superadmin OR engineer
// - Protected account support@tissca.com cannot be modified
//
// NOTES:
// - Updates enforce user ownership by requiring user_id match.
// - If noteId is provided, we also require id match.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PROTECTED_EMAIL = 'support@tissca.com';
const ENGINEERING_ROLES = new Set(['superadmin', 'engineer']);

function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) return null;

  return token.trim();
}

async function authorizeEngineering(req: NextRequest) {
  const token = extractBearerToken(req);
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
    console.error('[authorizeEngineering] tissca_staff lookup failed:', staffError.message);
    return { error: 'Staff evaluation failed', status: 500 as const };
  }

  if (!staffRecord?.is_active) {
    return { error: 'Forbidden', status: 403 as const };
  }

  const role = String(staffRecord?.role ?? '').toLowerCase().trim();
  if (!ENGINEERING_ROLES.has(role)) {
    return { error: 'Forbidden', status: 403 as const };
  }

  return { supabase, user, staffRecord };
}

async function getTargetEmailSafe(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  targetUserId: string
): Promise<string> {
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', targetUserId)
    .maybeSingle();

  if (!profileError && profile?.email) return String(profile.email).toLowerCase();

  const { data, error } = await supabase.auth.admin.getUserById(targetUserId);
  if (!error && data?.user?.email) return String(data.user.email).toLowerCase();

  return '';
}

type RouteCtx = { params: { id: string } };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await authorizeEngineering(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const targetUserId = String(ctx?.params?.id || '').trim();
    if (!targetUserId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

    const targetEmail = await getTargetEmailSafe(auth.supabase, targetUserId);
    if (targetEmail === PROTECTED_EMAIL) {
      return NextResponse.json(
        { error: 'Protected account: support@tissca.com cannot be modified.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const archived = Boolean(body?.archived);
    const noteId = String(body?.noteId ?? '').trim(); // optional

    const patch = archived
      ? { status: 'archived', archived_at: new Date().toISOString() }
      : { status: 'open', archived_at: null };

    // Build update query:
    // - Always constrain by user_id (safety)
    // - If noteId provided, also constrain by id (single-note archive)
    let q = auth.supabase.from('admin_user_notes').update(patch).eq('user_id', targetUserId);

    if (noteId) {
      q = q.eq('id', noteId);
    }

    const { data, error } = await q.select('id').limit(1000);

    if (error) {
      console.error('[PATCH /api/admin/users/[id]/notes/archive] update failed:', error.message);
      return NextResponse.json({ error: 'Failed to update notes status' }, { status: 500 });
    }

    const updatedCount = Array.isArray(data) ? data.length : 0;

    // If client asked for a specific note and we updated nothing, treat as not found
    if (noteId && updatedCount === 0) {
      return NextResponse.json(
        { error: 'Note not found for this user (or already in desired state)' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user_id: targetUserId,
      archived,
      noteId: noteId || null,
      updatedCount,
      mode: noteId ? 'single' : 'thread',
    });
  } catch (e: any) {
    console.error('[PATCH /api/admin/users/[id]/notes/archive] Error:', e?.message || e);
    return NextResponse.json({ error: 'Failed to update notes status' }, { status: 500 });
  }
}