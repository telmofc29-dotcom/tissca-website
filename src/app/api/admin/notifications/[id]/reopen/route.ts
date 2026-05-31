// src/app/api/admin/notifications/[id]/reopen/route.ts
//
// PATCH /api/admin/notifications/:id/reopen
//
// Reopens a resolved or dismissed notification for continued investigation.
// Any active staff member may reopen — no assignment ownership required.
// Sets: workflow_status='REOPENED', clears handled_by + handled_at.
// Applied globally to all fan-out rows for the same event.
//
// Appends a REOPENED row to notification_activity (non-fatal).
//
// Returns: 200 { ok: true }
//
// Auth: Bearer token — caller must be active platform staff.

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

  // Fetch notification to get event_id and current state
  const { data: notifRow, error: fetchError } = await supabase
    .from('admin_notifications')
    .select('id, event_id, workflow_status')
    .eq('id', notificationId)
    .maybeSingle();

  if (fetchError) {
    console.error('[PATCH /reopen] Fetch failed:', fetchError.message, { notificationId });
    return NextResponse.json({ error: 'Failed to load notification' }, { status: 500 });
  }
  if (!notifRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Any active staff may reopen — apply globally
  const { error: updateError } = await supabase
    .from('admin_notifications')
    .update({
      workflow_status: 'REOPENED',
      handled_by:      null,
      handled_at:      null,
    })
    .eq('event_id', notifRow.event_id);

  if (updateError) {
    console.error('[PATCH /reopen] Update failed:', updateError.message, { notificationId });
    return NextResponse.json({ error: 'Reopen failed' }, { status: 500 });
  }

  // Log to audit trail (non-fatal)
  try {
    await supabase.from('notification_activity').insert({
      notification_id: notificationId,
      actor_id:        userId,
      action:          'REOPENED',
      from_status:     String(notifRow.workflow_status ?? 'RESOLVED'),
      to_status:       'REOPENED',
      metadata:        {},
    });
  } catch (actErr) {
    console.warn('[PATCH /reopen] Activity log failed (non-fatal):', actErr);
  }

  return NextResponse.json({ ok: true });
}
