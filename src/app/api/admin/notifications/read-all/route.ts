// src/app/api/admin/notifications/read-all/route.ts
//
// PATCH /api/admin/notifications/read-all
//
// Marks all non-dismissed notifications as read for the calling staff member.
// Response: { updated: number }
//
// Auth: Bearer token — caller must be active platform staff.
// Security: staff_user_id derived from token — request body is ignored.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '../_auth';

export async function PATCH(req: NextRequest) {
  const auth = await requireStaff(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, userId } = auth;

  const { error, count } = await supabase
    .from('admin_notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('staff_user_id', userId)
    .eq('is_read', false)
    .eq('is_dismissed', false);

  if (error) {
    console.error('[PATCH /api/admin/notifications/read-all] Update failed:', error.message, { userId });
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ updated: count ?? 0 });
}
