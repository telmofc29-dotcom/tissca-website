// src/app/api/feedback/[id]/route.ts
//
// PURPOSE:
// - Admin-only PATCH endpoint to update a feedback submission.
// - Allowed fields: status, internal_notes, admin_reply, triage_tags
// - Sets replied_at = now() when admin_reply is provided.
// - Sets updated_at = now() on every update.
//
// SECURITY:
// - Requires Authorization: Bearer <access_token>
// - Token validated via Supabase auth.getUser(token)
// - Caller must be active platform staff (tissca_staff.is_active = true)

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { FeedbackStatus, FeedbackSeverity, FeedbackReproducibility } from '@/utils/feedback';

export const dynamic = 'force-dynamic';

function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth) return null;
  const [type, token] = auth.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token.trim();
}

async function requirePlatformStaff(req: NextRequest) {
  const token = extractBearerToken(req);
  if (!token) return { error: 'Unauthorized', status: 401 as const };

  const supabase = createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: 'Unauthorized', status: 401 as const };

  const { data: staffRecord, error: staffError } = await supabase
    .from('tissca_staff')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffError) return { error: 'Staff evaluation failed', status: 500 as const };
  if (!staffRecord?.is_active) return { error: 'Forbidden', status: 403 as const };

  return { supabase };
}

interface PatchBody {
  status?: FeedbackStatus;
  internal_notes?: string;
  admin_reply?: string;
  triage_tags?: string[];
  // Phase 4
  severity?: FeedbackSeverity;
  reproducibility?: FeedbackReproducibility;
  fixed_in_version?: string;
  duplicate_of_id?: string;
}

const VALID_STATUSES: FeedbackStatus[] = [
  'new', 'investigating', 'planned', 'in_progress',
  'fixed', 'released', 'closed', 'duplicate',
  // legacy
  'in-progress', 'done',
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePlatformStaff(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[GET /api/feedback/[id]] DB read failed:', error.message);
      return NextResponse.json({ error: 'Read failed' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ feedback: data });
  } catch (error) {
    console.error('[GET /api/feedback/[id]] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePlatformStaff(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const body: PatchBody = await request.json();
    const now = new Date().toISOString();

    // Build update payload — only include fields that were provided
    const update: Record<string, unknown> = { updated_at: now };

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      update.status = body.status;
      update.status_changed_at = now;
    }

    if (body.internal_notes !== undefined) {
      update.internal_notes = body.internal_notes;
    }

    if (body.admin_reply !== undefined) {
      update.admin_reply = body.admin_reply;
      update.replied_at = now;
    }

    if (body.triage_tags !== undefined) {
      if (!Array.isArray(body.triage_tags)) {
        return NextResponse.json({ error: 'triage_tags must be an array' }, { status: 400 });
      }
      update.triage_tags = body.triage_tags;
    }

    // Phase 4 triage fields
    if (body.severity !== undefined) {
      const validSeverities: FeedbackSeverity[] = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(body.severity)) {
        return NextResponse.json({ error: 'Invalid severity' }, { status: 400 });
      }
      update.severity = body.severity;
    }

    if (body.reproducibility !== undefined) {
      const validRepro: FeedbackReproducibility[] = ['always', 'sometimes', 'rare', 'unable_to_reproduce'];
      if (body.reproducibility !== null && !validRepro.includes(body.reproducibility)) {
        return NextResponse.json({ error: 'Invalid reproducibility' }, { status: 400 });
      }
      update.reproducibility = body.reproducibility ?? null;
    }

    if (body.fixed_in_version !== undefined) {
      update.fixed_in_version = body.fixed_in_version || null;
    }

    if (body.duplicate_of_id !== undefined) {
      update.duplicate_of_id = body.duplicate_of_id || null;
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('feedback')
      .update(update)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[PATCH /api/feedback/[id]] DB update failed:', error.message);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, feedback: data });
  } catch (error) {
    console.error('[PATCH /api/feedback/[id]] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
