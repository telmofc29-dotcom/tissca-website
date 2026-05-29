// src/app/api/admin/feedback/unread-count/route.ts
//
// GET /api/admin/feedback/unread-count
//
// Returns the count of feedback submissions with status = 'new' so the admin
// shell can display a badge on the Feedback sidebar item.
//
// Auth: Bearer token — caller must be an active platform staff member.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/** Verify caller is active platform staff. */
async function requirePlatformStaff(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!token) return { error: 'Unauthorized', status: 401 as const };

  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: 'Unauthorized', status: 401 as const };

  const { data: staffRecord, error: staffError } = await supabase
    .from('tissca_staff')
    .select('is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffError) return { error: 'Staff evaluation failed', status: 500 as const };
  if (!staffRecord?.is_active) return { error: 'Forbidden', status: 403 as const };

  return { supabase };
}

export async function GET(req: NextRequest) {
  const auth = await requirePlatformStaff(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase } = auth;

  const { count, error } = await supabase
    .from('feedback')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new');

  if (error) {
    console.error('[GET /api/admin/feedback/unread-count] Query failed:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
