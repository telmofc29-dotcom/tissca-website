// src/app/api/admin/users/[id]/route.ts v1.0
//
// PURPOSE:
// - Enterprise admin control endpoint for a single user (by Supabase Auth UUID)
// - Enables safe, field-level updates for:
//   - public.user_profiles (full_name, current_workspace_id, email optional)
//   - public.tissca_staff (role, is_active)
// - Proof-based admin authorization identical to /api/admin/users (tissca_staff OR ADMIN_EMAILS)
// - Protected account guard: support@tissca.com cannot be modified/deleted
//
// NOTES:
// - This file is NEW (no previous version existed).
// - Full destructive deletion (auth.admin.deleteUser + cascades) is NOT implemented here.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type PatchBody = {
  // user_profiles
  fullName?: string | null;
  currentWorkspaceId?: string | null;
  profileEmail?: string | null;

  // tissca_staff
  staffRole?: string | null;
  staffActive?: boolean | null;
};

type ServerSupabase = ReturnType<typeof createServerSupabaseClient>;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Simple UUID v4-ish check (good enough to prevent junk input without over-assuming)
function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(v);
}

function normalizeEmail(email: unknown): string | null {
  if (email === null || email === undefined) return null;
  if (typeof email !== 'string') return null;

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return null;

  // light validation only
  if (!trimmed.includes('@')) return null;

  return trimmed;
}

async function authorizeAdmin(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { error: 'Unauthorized', status: 401 as const };

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return { error: 'Unauthorized', status: 401 as const };

  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) return { error: 'Unauthorized', status: 401 as const };

  const { data: staffRecord, error: staffError } = await supabase
    .from('tissca_staff')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffError) {
    console.error('[authorizeAdmin] tissca_staff lookup failed:', staffError.message);
    return { error: 'Staff evaluation failed', status: 500 as const };
  }

  const isPlatformStaff = Boolean(staffRecord?.is_active);

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isAdminEmail = adminEmails.includes((user.email || '').toLowerCase());

  if (!isPlatformStaff && !isAdminEmail) {
    return { error: 'Forbidden', status: 403 as const };
  }

  return { supabase, user };
}

async function getTargetEmailSafe(supabase: ServerSupabase, userId: string) {
  // Try profile first
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  if (!profileError && profile?.email) {
    return String(profile.email).toLowerCase();
  }

  // Fallback to auth
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (!error && data?.user?.email) {
    return String(data.user.email).toLowerCase();
  }

  return '';
}

