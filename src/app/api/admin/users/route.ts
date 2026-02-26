// src/app/api/admin/users/route.ts v1.5
//
// CHANGES (v1.5):
// - Enrich GET results: include auth metadata (confirmed, last sign-in), staff flags, and workspace plan tier.
// - Keep proof-based admin authorization (tissca_staff OR ADMIN_EMAILS).
// - Keep existing PATCH/DELETE behavior for staff records unchanged (used by current UI).
// - Minimal targeted changes only.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type ApiUserRow = {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;

  // Auth metadata (from auth.users via admin listUsers)
  lastSignInAt?: string | null;
  emailConfirmedAt?: string | null;

  // Workspace enrichment (from user_profiles + workspaces)
  currentWorkspaceId?: string | null;
  planTier?: string | null;

  // Profile enrichment (from public.user_profiles)
  profile?: Record<string, any> | null;

  // Staff enrichment (from public.tissca_staff)
  isPlatformStaff?: boolean;
  staffRole?: string | null;
  staffActive?: boolean;

  // Optional future subscription mapping (not proven here)
  subscription?: {
    tier: string;
    status: string;
  } | null;
};

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeAdmin(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const limit = Math.max(
      1,
      Math.min(200, parseInt(req.nextUrl.searchParams.get('limit') || '100', 10))
    );
    const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get('offset') || '0', 10));

    // Supabase listUsers is page-based (1-indexed)
    const page = Math.floor(offset / limit) + 1;

    const { data, error } = await auth.supabase.auth.admin.listUsers({
      page,
      perPage: limit,
    });

    if (error) {
      console.error('[GET /api/admin/users] listUsers failed:', error.message);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const users = data?.users || [];
    const ids = users.map((u) => u.id);

    // Profiles (public.user_profiles)
    let profilesById = new Map<string, any>();
    let workspaceIds: string[] = [];

    if (ids.length > 0) {
      const { data: profiles, error: profilesError } = await auth.supabase
        .from('user_profiles')
        .select('*')
        .in('id', ids);

      if (profilesError) {
        console.error('[GET /api/admin/users] user_profiles lookup failed:', profilesError.message);
      } else if (Array.isArray(profiles)) {
        profilesById = new Map(profiles.map((p: any) => [p.id, p]));
        workspaceIds = profiles
          .map((p: any) => p?.current_workspace_id)
          .filter(Boolean) as string[];
      }
    }

    // Staff (public.tissca_staff)
    let staffByUserId = new Map<string, any>();
    if (ids.length > 0) {
      const { data: staffRows, error: staffError } = await auth.supabase
        .from('tissca_staff')
        .select('user_id, role, is_active')
        .in('user_id', ids);

      if (staffError) {
        console.error('[GET /api/admin/users] tissca_staff lookup failed:', staffError.message);
      } else if (Array.isArray(staffRows)) {
        staffByUserId = new Map(staffRows.map((s: any) => [s.user_id, s]));
      }
    }

    // Workspaces plan tier (public.workspaces)
    let planByWorkspaceId = new Map<string, any>();
    const uniqueWorkspaceIds = Array.from(new Set(workspaceIds));
    if (uniqueWorkspaceIds.length > 0) {
      const { data: wsRows, error: wsError } = await auth.supabase
        .from('workspaces')
        .select('id, plan_tier')
        .in('id', uniqueWorkspaceIds);

      if (wsError) {
        console.error('[GET /api/admin/users] workspaces lookup failed:', wsError.message);
      } else if (Array.isArray(wsRows)) {
        planByWorkspaceId = new Map(wsRows.map((w: any) => [w.id, w]));
      }
    }

    const rows: ApiUserRow[] = users.map((u) => {
      const p = profilesById.get(u.id) || null;

      const currentWorkspaceId = p?.current_workspace_id ?? null;
      const planTier = currentWorkspaceId ? planByWorkspaceId.get(currentWorkspaceId)?.plan_tier ?? null : null;

      const staff = staffByUserId.get(u.id) || null;

      return {
        id: u.id,
        email: u.email || '',
        name: p?.full_name ?? (u.user_metadata as any)?.name ?? null,
        createdAt: u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString(),

        lastSignInAt: (u as any)?.last_sign_in_at ?? null,
        emailConfirmedAt: (u as any)?.email_confirmed_at ?? null,

        currentWorkspaceId,
        planTier,

        profile: p,

        isPlatformStaff: Boolean(staff?.is_active),
        staffActive: Boolean(staff?.is_active),
        staffRole: staff?.role ?? null,

        subscription: null,
      };
    });

    return NextResponse.json({ success: true, users: rows });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
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

async function getTargetEmailSafe(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string
) {
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  if (!profileError && profile?.email) {
    return String(profile.email).toLowerCase();
  }

  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (!error && data?.user?.email) {
    return String(data.user.email).toLowerCase();
  }

  return '';
}

// Existing staff controls (used by current UI)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authorizeAdmin(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const targetEmail = await getTargetEmailSafe(auth.supabase, userId);
    if (targetEmail === 'support@tissca.com') {
      return NextResponse.json(
        { error: 'Protected account: support@tissca.com cannot be deactivated or removed.' },
        { status: 403 }
      );
    }

    const { error: updateError } = await auth.supabase
      .from('tissca_staff')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deactivating platform staff user:', error);
    return NextResponse.json({ error: 'Failed to deactivate platform staff user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeAdmin(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const targetEmail = await getTargetEmailSafe(auth.supabase, userId);
    if (targetEmail === 'support@tissca.com') {
      return NextResponse.json(
        { error: 'Protected account: support@tissca.com cannot be deactivated or removed.' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await auth.supabase
      .from('tissca_staff')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing platform staff user:', error);
    return NextResponse.json({ error: 'Failed to remove platform staff user' }, { status: 500 });
  }
}