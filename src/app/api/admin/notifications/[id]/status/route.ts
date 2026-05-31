// src/app/api/admin/notifications/[id]/status/route.ts
//
// PATCH /api/admin/notifications/:id/status
//
// Changes the workflow_status of a notification.
// Only the currently assigned staff member or a superadmin may change status.
// The status change is applied globally to ALL fan-out rows for the same event so
// every staff member's inbox reflects the current operational state.
//
// Appends a STATUS_CHANGED row to notification_activity (non-fatal).
//
// Body: { status: string }
//
// Valid status values:
//   INVESTIGATING | WAITING_USER | WAITING_ENGINEER | WAITING_ACCOUNTANT
//   ESCALATED | RESOLVED | DISMISSED | REOPENED
//
// Returns: 200 { ok: true, workflow_status: string }
//          400 { error: 'Invalid status' }
//          403 { error: 'Not assigned to you' }
//
// Auth: Bearer token — caller must be active platform staff.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '../../_auth';

const VALID_STATUSES = [
  'INVESTIGATING', 'WAITING_USER', 'WAITING_ENGINEER', 'WAITING_ACCOUNTANT',
  'ESCALATED', 'RESOLVED', 'DISMISSED', 'REOPENED',
] as const;

export async function PATCH(
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

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const newStatus = body.status?.trim().toUpperCase();
  if (!newStatus || !(VALID_STATUSES as readonly string[]).includes(newStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 },
    );
  }

  // Fetch current notification state
  const { data: notifRow, error: fetchError } = await supabase
    .from('admin_notifications')
    .select('id, event_id, assigned_to, workflow_status')
    .eq('id', notificationId)
    .maybeSingle();

  if (fetchError) {
    console.error('[PATCH /status] Fetch failed:', fetchError.message, { notificationId });
    return NextResponse.json({ error: 'Failed to load notification' }, { status: 500 });
  }
  if (!notifRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Authorization: only the assigned staff member or superadmin may change status
  const isAssigned  = notifRow.assigned_to === userId;
  const isSuperadmin = staffRole === 'superadmin';
  if (!isAssigned && !isSuperadmin) {
    return NextResponse.json({ error: 'Not assigned to you' }, { status: 403 });
  }

  const fromStatus = String(notifRow.workflow_status ?? 'NEW');

  // Apply globally across all fan-out rows for this event
  const { error: updateError } = await supabase
    .from('admin_notifications')
    .update({ workflow_status: newStatus })
    .eq('event_id', notifRow.event_id);

  if (updateError) {
    console.error('[PATCH /status] Update failed:', updateError.message, { notificationId });
    return NextResponse.json({ error: 'Status update failed' }, { status: 500 });
  }

  // Log to audit trail (non-fatal)
  try {
    await supabase.from('notification_activity').insert({
      notification_id: notificationId,
      actor_id:        userId,
      action:          'STATUS_CHANGED',
      from_status:     fromStatus,
      to_status:       newStatus,
      metadata:        {},
    });
  } catch (actErr) {
    console.warn('[PATCH /status] Activity log failed (non-fatal):', actErr);
  }

  return NextResponse.json({ ok: true, workflow_status: newStatus });
}
