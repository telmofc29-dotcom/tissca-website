export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getUserBySupabaseId, updateUserProfile } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/user/profile
 * Get current user's profile
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.admin.getUserById(
      authHeader.replace('Bearer ', '').split('.')[0]
    );

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const dbUser = await getUserBySupabaseId(user.id);

    return NextResponse.json({
      success: true,
      user: dbUser,
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/profile
 * Update user profile
 */
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(
      authHeader.replace('Bearer ', '').split('.')[0]
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUser = await getUserBySupabaseId(user.id);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const {
      displayName,
      country,
      currency,
      units,
      tradeType,
      businessName,
      businessAddress,
      businessPhone,
      businessEmail,
      businessLogo,
      dailyRate,
      monthlyRate,
      labourTierDefault,
    } = await req.json();

    const updated = await updateUserProfile(dbUser.id, {
      displayName,
      country,
      currency,
      units,
      tradeType,
      businessName,
      businessAddress,
      businessPhone,
      businessEmail,
      businessLogo,
      dailyRate: dailyRate ? parseFloat(dailyRate) : undefined,
      monthlyRate: monthlyRate ? parseFloat(monthlyRate) : undefined,
      labourTierDefault,
    });

    return NextResponse.json({
      success: true,
      profile: updated,
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
