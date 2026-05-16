// src/app/api/admin/support/set-workspace/route.ts v1.1
//
// CHANGES (v1.1):
// - Fix Next.js route handler detection: use standard Web Request signature (request: Request)
//   and avoid NextRequest + NextResponse.next() middleware pattern.
// - Keep same logic: proof-based auth via Supabase SSR client cookies, staff check, UUID validation.
// - Set httpOnly cookie for support workspace as before.
// - Remove unused requestUrl + ensure dynamic export stays valid.

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

const SUPPORT_WORKSPACE_COOKIE = 'tissca_support_workspace_id';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(request: Request) {
  // Create a response we can attach cookies to
  let response = NextResponse.json({ ok: false }, { status: 200 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[POST /api/admin/support/set-workspace] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Bridge cookies for @supabase/ssr
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Request is a Web Request; Next exposes cookies via headers
        // @supabase/ssr can read from the Cookie header
        const cookieHeader = request.headers.get('cookie') || '';
        // Convert "cookie" header string into list format expected by getAll usage.
        // But @supabase/ssr only requires getAll to return name/value pairs.
        // We'll parse minimally.
        if (!cookieHeader) return [];
        return cookieHeader
          .split(';')
          .map((c) => c.trim())
          .filter(Boolean)
          .map((pair) => {
            const idx = pair.indexOf('=');
            const name = idx >= 0 ? pair.slice(0, idx).trim() : pair.trim();
            const value = idx >= 0 ? pair.slice(idx + 1).trim() : '';
            return { name, value };
          });
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh session if exists (ensures cookies are updated if needed)
  await supabase.auth.getSession();

  // Proof: authenticated user must exist
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Proof: must be active platform staff (fail closed)
  const { data: staffRecord, error: staffError } = await supabase
    .from('tissca_staff')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffError) {
    console.error(
      '[POST /api/admin/support/set-workspace] tissca_staff lookup failed:',
      staffError.message
    );
    return NextResponse.json({ error: 'Staff evaluation failed' }, { status: 500 });
  }

  if (!staffRecord?.is_active) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const workspaceId = String(body?.workspaceId ?? '').trim();
  if (!workspaceId || !isUuid(workspaceId)) {
    return NextResponse.json({ error: 'Invalid workspaceId (UUID required)' }, { status: 400 });
  }

  const isProd = process.env.NODE_ENV === 'production';

  response = NextResponse.json({ ok: true, support_workspace_id: workspaceId }, { status: 200 });

  response.cookies.set(SUPPORT_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}