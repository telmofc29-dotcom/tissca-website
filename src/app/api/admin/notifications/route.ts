// src/app/api/admin/notifications/route.ts
//
// GET /api/admin/notifications
//
// Returns the calling staff member's admin_notifications joined with platform_events.
// Supports query parameters:
//   unread=true         — only unread items
//   dismissed=true      — include dismissed items (default: excluded)
//   module=feedback     — filter by module
//   severity=critical   — filter by severity
//   limit=50            — page size (max 100, default 50)
//
// Auth: Bearer token — caller must be active platform staff.
// Security: staff_user_id is ALWAYS derived from the validated token, never from request body.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from './_auth';

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, userId } = auth;
  const { searchParams } = new URL(req.url);

  const unreadOnly  = searchParams.get('unread') === 'true';
  const showDismissed = searchParams.get('dismissed') === 'true';
  const moduleFilter = searchParams.get('module');
  const severityFilter = searchParams.get('severity');
  const rawLimit = parseInt(searchParams.get('limit') ?? '50', 10);
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 100);

  // Join admin_notifications with platform_events via FK (event_id → platform_events.id)
  // Phase 5A additions: workflow_status, assigned_at, claimed_at returned alongside existing columns
  let query = supabase
    .from('admin_notifications')
    .select(`
      id,
      is_read,
      is_dismissed,
      read_at,
      dismissed_at,
      assigned_to,
      assigned_at,
      claimed_at,
      handled_by,
      handled_at,
      escalated,
      workflow_status,
      created_at,
      platform_events (
        id,
        module,
        event_type,
        severity,
        title,
        body,
        entity_type,
        entity_id,
        deep_link,
        metadata,
        workspace_id,
        occurred_at
      )
    `)
    .eq('staff_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly)    query = query.eq('is_read', false);
  if (!showDismissed) query = query.eq('is_dismissed', false);

  const { data, error } = await query;

  if (error) {
    console.error('[GET /api/admin/notifications] Query failed:', error.message, { userId });
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  // Apply module/severity filters in JS after join (PostgREST nested filter syntax is verbose;
  // these are low-cardinality filters on already-paginated data)
  type NotifRow = {
    assigned_to?: string | null;
    platform_events?: { module?: string; severity?: string } | null;
  };
  let notifications: NotifRow[] = (data ?? []) as NotifRow[];

  if (moduleFilter) {
    notifications = notifications.filter(
      (n) => n.platform_events?.module === moduleFilter,
    );
  }
  if (severityFilter) {
    notifications = notifications.filter(
      (n) => n.platform_events?.severity === severityFilter,
    );
  }

  // Phase 5A: Batch-resolve assigned_to display names from user_profiles
  const assignedToIds = [
    ...new Set(notifications.map(n => n.assigned_to).filter(Boolean)),
  ] as string[];

  const nameMap: Record<string, string> = {};
  if (assignedToIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', assignedToIds);
    (profiles ?? []).forEach((p: { id?: string; full_name?: string | null }) => {
      if (p.id && p.full_name) nameMap[p.id] = p.full_name;
    });
  }

  // Attach assigned_to_name to each row
  const enriched = notifications.map(n => ({
    ...n,
    assigned_to_name: n.assigned_to ? (nameMap[n.assigned_to] ?? null) : null,
  }));

  return NextResponse.json({ notifications: enriched });
}