/**
 * PATCH /api/admin/users/[id]
 * Field-level safe updates for profile + staff.
 */
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const auth = await authorizeAdmin(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const userId = ctx?.params?.id;
    if (!isUuid(userId)) return jsonError('Invalid user id', 400);

    // Protected account guard
    const targetEmail = await getTargetEmailSafe(auth.supabase, userId);
    if (targetEmail === 'support@tissca.com') {
      return NextResponse.json(
        { error: 'Protected account: support@tissca.com cannot be modified.' },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as PatchBody;

    const profileUpdates: Record<string, any> = {};
    const staffUpdates: Record<string, any> = {};

    // user_profiles.full_name
    if ('fullName' in body) {
      const v = body.fullName;
      if (v === null) profileUpdates.full_name = null;
      else if (typeof v === 'string') profileUpdates.full_name = v.trim() || null;
      else return jsonError('Invalid fullName', 400);
    }

    // user_profiles.current_workspace_id
    if ('currentWorkspaceId' in body) {
      const v = body.currentWorkspaceId;
      if (v === null) profileUpdates.current_workspace_id = null;
      else if (typeof v === 'string') profileUpdates.current_workspace_id = v.trim() || null;
      else return jsonError('Invalid currentWorkspaceId', 400);
    }

    // user_profiles.email (optional)
    if ('profileEmail' in body) {
      const normalized = normalizeEmail(body.profileEmail);
      if (body.profileEmail !== null && body.profileEmail !== undefined && normalized === null) {
        return jsonError('Invalid profileEmail', 400);
      }
      profileUpdates.email = normalized;
    }

    // tissca_staff.role
    if ('staffRole' in body) {
      const v = body.staffRole;
      if (v === null) staffUpdates.role = null;
      else if (typeof v === 'string') staffUpdates.role = v.trim() || null;
      else return jsonError('Invalid staffRole', 400);
    }

    // tissca_staff.is_active
    if ('staffActive' in body) {
      const v = body.staffActive;
      if (v === null) {
        // explicit null = ignore (do nothing)
      } else if (typeof v === 'boolean') {
        staffUpdates.is_active = v;
      } else {
        return jsonError('Invalid staffActive', 400);
      }
    }

    const hasProfileUpdates = Object.keys(profileUpdates).length > 0;
    const hasStaffUpdates = Object.keys(staffUpdates).length > 0;

    if (!hasProfileUpdates && !hasStaffUpdates) {
      return jsonError('No valid fields provided', 400);
    }

    let updatedProfile: any = null;
    let updatedStaff: any = null;

    if (hasProfileUpdates) {
      const { data, error } = await auth.supabase
        .from('user_profiles')
        .update(profileUpdates)
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('[PATCH /api/admin/users/[id]] user_profiles update failed:', error.message);
        return jsonError('Failed to update profile', 500);
      }

      if (!data) return jsonError('User profile not found', 404);

      updatedProfile = data;
    }

    if (hasStaffUpdates) {
      // Upsert staff record safely
      const { data: staffRow, error: staffLookupError } = await auth.supabase
        .from('tissca_staff')
        .select('user_id, role, is_active')
        .eq('user_id', userId)
        .maybeSingle();

      if (staffLookupError) {
        console.error('[PATCH /api/admin/users/[id]] tissca_staff lookup failed:', staffLookupError.message);
        return jsonError('Failed to evaluate staff record', 500);
      }

      if (staffRow) {
        const { data, error: staffUpdateError } = await auth.supabase
          .from('tissca_staff')
          .update(staffUpdates)
          .eq('user_id', userId)
          .select('user_id, role, is_active')
          .maybeSingle();

        if (staffUpdateError) {
          console.error('[PATCH /api/admin/users/[id]] tissca_staff update failed:', staffUpdateError.message);
          return jsonError('Failed to update staff record', 500);
        }

        updatedStaff = data ?? null;
      } else {
        const insertPayload = { user_id: userId, ...staffUpdates };

        const { data, error: staffInsertError } = await auth.supabase
          .from('tissca_staff')
          .insert(insertPayload)
          .select('user_id, role, is_active')
          .maybeSingle();

        if (staffInsertError) {
          console.error('[PATCH /api/admin/users/[id]] tissca_staff insert failed:', staffInsertError.message);
          return jsonError('Failed to create staff record', 500);
        }

        updatedStaff = data ?? null;
      }
    }

    return NextResponse.json({
      success: true,
      userId,
      updated: {
        profile: updatedProfile,
        staff: updatedStaff,
      },
    });
  } catch (error: any) {
    console.error('[PATCH /api/admin/users/[id]] Error:', error);
    return jsonError('Failed to update user', 500);
  }
}

/**
 * DELETE /api/admin/users/[id]
 * NOT IMPLEMENTED: destructive deletion requires explicit decision + cascade cleanup plan.
 */
export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const auth = await authorizeAdmin(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const userId = ctx?.params?.id;
    if (!isUuid(userId)) return jsonError('Invalid user id', 400);

    const targetEmail = await getTargetEmailSafe(auth.supabase, userId);
    if (targetEmail === 'support@tissca.com') {
      return NextResponse.json(
        { error: 'Protected account: support@tissca.com cannot be deleted.' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: 'Not implemented',
        message:
          'Full account deletion is not enabled. This requires an explicit decision and a cascade cleanup plan.',
      },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('[DELETE /api/admin/users/[id]] Error:', error);
    return jsonError('Failed to process deletion', 500);
  }
}