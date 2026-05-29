// src/app/api/admin/notifications/count/route.ts
//
// GET /api/admin/notifications/count
//
// Returns the unread (non-dismissed) notification count for the calling staff member.
// Used by AdminShell to drive the bell badge. Designed to be polled every 30 seconds.
//
// Response: { count: number }
//
// Auth: Bearer token — caller must be active platform staff.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '../_auth';

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, userId } = auth;

  const { count, error } = await supabase
    .from('admin_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('staff_user_id', userId)
    .eq('is_read', false)
    .eq('is_dismissed', false);

  if (error) {
    console.error('[GET /api/admin/notifications/count] Query failed:', error.message, { userId });
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
