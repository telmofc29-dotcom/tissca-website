// src/app/api/admin/support/clear-workspace/route.ts v1.1
//
// CHANGES (v1.1):
// - Fix Next.js App Router handler detection: use standard Web Request signature (request: Request)
//   and remove NextResponse.next() middleware-style usage.
// - Keep proof-based auth via Supabase SSR cookies + staff active check (fail closed).
// - Clear httpOnly support workspace cookie using maxAge: 0 on path '/'.

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

const SUPPORT_WORKSPACE_COOKIE = 'tissca_support_workspace_id';

export async function POST(request: Request) {
  // Create a response we can attach cookies to
  let response = NextResponse.json({ ok: false }, { status: 200 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[POST /api/admin/support/clear-workspace] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Bridge cookies for @supabase/ssr
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get('cookie') || '';
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

  // Refresh session if exists
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
    .select('is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffError) {
    console.error(
      '[POST /api/admin/support/clear-workspace] tissca_staff lookup failed:',
      staffError.message
    );
    return NextResponse.json({ error: 'Staff evaluation failed' }, { status: 500 });
  }

  if (!staffRecord?.is_active) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isProd = process.env.NODE_ENV === 'production';

  response = NextResponse.json({ ok: true }, { status: 200 });

  // Clear cookie (must match same path/samesite settings used when set)
  response.cookies.set(SUPPORT_WORKSPACE_COOKIE, '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}