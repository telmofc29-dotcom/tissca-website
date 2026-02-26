// src/app/api/user/me/route.ts v1.4

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/user/me
 * Get current logged-in user info
 */
export async function GET(req: NextRequest) {
  try {
    // Get the session from the authorization header
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized', user: null }, { status: 401 });
    }

    // 1) Use your existing server helper strictly for token verification (proof step)
    const supabase = createServerSupabaseClient();

    // Verify the token by getting the user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized', user: null }, { status: 401 });
    }

    // 2) IMPORTANT: Use an authed PostgREST client for all DB reads so RLS sees auth.uid()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        '[GET /api/user/me] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
      return NextResponse.json({ error: 'Server misconfigured', user: null }, { status: 500 });
    }

    const db = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // ✅ PROVEN SCHEMA FIX: remove non-existent columns (country, currency)
    const { data: userProfile } = await db
      .from('user_profiles')
      .select('id, email, full_name, current_workspace_id')
      .eq('id', user.id)
      .maybeSingle();

    const currentWorkspaceId = userProfile?.current_workspace_id || null;

    let workspaceRole: string = 'member';
    if (currentWorkspaceId) {
      const { data: workspaceMembership } = await db
        .from('workspace_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('workspace_id', currentWorkspaceId)
        .maybeSingle();

      workspaceRole = workspaceMembership?.role || 'member';
    }

    let planTier: string | null = null;
    if (currentWorkspaceId) {
      const { data: workspace } = await db
        .from('workspaces')
        .select('plan_tier')
        .eq('id', currentWorkspaceId)
        .maybeSingle();

      planTier = workspace?.plan_tier || null;
    }

    const { data: staffRecord, error: staffError } = await db
      .from('tissca_staff')
      .select('role, is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    // LOCKED: Proof-based security gate
    // If staff lookup cannot be proven, fail closed.
    if (staffError) {
      console.error('[GET /api/user/me] tissca_staff lookup failed:', staffError.message);
      return NextResponse.json({ error: 'Staff evaluation failed', user: null }, { status: 500 });
    }

    const isPlatformStaff = Boolean(staffRecord?.is_active);

    // Support Mode (Option B)
    // NOTE: Cookie name is intentionally isolated here to avoid widespread coupling.
    // The admin support-mode API routes will set/clear this cookie.
    const SUPPORT_WORKSPACE_COOKIE = 'tissca_support_workspace_id';

    const rawSupportWorkspaceId = req.cookies.get(SUPPORT_WORKSPACE_COOKIE)?.value ?? null;

    // Basic UUID v4-ish format check (fail closed; do not trust arbitrary strings)
    const looksLikeUuid =
      typeof rawSupportWorkspaceId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        rawSupportWorkspaceId
      );

    const supportWorkspaceId = isPlatformStaff && looksLikeUuid ? rawSupportWorkspaceId : null;

    const profile = userProfile
      ? {
          fullName: userProfile.full_name || null,
          email: userProfile.email || user.email || null,
          id: userProfile.id,
          full_name: userProfile.full_name || null,
          role: workspaceRole,
          current_workspace_id: currentWorkspaceId,
          plan_tier: planTier,
        }
      : null;

    const supportModeActive = Boolean(supportWorkspaceId);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
      },
      profile,
      role: workspaceRole,
      plan_tier: planTier,
      is_platform_staff: isPlatformStaff,
      staff_role: staffRecord?.role ?? null,

      // Support Mode – included for proof-based UI decisions (no client guessing)
      support_mode: {
        active: supportModeActive,
        workspace_id: supportWorkspaceId,
      },

      // ✅ Convenience aliases for UI (AuthNav badge)
      support_mode_enabled: supportModeActive,
      support_mode_workspace_id: supportWorkspaceId,
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user', user: null }, { status: 500 });
  }
}