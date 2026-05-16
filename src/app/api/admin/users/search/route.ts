// src/app/api/admin/users/search/route.ts v1.2
//
// CHANGES (v1.2):
// - HARDEN: Strip BOTH SQL ILIKE wildcards (% and _) from q (underscore is also a wildcard).
// - HARDEN: Re-check q length AFTER sanitising to avoid accidental match-all queries.
// - KEEP: Align to real schema (user_profiles primary key is `id`, not `user_id`).
// - KEEP: Align admin authorisation with /api/admin/users (tissca_staff OR ADMIN_EMAILS).
// - KEEP: Proof-based token validation via supabase.auth.getUser(token).
// - KEEP: Fail-closed behaviour and safe query handling.
//
// PURPOSE:
// - Admin (staff-only) scalable user search for Support tooling.
// - Avoids loading all users when you have 1M+ subs.
//
// ENDPOINT:
// - GET /api/admin/users/search?q=<text>&limit=10
//
// SECURITY (PROOF-BASED):
// - Requires Authorization: Bearer <access_token>
// - Token validated via supabase.auth.getUser(token)
// - Caller must be active platform staff OR ADMIN_EMAILS (matches /api/admin/users)
// - Fail closed
//
// RETURNS:
// - { users: [{ id, email, full_name, current_workspace_id }] }

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function extractBearerToken(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function clampInt(v: string, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function parseAdminEmails(raw: string | undefined | null): string[] {
  return String(raw || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return json(401, { error: 'UNAUTHENTICATED' });

    const { searchParams } = new URL(req.url);
    const qRaw = String(searchParams.get('q') || '').trim();
    const limit = clampInt(String(searchParams.get('limit') || ''), 1, 25, 10);

    if (!qRaw || qRaw.length < 2) {
      return json(200, { users: [] });
    }

    const supabase = createServerSupabaseClient();

    // 1) Validate user from token
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json(401, { error: 'UNAUTHENTICATED' });

    const caller = userData.user;

    // 2) Admin gate (match /api/admin/users):
    // - active platform staff OR ADMIN_EMAILS allowlist
    const staff = await supabase
      .from('tissca_staff')
      .select('is_active')
      .eq('user_id', caller.id)
      .maybeSingle();

    if (staff.error) return json(500, { error: 'STAFF_LOOKUP_FAILED', details: staff.error.message });

    const isPlatformStaff = Boolean(staff.data?.is_active);

    const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);
    const isAdminEmail = adminEmails.includes(String(caller.email || '').toLowerCase());

    if (!isPlatformStaff && !isAdminEmail) {
      return json(403, { error: 'FORBIDDEN' });
    }

    // 3) Search user_profiles (fast + indexable)
    // NOTE: Your /api/admin/users proves user_profiles has:
    // - id (auth user id)
    // - email
    // - full_name
    // - current_workspace_id
    //
    // HARDEN: Strip SQL ILIKE wildcard chars (% and _) to avoid pattern-y inputs.
    const q = qRaw.replace(/[%_]/g, '').trim().slice(0, 200);

    // Re-check after sanitising (avoid accidental match-all via "%%" etc.)
    if (!q || q.length < 2) {
      return json(200, { users: [] });
    }

    const res = await supabase
      .from('user_profiles')
      .select('id,email,full_name,current_workspace_id')
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
      .order('email', { ascending: true })
      .limit(limit);

    if (res.error) return json(500, { error: 'SEARCH_FAILED', details: res.error.message });

    const users = (res.data || []).map((r: any) => ({
      id: String(r.id || '').trim(),
      email: String(r.email || '').trim(),
      full_name: String(r.full_name || '').trim(),
      current_workspace_id: r.current_workspace_id ? String(r.current_workspace_id).trim() : null,
    }));

    return json(200, { users });
  } catch (e: any) {
    return json(500, { error: 'INTERNAL_ERROR', details: String(e?.message ?? e) });
  }
}