import { NextRequest, NextResponse } from 'next/server';
import { getAdminUserCount, getAdminPremiumCount, getAdminDocumentsOverview } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getUserBySupabaseId } from '@/lib/db';

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/dashboard
 * Get admin dashboard overview data
 * Protected by admin role (check via access-control middleware in future)
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

    const token = authHeader.replace('Bearer ', '');
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(
      token.split('.')[0]
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

    // TODO: Add admin role check here
    // For now, restrict to specific email or implement proper role system
    if (!process.env.ADMIN_EMAILS?.split(',').includes(dbUser.email)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const [totalUsers, premiumCount, documentsOverview] = await Promise.all([
      getAdminUserCount(),
      getAdminPremiumCount(),
      getAdminDocumentsOverview(),
    ]);

    return NextResponse.json({
      success: true,
      overview: {
        totalUsers,
        premiumCount,
        ...documentsOverview,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}
