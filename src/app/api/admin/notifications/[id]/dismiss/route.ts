// src/app/api/admin/notifications/[id]/dismiss/route.ts
//
// PATCH /api/admin/notifications/:id/dismiss
//
// Dismisses a notification for the calling staff member.
// Dismissed notifications are hidden from the default inbox view.
// The admin_notifications row is NOT deleted — it remains for audit purposes.
// Response: { ok: true }
//
// Auth: Bearer token — caller must be active platform staff.
// Security: WHERE clause enforces staff_user_id = <caller's userId>.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '../../_auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireStaff(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, userId } = auth;
  const notificationId = params.id;

  if (!notificationId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const { error, count } = await supabase
    .from('admin_notifications')
    .update({
      is_dismissed: true,
      dismissed_at: new Date().toISOString(),
      // Also mark as read when dismissed
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('staff_user_id', userId);

  if (error) {
    console.error('[PATCH /api/admin/notifications/:id/dismiss] Update failed:', error.message, {
      notificationId,
      userId,
    });
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  if (!count || count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
