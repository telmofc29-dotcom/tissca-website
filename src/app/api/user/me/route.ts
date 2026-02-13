export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getUserBySupabaseId } from '@/lib/db';

/**
 * GET /api/user/me
 * Get current logged-in user info
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get the session from the authorization header
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', user: null },
        { status: 401 }
      );
    }

    // Verify the token by getting the user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', user: null },
        { status: 401 }
      );
    }

    const dbUser = await getUserBySupabaseId(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
      },
      profile: dbUser?.profile ? {
        fullName: dbUser.profile.displayName,
        email: dbUser.email,
        country: dbUser.profile.country,
        currency: dbUser.profile.currency,
      } : null,
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user', user: null },
      { status: 500 }
    );
  }
}
