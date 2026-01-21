import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getUserBySupabaseId } from '@/lib/db';
import type { AccessContext, RouteProtection, SubscriptionTier } from '@/types/auth';

/**
 * Get current access context from request
 * Used to check authentication and subscription status
 */
export async function getAccessContext(req: NextRequest): Promise<AccessContext> {
  try {
    const supabase = createServerSupabaseClient();

    // Get session from Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return {
        isLoggedIn: false,
        tier: 'free',
        canAccessFeature: () => false,
      };
    }

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.admin.getUserById(token.split('.')[0]);

    if (error || !user) {
      return {
        isLoggedIn: false,
        tier: 'free',
        canAccessFeature: () => false,
      };
    }

    // Get user with subscription info
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
 * Import feature access check from auth types
 */
import { canAccessFeature } from '@/types/auth';

/**
 * Middleware to protect routes
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

  // Premium routes require premium subscription
  if (protection === 'premium' && context.tier !== 'premium') {
    return NextResponse.json(
      { error: 'Premium subscription required' },
      { status: 403 }
    );
  }

  // Admin routes require admin status (not yet implemented)
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
