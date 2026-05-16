// src/app/api/user/me/route.ts v1.5
//
// PURPOSE:
// - GET /api/user/me
// - Proof-based: validate session token, then read user + profile + workspace + role via RLS-safe PostgREST client.
// - Workspace is the billing container (plan_tier, subscription_status, stripe_customer_id, etc.).
// - Support Mode (Option B) included for staff-only UI simulation decisions.
//
// CHANGES (v1.5):
// - Return proven workspace billing fields (workspace object):
//   id, name, plan_tier, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end
// - Keep existing response fields for backwards compatibility:
//   role, plan_tier, profile.plan_tier, support_mode, support_mode_enabled, support_mode_workspace_id
// - Add convenience top-level billing aliases:
//   subscription_status, current_period_end
// - Avoid client guessing: frontend can render everything from this one response.
//
// VERSION HISTORY:
// - v1.4: Proof-based token validation + authed PostgREST client; remove non-existent columns; staff fail-closed.
// - v1.5 (2026-03-02): Include full proven workspace billing fields + top-level billing aliases.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveUserFromToken } from '@/lib/workspace-data';

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

    // Also try Prisma user_profile for business fields (businessAddress, businessPhone, etc.)
    let businessFields: {
      businessAddress: string | null;
      businessPhone: string | null;
      businessEmail: string | null;
      businessName: string | null;
    } = { businessAddress: null, businessPhone: null, businessEmail: null, businessName: null };

    try {
      // Prisma User table links via supabaseId to auth.users.id
      const { data: prismaUser } = await db
        .from('user')
        .select('id')
        .eq('supabaseId', user.id)
        .maybeSingle();

      if (prismaUser) {
        const { data: up } = await db
          .from('user_profile')
          .select('businessAddress, businessPhone, businessEmail, businessName')
          .eq('userId', prismaUser.id)
          .maybeSingle();

        if (up) {
          businessFields = {
            businessAddress: up.businessAddress ?? null,
            businessPhone: up.businessPhone ?? null,
            businessEmail: up.businessEmail ?? null,
            businessName: up.businessName ?? null,
          };
        }
      }
    } catch {
      // Non-critical — Prisma tables may not exist
    }

    let currentWorkspaceId = userProfile?.current_workspace_id || null;

    // ── AUTO-PROVISION: If user has no workspace, trigger auto-provisioning ──
    // resolveUserFromToken will create business + workspace if needed (service role)
    if (!currentWorkspaceId) {
      const resolved = await resolveUserFromToken(token);
      if (resolved?.workspaceId) {
        currentWorkspaceId = resolved.workspaceId;
        // Re-read user profile to pick up the newly linked workspace
        const { data: refreshedProfile } = await db
          .from('user_profiles')
          .select('id, email, full_name, current_workspace_id')
          .eq('id', user.id)
          .maybeSingle();
        if (refreshedProfile) {
          // Update local reference to reflect auto-provisioned data
          Object.assign(userProfile ?? {}, refreshedProfile);
        }
      }
    }

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

    // ✅ PROVEN: workspaces contains billing container fields
    // Keep null-safe if workspace is missing
    let workspace:
      | {
          id: string;
          name: string | null;
          plan_tier: string | null;
          subscription_status: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_end: string | null;
        }
      | null = null;

    let planTier: string | null = null;
    let subscriptionStatus: string | null = null;
    let currentPeriodEnd: string | null = null;

    if (currentWorkspaceId) {
      const { data: ws } = await db
        .from('workspaces')
        .select(
          'id, name, plan_tier, subscription_status, stripe_customer_id, stripe_subscription_id, current_period_end'
        )
        .eq('id', currentWorkspaceId)
        .maybeSingle();

      if (ws) {
        workspace = {
          id: ws.id,
          name: ws.name ?? null,
          plan_tier: ws.plan_tier ?? null,
          subscription_status: ws.subscription_status ?? null,
          stripe_customer_id: ws.stripe_customer_id ?? null,
          stripe_subscription_id: ws.stripe_subscription_id ?? null,
          current_period_end: ws.current_period_end ?? null,
        };

        planTier = ws.plan_tier ?? null;
        subscriptionStatus = ws.subscription_status ?? null;
        currentPeriodEnd = ws.current_period_end ?? null;
      }
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
          // Business fields from Prisma user_profile
          business_address: businessFields.businessAddress,
          business_phone: businessFields.businessPhone,
          business_email: businessFields.businessEmail,
          business_name: businessFields.businessName,
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
      workspace, // ✅ New: single source of truth for billing UI (proof-based)
      role: workspaceRole,
      plan_tier: planTier,

      // ✅ New convenience billing aliases (for minimal UI churn)
      subscription_status: subscriptionStatus,
      current_period_end: currentPeriodEnd,

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