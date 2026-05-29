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
  let query = supabase
    .from('admin_notifications')
    .select(`
      id,
      is_read,
      is_dismissed,
      read_at,
      dismissed_at,
      assigned_to,
      handled_by,
      handled_at,
      escalated,
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
  type NotifRow = { platform_events?: { module?: string; severity?: string } | null };
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

  return NextResponse.json({ notifications });
}
