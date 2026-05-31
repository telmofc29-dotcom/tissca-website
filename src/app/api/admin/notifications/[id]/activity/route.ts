// src/app/api/admin/notifications/[id]/activity/route.ts
//
// GET /api/admin/notifications/:id/activity
//
// Returns the audit activity timeline for a notification.
// Results are ordered newest-first, limited to 50 entries.
//
// Access: the notification's fan-out owner (staff_user_id), the assigned staff member,
// or any superadmin. Fail-closed: unauthorised callers receive 403.
//
// Actor display names are resolved via a secondary user_profiles lookup (batch, one query).
//
// Returns: 200 { activity: ActivityRow[] }
//
// Auth: Bearer token — caller must be active platform staff.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '../../_auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireStaff(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, userId, staffRole } = auth;
  const notificationId = params.id;

  if (!notificationId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  // Verify access: caller must be the fan-out owner, the assigned staff member, or superadmin
  const { data: notifRow, error: accessError } = await supabase
    .from('admin_notifications')
    .select('id, staff_user_id, assigned_to')
    .eq('id', notificationId)
    .maybeSingle();

  if (accessError) {
    console.error('[GET /activity] Access check failed:', accessError.message, { notificationId });
    return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 });
  }
  if (!notifRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const hasAccess =
    notifRow.staff_user_id === userId ||
    notifRow.assigned_to   === userId ||
    staffRole              === 'superadmin';

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch activity rows for this notification
  const { data: rows, error: activityError } = await supabase
    .from('notification_activity')
    .select('id, action, actor_id, from_status, to_status, reason, occurred_at')
    .eq('notification_id', notificationId)
    .order('occurred_at', { ascending: false })
    .limit(50);

  if (activityError) {
    console.error('[GET /activity] Activity query failed:', activityError.message, { notificationId });
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 });
  }

  // Batch-resolve actor display names from user_profiles
  const actorIds = [
    ...new Set((rows ?? []).map(r => r.actor_id).filter(Boolean)),
  ] as string[];

  const nameMap: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', actorIds);
    (profiles ?? []).forEach(p => {
      if (p.id && p.full_name) nameMap[p.id as string] = p.full_name as string;
    });
  }

  const activity = (rows ?? []).map(r => ({
    id:          r.id,
    action:      r.action,
    actor_id:    r.actor_id,
    actor_name:  r.actor_id ? (nameMap[r.actor_id] ?? null) : null,
    from_status: r.from_status,
    to_status:   r.to_status,
    reason:      r.reason,
    occurred_at: r.occurred_at,
  }));

  return NextResponse.json({ activity });
}
