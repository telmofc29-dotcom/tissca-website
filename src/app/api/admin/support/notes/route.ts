// src/app/api/admin/support/notes/route.ts v1.2
//
// PURPOSE:
// - Staff-only "inbox" for admin_user_notes across ALL users.
// - Supports inbox-like workflows at scale:
//   - status=open (default) -> shows active issues
//   - status=archived -> resolved/closed issues
//
// ENDPOINT:
// - GET /api/admin/support/notes?status=open|archived&query=...&limit=50&offset=0
//
// SECURITY (PROOF-BASED):
// - Requires Authorization: Bearer <access_token>
// - Token validated via Supabase auth.getUser(token)
// - Caller must be active platform staff (public.tissca_staff.is_active = true)
// - Fail-closed on staff evaluation errors.
//
// NOTES:
// - This endpoint reads public.admin_user_notes with a join to public.user_profiles.
// - Designed for large volumes: relies on indexes:
//   - (status, created_at desc)
//   - (user_id, status, created_at desc)
//
// CHANGES (v1.2):
// - Make PostgREST embed more robust by explicitly referencing the FK join.
// - Improve server log hint when schema cache/FK relationship is missing.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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
    console.error('[GET /api/admin/support/notes] tissca_staff lookup failed:', staffError.message);
    return { error: 'Staff evaluation failed', status: 500 as const };
  }

  if (!staffRecord?.is_active) {
    return { error: 'Forbidden', status: 403 as const };
  }

  return { supabase, user, staffRecord };
}

// Avoid TS2550 replaceAll (keep TS target unchanged)
// Also keep search safe-ish: strip wildcard characters so a user can’t accidentally “match everything”.
function normalizeSearch(raw: string): string {
  const v = String(raw || '').trim();
  if (!v) return '';
  // remove % and _ which are LIKE wildcards
  return v.replace(/[%_]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizePlatformStaff(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const url = new URL(req.url);

    const statusParam = String(url.searchParams.get('status') || 'open').trim().toLowerCase();
    const status = statusParam === 'archived' ? 'archived' : 'open';

    const queryRaw = String(url.searchParams.get('query') || '');
    const query = normalizeSearch(queryRaw);

    const limitRaw = Number(url.searchParams.get('limit') || 50);
    const offsetRaw = Number(url.searchParams.get('offset') || 0);

    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    let q = auth.supabase
      .from('admin_user_notes')
      .select(
        `
          id,
          user_id,
          created_by,
          note,
          created_at,
          status,
          archived_at,
          user_profiles!admin_user_notes_user_id_fkey (
            email,
            full_name,
            current_workspace_id
          )
        `
      )
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (query) {
      const like = `%${query}%`;
      // PostgREST OR syntax: comma-separated conditions
      q = q.or(
        [
          `note.ilike.${like}`,
          `user_id.ilike.${like}`,
          `user_profiles.email.ilike.${like}`,
          `user_profiles.full_name.ilike.${like}`,
        ].join(',')
      );
    }

    const { data, error } = await q;

    if (error) {
      // If embed fails, this is almost always missing FK / schema cache not reloaded.
      console.error('[GET /api/admin/support/notes] query failed:', error.message);
      console.error(
        '[GET /api/admin/support/notes] Hint: ensure FK exists admin_user_notes.user_id -> user_profiles.id and reload schema cache (pg_notify pgrst, reload schema).'
      );

      return NextResponse.json({ error: 'Failed to fetch inbox notes' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status,
      query,
      limit,
      offset,
      notes: Array.isArray(data) ? data : [],
    });
  } catch (e: any) {
    console.error('[GET /api/admin/support/notes] Error:', e?.message || e);
    return NextResponse.json({ error: 'Failed to fetch inbox notes' }, { status: 500 });
  }
}