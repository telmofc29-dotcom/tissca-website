// src/app/api/admin/notifications/[id]/notes/route.ts
//
// Phase 5B — Private staff troubleshooting notes.
//
// GET  /api/admin/notifications/:id/notes
//   Returns notes for a notification. Access is restricted to:
//     - the assigned staff member (admin_notifications.assigned_to === caller)
//     - any superadmin
//   Other staff receive 403 with NO note content.
//
// POST /api/admin/notifications/:id/notes
//   Creates a private note. Same access rule as GET.
//   Body: { note: string, note_type?: string }
//   On success: inserts notification_notes, then appends a NOTE_ADDED row to
//   notification_activity (metadata carries note_type ONLY — never the note body).
//
// Auth: Bearer token — caller must be active platform staff.
// Security: assignment/role is re-validated server-side via the service-role client.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '../../_auth';

// Allowed note_type values — mirrors the DB CHECK constraint.
const VALID_NOTE_TYPES = [
  'internal',
  'resolution',
  'escalation_reason',
  'user_context',
  'engineering_note',
  'accounting_note',
] as const;

const MAX_NOTE_LENGTH = 5000;

type StaffSupabase = Extract<Awaited<ReturnType<typeof requireStaff>>, { supabase: unknown }>['supabase'];

// Resolve whether the caller may access private notes for this notification.
// Returns the notification row (for event linkage) when access is granted.
async function authorizeNotesAccess(
  supabase: StaffSupabase,
  notificationId: string,
  userId: string,
  staffRole: string,
): Promise<{ ok: true; assignedTo: string | null } | { ok: false; status: 403 | 404 | 500 }> {
  const { data: notifRow, error } = await supabase
    .from('admin_notifications')
    .select('id, assigned_to')
    .eq('id', notificationId)
    .maybeSingle();

  if (error) {
    console.error('[notes] Access check failed:', error.message, { notificationId });
    return { ok: false, status: 500 };
  }
  if (!notifRow) {
    return { ok: false, status: 404 };
  }

  const isAssigned   = notifRow.assigned_to === userId;
  const isSuperadmin = staffRole === 'superadmin';
  if (!isAssigned && !isSuperadmin) {
    return { ok: false, status: 403 };
  }

  return { ok: true, assignedTo: notifRow.assigned_to ?? null };
}

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

  const access = await authorizeNotesAccess(supabase, notificationId, userId, staffRole);
  if (!access.ok) {
    const message =
      access.status === 403 ? 'Forbidden' :
      access.status === 404 ? 'Not found' : 'Failed to verify access';
    return NextResponse.json({ error: message }, { status: access.status });
  }

  const { data: rows, error: notesError } = await supabase
    .from('notification_notes')
    .select('id, note, note_type, staff_user_id, created_at, updated_at')
    .eq('notification_id', notificationId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (notesError) {
    console.error('[GET /notes] Query failed:', notesError.message, { notificationId });
    return NextResponse.json({ error: 'Failed to load notes' }, { status: 500 });
  }

  // Batch-resolve author display names from user_profiles
  const authorIds = [
    ...new Set((rows ?? []).map(r => r.staff_user_id).filter(Boolean)),
  ] as string[];

  const nameMap: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', authorIds);
    (profiles ?? []).forEach((p: { id?: string; full_name?: string | null }) => {
      if (p.id && p.full_name) nameMap[p.id] = p.full_name;
    });
  }

  const notes = (rows ?? []).map(r => ({
    id:            r.id,
    note:          r.note,
    note_type:     r.note_type,
    staff_user_id: r.staff_user_id,
    author_name:   r.staff_user_id ? (nameMap[r.staff_user_id] ?? null) : null,
    created_at:    r.created_at,
    updated_at:    r.updated_at,
  }));

  return NextResponse.json({ notes });
}

export async function POST(
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

  const access = await authorizeNotesAccess(supabase, notificationId, userId, staffRole);
  if (!access.ok) {
    const message =
      access.status === 403 ? 'Forbidden' :
      access.status === 404 ? 'Not found' : 'Failed to verify access';
    return NextResponse.json({ error: message }, { status: access.status });
  }

  // Parse + validate body
  let body: { note?: unknown; note_type?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawNote = typeof body.note === 'string' ? body.note.trim() : '';
  if (!rawNote) {
    return NextResponse.json({ error: 'Note is required' }, { status: 400 });
  }
  if (rawNote.length > MAX_NOTE_LENGTH) {
    return NextResponse.json(
      { error: `Note exceeds maximum length of ${MAX_NOTE_LENGTH} characters` },
      { status: 400 },
    );
  }

  const noteType = typeof body.note_type === 'string' ? body.note_type : 'internal';
  if (!VALID_NOTE_TYPES.includes(noteType as typeof VALID_NOTE_TYPES[number])) {
    return NextResponse.json({ error: 'Invalid note_type' }, { status: 400 });
  }

  // Insert the note
  const { data: inserted, error: insertError } = await supabase
    .from('notification_notes')
    .insert({
      notification_id: notificationId,
      staff_user_id:   userId,
      note:            rawNote,
      note_type:       noteType,
    })
    .select('id, note, note_type, staff_user_id, created_at, updated_at')
    .single();

  if (insertError || !inserted) {
    console.error('[POST /notes] Insert failed:', insertError?.message, { notificationId });
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
  }

  // Append to audit trail — metadata carries note_type ONLY, never the note body (non-fatal)
  try {
    await supabase.from('notification_activity').insert({
      notification_id: notificationId,
      actor_id:        userId,
      action:          'NOTE_ADDED',
      metadata:        { note_type: noteType },
    });
  } catch (actErr) {
    console.warn('[POST /notes] Activity log failed (non-fatal):', actErr);
  }

  return NextResponse.json({ ok: true, note: inserted }, { status: 201 });
}
