// src/app/api/admin/notifications/[id]/resolve/route.ts
//
// PATCH /api/admin/notifications/:id/resolve
//
// Marks a notification as operationally resolved.
// Sets: workflow_status='RESOLVED', handled_by=caller, handled_at=now()
// Applied globally to all fan-out rows for the same event.
//
// Appends a RESOLVED row to notification_activity (non-fatal).
//
// Body: { note?: string } — optional resolution note (stored in activity reason)
//
// Returns: 200 { ok: true }
//          403 { error: 'Not assigned to you' }
//
// Auth: Bearer token — caller must be active platform staff.
// Security: Only the assigned staff member or a superadmin may resolve.

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

  const { supabase, userId, staffRole } = auth;
  const notificationId = params.id;

  if (!notificationId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  // Body is optional (resolution note)
  let body: { note?: string } = {};
  try { body = await req.json(); } catch { /* body is optional */ }

  // Fetch current notification state
  const { data: notifRow, error: fetchError } = await supabase
    .from('admin_notifications')
    .select('id, event_id, assigned_to, workflow_status')
    .eq('id', notificationId)
    .maybeSingle();

  if (fetchError) {
    console.error('[PATCH /resolve] Fetch failed:', fetchError.message, { notificationId });
    return NextResponse.json({ error: 'Failed to load notification' }, { status: 500 });
  }
  if (!notifRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Authorization: only assigned staff or superadmin may resolve
  const isAssigned   = notifRow.assigned_to === userId;
  const isSuperadmin = staffRole === 'superadmin';
  if (!isAssigned && !isSuperadmin) {
    return NextResponse.json({ error: 'Not assigned to you' }, { status: 403 });
  }

  const now = new Date().toISOString();

  // Apply globally across all fan-out rows for this event
  const { error: updateError } = await supabase
    .from('admin_notifications')
    .update({
      workflow_status: 'RESOLVED',
      handled_by:      userId,
      handled_at:      now,
    })
    .eq('event_id', notifRow.event_id);

  if (updateError) {
    console.error('[PATCH /resolve] Update failed:', updateError.message, { notificationId });
    return NextResponse.json({ error: 'Resolve failed' }, { status: 500 });
  }

  // Log to audit trail (non-fatal)
  try {
    await supabase.from('notification_activity').insert({
      notification_id: notificationId,
      actor_id:        userId,
      action:          'RESOLVED',
      from_status:     String(notifRow.workflow_status ?? 'INVESTIGATING'),
      to_status:       'RESOLVED',
      reason:          body.note?.trim() || null,
      metadata:        {},
    });
  } catch (actErr) {
    console.warn('[PATCH /resolve] Activity log failed (non-fatal):', actErr);
  }

  return NextResponse.json({ ok: true });
}
