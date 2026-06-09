// src/app/api/admin/workbench/route.ts
//
// Phase 5B — My Workbench: the calling staff member's private operational queue.
//
// GET /api/admin/workbench
//   Returns three buckets, all scoped to the caller's OWN fan-out rows
//   (staff_user_id === caller) to avoid duplicates from the per-staff fan-out model:
//     - assigned:        assigned_to === caller, workflow_status NOT in RESOLVED/DISMISSED
//     - waiting:         assigned_to === caller, workflow_status in WAITING_* states
//     - recentlyResolved: handled_by === caller, workflow_status === RESOLVED (limit 10)
//   Also returns activeCount = assigned.length (for the sidebar badge).
//
// Auth: Bearer token — caller must be active platform staff.
// Security: all scoping is derived from the validated token, never from request input.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '../notifications/_auth';

const TERMINAL_STATUSES = ['RESOLVED', 'DISMISSED'];
const WAITING_STATUSES = ['WAITING_USER', 'WAITING_ENGINEER', 'WAITING_ACCOUNTANT'];

const SELECT = `
  id,
  is_read,
  is_dismissed,
  assigned_to,
  handled_by,
  handled_at,
  workflow_status,
  created_at,
  platform_events (
    id,
    module,
    event_type,
    severity,
    title,
    body,
    deep_link,
    occurred_at
  )
`;

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, userId } = auth;

  // Bucket 1 — Assigned to me, still active (not resolved/dismissed)
  const { data: assignedRows, error: assignedErr } = await supabase
    .from('admin_notifications')
    .select(SELECT)
    .eq('staff_user_id', userId)
    .eq('assigned_to', userId)
    .not('workflow_status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (assignedErr) {
    console.error('[GET /workbench] assigned query failed:', assignedErr.message, { userId });
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  // Bucket 3 — Recently resolved by me
  const { data: resolvedRows, error: resolvedErr } = await supabase
    .from('admin_notifications')
    .select(SELECT)
    .eq('staff_user_id', userId)
    .eq('handled_by', userId)
    .eq('workflow_status', 'RESOLVED')
    .order('handled_at', { ascending: false })
    .limit(10);

  if (resolvedErr) {
    console.error('[GET /workbench] resolved query failed:', resolvedErr.message, { userId });
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const assignedAll = assignedRows ?? [];

  // Bucket 2 — Waiting subset (derived from the assigned bucket in JS)
  type Row = { workflow_status?: string | null };
  const waiting = (assignedAll as Row[]).filter(
    r => WAITING_STATUSES.includes(r.workflow_status ?? ''),
  );

  // Bucket 1 display = assigned minus waiting (so each item appears once)
  const assigned = (assignedAll as Row[]).filter(
    r => !WAITING_STATUSES.includes(r.workflow_status ?? ''),
  );

  return NextResponse.json({
    assigned,
    waiting,
    recentlyResolved: resolvedRows ?? [],
    activeCount: assignedAll.length,
  });
}
