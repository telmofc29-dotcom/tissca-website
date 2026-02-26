import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { getUserBySupabaseId } from '@/lib/db';
import { createServerSupabaseSessionClient } from './server-session';
import type { AccessContext, RouteProtection, SubscriptionTier } from '@/types/auth';

/**
 * Import feature access check from auth types
 */
import { canAccessFeature } from '@/types/auth';

/**
 * Create a server-side Supabase client using PUBLIC keys (anon).
 * This is the correct client for validating end-user access tokens.
 * (NOT the service role client)
 */
function createServerAnonSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  return createClient(url, anonKey);
}

/**
 * Get current access context from request (API usage)
 * Proof-based:
 * - Expects Authorization: Bearer <access_token> if you want API auth.
 * - If missing, user is treated as logged out.
 *
 * NOTE:
 * This does NOT read cookie sessions. Cookie session enforcement should be done
 * in App Router layouts using a cookie-based server client (@supabase/ssr).
 */
export async function getAccessContext(req: NextRequest): Promise<AccessContext> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null;

    if (!token) {
      return {
        isLoggedIn: false,
        tier: 'free',
        canAccessFeature: () => false,
      };
    }

    // Validate token properly (JWT -> user) using anon client + getUser(token)
    const supabase = createServerAnonSupabaseClient();

    const { data, error } = await supabase.auth.getUser(token);

    const user = data?.user;

    if (error || !user) {
      return {
        isLoggedIn: false,
        tier: 'free',
        canAccessFeature: () => false,
      };
    }

    // Get user with subscription info from your DB
    const dbUser = await getUserBySupabaseId(user.id);

    if (!dbUser) {
      return {
        isLoggedIn: true,
        user: user as any,
        tier: 'free',
        canAccessFeature: (feature) => canAccessFeature('free', feature),
      };
    }

    const tier = (dbUser.subscription?.tier as SubscriptionTier) || 'free';

    return {
      isLoggedIn: true,
      user: user as any,
      tier,
      canAccessFeature: (feature) => canAccessFeature(tier, feature),
    };
  } catch (error) {
    console.error('Error getting access context:', error);
    return {
      isLoggedIn: false,
      tier: 'free',
      canAccessFeature: () => false,
    };
  }
}

/**
 * Middleware/helper to protect API routes (NOT pages)
 */
export async function protectRoute(
  req: NextRequest,
  protection: RouteProtection
): Promise<NextResponse | null> {
  const context = await getAccessContext(req);

  // Public routes always allowed
  if (protection === 'public') {
    return null; // Proceed
  }

  // Authenticated routes require login
  if (protection === 'authenticated' && !context.isLoggedIn) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Premium routes require a paid subscription tier.
  if (protection === 'premium' && context.tier === 'free') {
    return NextResponse.json(
      { error: 'Premium subscription required' },
      { status: 403 }
    );
  }

  // Admin routes (still not implemented here)
  // NOTE: Role enforcement should be proof-based against a role source-of-truth table.
  if (protection === 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  return null; // Proceed
}

/**
 * Helper to create protected API response
 */
export function createProtectedResponse(
  data: any,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Helper to create error response
 */
export function createErrorResponse(
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function requireSession(redirectTo = '/login') {
  const supabase = createServerSupabaseSessionClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect(redirectTo);
  }

  return data.user;
}

export async function requireRole(
  allowedRoles: string[],
  redirectTo = '/access-denied'
) {
  const user = await requireSession();
  const supabase = createServerSupabaseSessionClient();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('current_workspace_id')
    .eq('id', user.id)
    .maybeSingle();

  const workspaceId = profile?.current_workspace_id;

  if (!workspaceId) {
    redirect('/access-denied');
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!membership) {
    redirect('/access-denied');
  }

  const role = membership?.role || 'member';

  if (!allowedRoles.includes(role)) {
    redirect(redirectTo);
  }

  return { user, role };
}

export async function getPlatformStaffStatus(userId: string): Promise<{
  is_platform_staff: boolean;
  staff_role: string | null;
}> {
  const supabase = createServerSupabaseSessionClient();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    return {
      is_platform_staff: false,
      staff_role: null,
    };
  }

  const { data: staffRecord, error: staffError } = await supabase
    .from('tissca_staff')
    .select('user_id, role, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (staffError) {
    console.warn('tissca_staff lookup failed:', staffError.message);
    return {
      is_platform_staff: false,
      staff_role: null,
    };
  }

  return {
    is_platform_staff: Boolean(staffRecord?.is_active),
    staff_role: staffRecord?.role ?? null,
  };
}

export async function requirePlatformStaff(redirectTo = '/access-denied') {
  const user = await requireSession();
  const staffStatus = await getPlatformStaffStatus(user.id);

  if (!staffStatus.is_platform_staff) {
    redirect(redirectTo);
  }

  return user;
}

export async function requirePlatformStaffRole(
  allowedRoles: string[],
  redirectTo = '/access-denied'
) {
  const user = await requireSession();
  const staffStatus = await getPlatformStaffStatus(user.id);

  if (!staffStatus.is_platform_staff) {
    redirect(redirectTo);
  }

  const role = (staffStatus.staff_role || '').toLowerCase();
  const normalizedAllowed = allowedRoles.map((value) => value.toLowerCase());

  if (!normalizedAllowed.includes(role)) {
    redirect(redirectTo);
  }

  return { user, staff_role: staffStatus.staff_role };
}