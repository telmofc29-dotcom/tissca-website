// src/app/api/admin/notifications/[id]/claim/route.ts
//
// PATCH /api/admin/notifications/:id/claim
//
// Claims operational ownership of a notification on behalf of the calling staff member.
//
// Claim is ATOMIC and GLOBAL: all fan-out rows for the same platform_event are updated
// together so every staff member's inbox immediately reflects the claim state.
// Uses a conditional update (assigned_to IS NULL OR assigned_to = caller) to prevent
// double-claiming. Returns 409 Conflict if another staff member has already claimed.
//
// On success sets: assigned_to=caller, claimed_at=now(), workflow_status='INVESTIGATING'
// Appends a CLAIMED row to notification_activity (non-fatal — never blocks the response).
//
// Returns: 200 { ok: true, workflow_status: 'INVESTIGATING' }
//          409 { error: 'Already claimed by another staff member' }
//
// Auth: Bearer token — caller must be active platform staff.
// Security: assigned_to is ALWAYS set from the validated token userId. Never from body.

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

  // Step 1: Fetch the notification to get event_id and current claim state.
  // Service-role client bypasses RLS — we can read any row.
  const { data: notifRow, error: fetchError } = await supabase
    .from('admin_notifications')
    .select('id, event_id, assigned_to, workflow_status')
    .eq('id', notificationId)
    .maybeSingle();

  if (fetchError) {
    console.error('[PATCH /claim] Fetch failed:', fetchError.message, { notificationId });
    return NextResponse.json({ error: 'Failed to load notification' }, { status: 500 });
  }
  if (!notifRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Step 2: Atomic global claim.
  // Updates ALL fan-out rows for this event so every staff member's inbox sees the claim.
  // The conditional WHERE prevents overwriting an existing claim by a different staff member.
  const now = new Date().toISOString();
  const { count, error: updateError } = await supabase
    .from('admin_notifications')
    .update({
      assigned_to:     userId,
      claimed_at:      now,
      workflow_status: 'INVESTIGATING',
    })
    .eq('event_id', notifRow.event_id)
    .or(`assigned_to.is.null,assigned_to.eq.${userId}`);

  if (updateError) {
    console.error('[PATCH /claim] Update failed:', updateError.message, { notificationId });
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 });
  }

  // 0 rows updated = another staff member claimed first
  if (!count || count === 0) {
    return NextResponse.json(
      { error: 'Already claimed by another staff member' },
      { status: 409 },
    );
  }

  // Step 3: Log to audit trail (non-fatal — activity failure never blocks the response)
  try {
    await supabase.from('notification_activity').insert({
      notification_id: notificationId,
      actor_id:        userId,
      action:          'CLAIMED',
      from_status:     String(notifRow.workflow_status ?? 'NEW'),
      to_status:       'INVESTIGATING',
      to_assignee:     userId,
      metadata:        {},
    });
  } catch (actErr) {
    console.warn('[PATCH /claim] Activity log failed (non-fatal):', actErr);
  }

  return NextResponse.json({ ok: true, workflow_status: 'INVESTIGATING' });
}
