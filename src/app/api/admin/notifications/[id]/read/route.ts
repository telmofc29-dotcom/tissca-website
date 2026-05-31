// src/app/api/admin/notifications/[id]/read/route.ts
//
// PATCH /api/admin/notifications/:id/read
//
// Marks a single notification as read for the calling staff member.
// Response: { ok: true }
//
// Auth: Bearer token — caller must be active platform staff.
// Security: The WHERE clause enforces staff_user_id = <caller's userId>, so a staff member
//           cannot mark another staff member's notification as read.

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
    .update({ is_read: true, read_at: new Date().toISOString() })
    // Double-filter: id must match AND staff_user_id must be the caller
    .eq('id', notificationId)
    .eq('staff_user_id', userId);

  if (error) {
    console.error('[PATCH /api/admin/notifications/:id/read] Update failed:', error.message, {
      notificationId,
      userId,
    });
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  if (!count || count === 0) {
    // Row not found or does not belong to this staff member
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Append activity row (non-fatal — never blocks the mark-read response)
  try {
    await supabase.from('notification_activity').insert({
      notification_id: notificationId,
      actor_id:        userId,
      action:          'READ',
      metadata:        {},
    });
  } catch (actErr) {
    console.warn('[PATCH /read] Activity log failed (non-fatal):', actErr);
  }

  return NextResponse.json({ ok: true });
}
